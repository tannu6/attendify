var fs = require('fs');
var path = require('path');
var csv = require('csv-parser');
var { v4: uuidv4 } = require('uuid');
var db = require('../config/db');
var qr = require('../utils/qrCode');
var pdfGenerator = require('../utils/pdfGenerator');
var mailer = require('../config/mailerConfig');

var certificatesDir = path.resolve(__dirname, '../uploads/certificates');
if (!fs.existsSync(certificatesDir)) {
    fs.mkdirSync(certificatesDir, { recursive: true });
}

var appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

var generateCertificateAssets = async function({ recipientName, recipientEmail, eventId, uniqueCode }) {
    var qrData = `${appBaseUrl}/certificate/verify/${uniqueCode}`;
    var qrPath = path.join(certificatesDir, `${uniqueCode}.png`);
    await qr.generateQRCode(qrData, qrPath);

    var pdfPath = path.join(certificatesDir, `${uniqueCode}.pdf`);
    await pdfGenerator.createCertificatePdf({
        recipientName,
        recipientEmail,
        eventId,
        uniqueCode,
        qrPath,
        outputPath: pdfPath
    });

    return { qrData, qrPath, pdfPath };
};

var saveCertificate = function({ uniqueCode, recipientName, recipientEmail, eventId, qrData, pdfPath }) {
    return new Promise(function(resolve, reject) {
        var sql = `INSERT INTO certificates (unique_code, recipient_name, recipient_email, event_id, qr_data, pdf_path) VALUES (?, ?, ?, ?, ?, ?)`;
        db.run(sql, [uniqueCode, recipientName, recipientEmail, eventId, qrData, pdfPath], function(err) {
            if (err) {
                return reject(err);
            }
            resolve({ id: this.lastID, uniqueCode });
        });
    });
};

var sendCertificateEmail = function({ recipientEmail, recipientName, eventName, uniqueCode }) {
    return new Promise(function(resolve, reject) {
        var verifyUrl = `${appBaseUrl}/certificate/verify/${uniqueCode}`;
        var downloadUrl = `${appBaseUrl}/certificate/download/${uniqueCode}`;
        var subject = `Your certificate for ${eventName}`;
        var html = `<p>Hi ${recipientName},</p>
                    <p>Your certificate for <strong>${eventName}</strong> is ready.</p>
                    <p><a href="${downloadUrl}">Download your certificate</a></p>
                    <p>Verify your certificate at <a href="${verifyUrl}">${verifyUrl}</a></p>`;
        mailer.sendMail(recipientEmail, subject, html, function(err) {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
};

var issueCertificate = async function(req, res) {
    var { recipient_name, recipient_email, event_id } = req.body;
    if (!recipient_name || !recipient_email || !event_id) {
        return res.status(400).json({ error: 'Recipient name, email, and event_id are required' });
    }

    var uniqueCode = uuidv4();
    try {
        var assets = await generateCertificateAssets({
            recipientName: recipient_name,
            recipientEmail: recipient_email,
            eventId: event_id,
            uniqueCode
        });
        await saveCertificate({
            uniqueCode,
            recipientName: recipient_name,
            recipientEmail: recipient_email,
            eventId: event_id,
            qrData: assets.qrData,
            pdfPath: assets.pdfPath
        });
        res.json({ message: 'Certificate issued', code: uniqueCode, download: `/certificate/download/${uniqueCode}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

var bulkIssueCertificates = async function(req, res) {
    if (!req.file) {
        return res.status(400).json({ error: 'CSV file is required' });
    }
    var eventId = req.body.event_id;
    if (!eventId) {
        return res.status(400).json({ error: 'event_id is required' });
    }

    var rows = [];
    var stream = fs.createReadStream(req.file.path).pipe(csv());
    stream.on('data', function(row) {
        rows.push(row);
    });

    stream.on('end', async function() {
        var summary = { success: [], failed: [] };
        var eventRow;
        try {
            eventRow = await new Promise(function(resolve, reject) {
                var sql = `SELECT name FROM events WHERE id = ?`;
                db.get(sql, [eventId], function(err, row) {
                    if (err) return reject(err);
                    if (!row) return reject(new Error('Event not found'));
                    resolve(row);
                });
            });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }

        await Promise.all(rows.map(async function(row, index) {
            var recipientName = row.recipient_name || row.name;
            var recipientEmail = row.recipient_email || row.email;
            if (!recipientName || !recipientEmail) {
                summary.failed.push({ row: index + 1, error: 'Missing recipient_name or recipient_email' });
                return;
            }
            var uniqueCode = uuidv4();
            try {
                var assets = await generateCertificateAssets({
                    recipientName,
                    recipientEmail,
                    eventId,
                    uniqueCode
                });
                await saveCertificate({
                    uniqueCode,
                    recipientName,
                    recipientEmail,
                    eventId,
                    qrData: assets.qrData,
                    pdfPath: assets.pdfPath
                });
                try {
                    await sendCertificateEmail({
                        recipientEmail,
                        recipientName,
                        eventName: eventRow.name,
                        uniqueCode
                    });
                } catch (mailErr) {
                    console.warn('Email failed for', recipientEmail, mailErr.message);
                }
                summary.success.push({ row: index + 1, email: recipientEmail, code: uniqueCode });
            } catch (err) {
                summary.failed.push({ row: index + 1, email: recipientEmail, error: err.message });
            }
        }));

        res.json({ message: 'Bulk issuance complete', summary });
    });

    stream.on('error', function(err) {
        res.status(500).json({ error: 'CSV parse failed', detail: err.message });
    });
};

var certificateRoot = function(req, res) {
    res.json({
        message: 'Certificate endpoints',
        routes: {
            issue: '/certificate/issue',
            bulk: '/certificate/bulk',
            verify: '/certificate/verify/:code',
            download: '/certificate/download/:code'
        }
    });
};

var verifyCertificate = function(req, res) {
    var code = req.params.code;
    var sql = `SELECT certificates.unique_code, certificates.recipient_name, certificates.recipient_email, certificates.issued_at, certificates.status,
                      events.name AS event_name, events.date AS event_date, organizations.name AS organization_name
               FROM certificates
               LEFT JOIN events ON certificates.event_id = events.id
               LEFT JOIN organizations ON events.org_id = organizations.id
               WHERE certificates.unique_code = ?`;
    db.get(sql, [code], function(err, row) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ valid: false, message: 'Invalid certificate code' });
        }
        res.json({ valid: true, certificate: row });
    });
};

var downloadCertificate = function(req, res) {
    var code = req.params.code;
    var sql = `SELECT pdf_path FROM certificates WHERE unique_code = ?`;
    db.get(sql, [code], function(err, row) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row || !row.pdf_path) {
            return res.status(404).json({ error: 'Certificate file not found' });
        }
        res.download(row.pdf_path, `${code}.pdf`);
    });
};

module.exports = { certificateRoot, issueCertificate, bulkIssueCertificates, verifyCertificate, downloadCertificate };
