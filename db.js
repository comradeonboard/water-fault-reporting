const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const createUsers = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  createdAt TEXT NOT NULL
);`;

const createReports = `
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  location TEXT NOT NULL,
  issueType TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT NOT NULL,
  photo TEXT,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY(userId) REFERENCES users(id)
);`;

function ensurePhotoColumn() {
  db.all("PRAGMA table_info(reports)", (err, rows) => {
    if (err) {
      console.error('Unable to inspect reports table:', err.message);
      return;
    }
    const hasPhoto = rows.some((column) => column.name === 'photo');
    if (!hasPhoto) {
      db.run('ALTER TABLE reports ADD COLUMN photo TEXT', (alterErr) => {
        if (alterErr) {
          console.error('Unable to add photo column:', alterErr.message);
        }
      });
    }
  });
}

function init() {
  db.serialize(() => {
    db.run(createUsers);
    db.run(createReports, (err) => {
      if (err) {
        console.error('Unable to create reports table:', err.message);
      }
      ensurePhotoColumn();
    });
  });
}

module.exports = {
  db,
  init,
};
