var bcrypt = require('bcryptjs');
var db = require('../config/db');

var register = function(req, res) {
    var { name, email, password, role, org_name } = req.body;
    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    var hashed = bcrypt.hashSync(password, 10);

    var insertUser = function(orgId) {
        var sql = `INSERT INTO users (name, email, password, role, org_id) VALUES (?, ?, ?, ?, ?)`;
        db.run(sql, [name, email, hashed, role, orgId], function(err) {
            if (err) {
                if (err.message.indexOf('UNIQUE constraint failed') !== -1) {
                    return res.status(409).json({ error: 'Email already registered' });
                }
                return res.status(500).json({ error: err.message });
            }
            req.session.user = { id: this.lastID, name, email, role, org_id: orgId };
            res.json({ message: 'Registration successful', user: req.session.user });
        });
    };

    if (role === 'organization') {
        if (!org_name) {
            return res.status(400).json({ error: 'Organization name required' });
        }
        var orgSql = `INSERT INTO organizations (name, created_by) VALUES (?, ?)`;
        db.run(orgSql, [org_name, null], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            insertUser(this.lastID);
        });
    } else {
        insertUser(null);
    }
};

var login = function(req, res) {
    var { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    var sql = `SELECT id, name, email, password, role, org_id FROM users WHERE email = ?`;
    db.get(sql, [email], function(err, row) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row || !bcrypt.compareSync(password, row.password)) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        req.session.user = {
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role,
            org_id: row.org_id
        };
        res.json({ message: 'Login successful', user: req.session.user });
    });
};

var logout = function(req, res) {
    req.session.destroy(function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to logout' });
        }
        res.json({ message: 'Logged out' });
    });
};

module.exports = { register, login, logout };
