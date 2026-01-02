const Database = require("better-sqlite3");

// file database akan otomatis dibuat kalau belum ada
const db = new Database("klinik.db");

// 1) tabel pasien (master data)
db.exec(`
  CREATE TABLE IF NOT EXISTS pasien (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    umur INTEGER NOT NULL,
    keluhan TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// 2) tabel antrian (transaksi antrian)
db.exec(`
  CREATE TABLE IF NOT EXISTS antrian (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pasien_id INTEGER NOT NULL,
    nomor INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'MENUNGGU',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (pasien_id) REFERENCES pasien(id)
  );
`);

module.exports = db;