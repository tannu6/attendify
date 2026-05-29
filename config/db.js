var fs = require('fs');
var path = require('path');
var sqlite3 = require('sqlite3').verbose();

var dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

var dbFile = path.resolve(dataDir, 'certificate_portal.db');
var db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Failed to open database:', err.message);
        process.exit(1);
    }
});

var initSql = [
    `CREATE TABLE IF NOT EXISTS organizations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        logo TEXT,
        created_by INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        org_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(org_id) REFERENCES organizations(id)
    );`,
    `CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        org_id INTEGER NOT NULL,
        template_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(org_id) REFERENCES organizations(id)
    );`,
    `CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        design_json TEXT,
        org_id INTEGER,
        logo_path TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(org_id) REFERENCES organizations(id)
    );`,
    `CREATE TABLE IF NOT EXISTS certificates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unique_code TEXT UNIQUE NOT NULL,
        recipient_name TEXT NOT NULL,
        recipient_email TEXT NOT NULL,
        event_id INTEGER NOT NULL,
        issued_at TEXT DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'issued',
        qr_data TEXT,
        pdf_path TEXT,
        FOREIGN KEY(event_id) REFERENCES events(id)
    );`
];

initSql.forEach((sql) => {
    db.run(sql, (err) => {
        if (err) {
            console.error('Database init error:', err.message);
        }
    });
});

module.exports = db;
