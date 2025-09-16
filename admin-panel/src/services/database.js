import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../data/admin.db');

let db = null;

export async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        // Ensure data directory exists
        fs.ensureDirSync(path.dirname(DB_PATH));

        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                reject(err);
                return;
            }

            console.log('Connected to SQLite database');
            createTables().then(resolve).catch(reject);
        });
    });
}

function createTables() {
    return new Promise((resolve, reject) => {
        const createInstancesTable = `
      CREATE TABLE IF NOT EXISTS instances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        tiktok_username TEXT NOT NULL,
        subdomain TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        port INTEGER UNIQUE NOT NULL,
        status TEXT DEFAULT 'stopped',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        config TEXT DEFAULT '{}',
        data_path TEXT NOT NULL
      )
    `;

        const createLogsTable = `
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        instance_id INTEGER,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instance_id) REFERENCES instances (id)
      )
    `;

        const createSettingsTable = `
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

        db.serialize(() => {
            db.run(createInstancesTable, (err) => {
                if (err) {
                    console.error('Error creating instances table:', err);
                    reject(err);
                    return;
                }
            });

            db.run(createLogsTable, (err) => {
                if (err) {
                    console.error('Error creating logs table:', err);
                    reject(err);
                    return;
                }
            });

            db.run(createSettingsTable, (err) => {
                if (err) {
                    console.error('Error creating settings table:', err);
                    reject(err);
                    return;
                }

                // Insert default settings
                insertDefaultSettings().then(resolve).catch(reject);
            });
        });
    });
}

function insertDefaultSettings() {
    return new Promise((resolve, reject) => {
        const defaultSettings = [
            ['domain', 'o3consultancy.ae'],
            ['base_port', '3001'],
            ['max_instances', '50'],
            ['auto_ssl', 'true'],
            ['backup_enabled', 'true'],
            ['backup_interval', '24']
        ];

        const stmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');

        db.serialize(() => {
            defaultSettings.forEach(([key, value]) => {
                stmt.run(key, value);
            });

            stmt.finalize((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    });
}

export function getDatabase() {
    return db;
}

export function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

export function runInsert(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID, changes: this.changes });
            }
        });
    });
}

export function runUpdate(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({ changes: this.changes });
            }
        });
    });
}

export function closeDatabase() {
    return new Promise((resolve) => {
        if (db) {
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('Database connection closed');
                }
                resolve();
            });
        } else {
            resolve();
        }
    });
}
