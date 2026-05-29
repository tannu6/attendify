var db = require('../config/db');

var listEvents = function(req, res) {
    var sql = `SELECT events.id, events.name, events.date, events.org_id, organizations.name AS organization
               FROM events
               LEFT JOIN organizations ON events.org_id = organizations.id`;
    db.all(sql, [], function(err, rows) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ events: rows });
    });
};

var createEvent = function(req, res) {
    var { name, date, org_id } = req.body;
    if (!name || !date || !org_id) {
        return res.status(400).json({ error: 'Name, date, and org_id are required' });
    }
    var sql = `INSERT INTO events (name, date, org_id) VALUES (?, ?, ?)`;
    db.run(sql, [name, date, org_id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Event created', eventId: this.lastID });
    });
};

var getEvent = function(req, res) {
    var eventId = req.params.id;
    var sql = `SELECT events.*, organizations.name AS organization
               FROM events
               LEFT JOIN organizations ON events.org_id = organizations.id
               WHERE events.id = ?`;
    db.get(sql, [eventId], function(err, row) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json({ event: row });
    });
};

module.exports = { listEvents, createEvent, getEvent };
