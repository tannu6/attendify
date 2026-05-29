var db = require('../config/db');

var dashboard = function(req, res) {
    var summary = {};
    db.serialize(function() {
        db.get(`SELECT COUNT(*) AS count FROM organizations`, [], function(err, row) {
            if (err) return res.status(500).json({ error: err.message });
            summary.organizations = row.count;
        });
        db.get(`SELECT COUNT(*) AS count FROM users`, [], function(err, row) {
            if (err) return res.status(500).json({ error: err.message });
            summary.users = row.count;
        });
        db.get(`SELECT COUNT(*) AS count FROM events`, [], function(err, row) {
            if (err) return res.status(500).json({ error: err.message });
            summary.events = row.count;
        });
        db.get(`SELECT COUNT(*) AS count FROM certificates`, [], function(err, row) {
            if (err) return res.status(500).json({ error: err.message });
            summary.certificates = row.count;
            res.json({ dashboard: summary });
        });
    });
};

var certificateLogs = function(req, res) {
    var sql = `SELECT certificates.unique_code, certificates.recipient_name, certificates.recipient_email, certificates.status, certificates.issued_at,
                      events.name AS event_name, organizations.name AS organization_name
               FROM certificates
               LEFT JOIN events ON certificates.event_id = events.id
               LEFT JOIN organizations ON events.org_id = organizations.id
               ORDER BY certificates.issued_at DESC
               LIMIT 100`;
    db.all(sql, [], function(err, rows) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ logs: rows });
    });
};

module.exports = { dashboard, certificateLogs };
