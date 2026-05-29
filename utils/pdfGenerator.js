var PDFDocument = require('pdfkit');
var fs = require('fs');
var path = require('path');
var db = require('../config/db');

var createCertificatePdf = function({ recipientName, recipientEmail, eventId, uniqueCode, qrPath, outputPath }) {
    return new Promise(function(resolve, reject) {
        var sql = `SELECT events.name AS event_name, events.date AS event_date, organizations.name AS organization_name
                   FROM events
                   LEFT JOIN organizations ON events.org_id = organizations.id
                   WHERE events.id = ?`;
        db.get(sql, [eventId], function(err, row) {
            if (err) {
                return reject(err);
            }
            if (!row) {
                return reject(new Error('Event not found')); 
            }

            var doc = new PDFDocument({ size: 'A4', margin: 50 });
            var stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);

            doc.fontSize(20).text('Certificate of Participation', { align: 'center' });
            doc.moveDown(1.5);
            doc.fontSize(14).text(`This certificate is awarded to`, { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(26).text(recipientName, { align: 'center', underline: true });
            doc.moveDown(0.7);
            doc.fontSize(14).text(`For participating in`, { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(18).text(row.event_name, { align: 'center', bold: true });
            doc.moveDown(0.7);
            doc.fontSize(12).text(`Event Date: ${row.event_date}`, { align: 'center' });
            doc.moveDown(1.5);
            doc.fontSize(12).text(`Issued by ${row.organization_name}`, { align: 'center' });
            doc.moveDown(2);

            if (fs.existsSync(qrPath)) {
                doc.image(qrPath, doc.page.width / 2 - 70, doc.y, { width: 140, align: 'center' });
                doc.moveDown(6);
            }

            doc.fontSize(10).text(`Certificate ID: ${uniqueCode}`, { align: 'center' });
            doc.text(`Recipient Email: ${recipientEmail}`, { align: 'center' });
            doc.text(`Verification URL: https://example.com/certificate/verify/${uniqueCode}`, { align: 'center' });

            doc.end();
            stream.on('finish', function() {
                resolve(outputPath);
            });
            stream.on('error', reject);
        });
    });
};

module.exports = { createCertificatePdf };
