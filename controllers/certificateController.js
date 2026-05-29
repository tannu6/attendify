var fs = require('fs');
var path = require('path');
var { v4: uuidv4 } = require('uuid');
var db = require('../config/db');
var qr = require('../utils/qrCode');
var pdfGenerator = require('../utils/pdfGenerator');

var certificatesDir = path.resolve(__dirname, '../uploads/certificates');
if (!fs.existsSync(certificatesDir)) {
    fs.mkdirSync(certificatesDir, { recursive: true });
}

var issueCertificate = async function(req, res) {
    var { recipient_name, recipient_email, event_id } = req.body;
    if (!recipient_name || !recipient_email || !event_id) {
        return res.status(400).json({ error: 'Recipient name, email, and event_id are required' });
    }

    var uniqueCode = uuidv4();
    var qrData = `https://example.com/certificate/verify/${uniqueCode}`;
    var qrPath = path.join(certificatesDir, `${uniqueCode}.png`);

    try {
        await qr.generateQRCode(qrData, qrPath);
    } catch (err) {
        return res.status(500).json({ error: 'QR generation failed', detail: err.message });
    }

    var pdfPath = path.join(certificatesDir, `${uniqueCode}.pdf`);
    try {
        await pdfGenerator.createCertificatePdf({
            recipientName: recipient_name,
            recipientEmail: recipient_email,
            eventId: event_id,
            uniqueCode,
            qrPath,
            outputPath: pdfPath
        });
    } catch (err) {
        return res.status(500).json({ error: 'PDF generation failed', detail: err.message });
    }

    var sql = `INSERT INTO certificates (unique_code, recipient_name, recipient_email, event_id, qr_data, pdf_path) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [uniqueCode, recipient_name, recipient_email, event_id, qrData, pdfPath], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Certificate issued', code: uniqueCode, download: `/certificate/download/${uniqueCode}` });
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

module.exports = { issueCertificate, verifyCertificate, downloadCertificate };
