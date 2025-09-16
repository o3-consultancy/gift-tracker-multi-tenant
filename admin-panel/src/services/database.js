import { Pool } from 'pg';

// Database connection pool
let pool = null;

export function initializeDatabase() {
    return new Promise((resolve, reject) => {
        try {
            pool = new Pool({
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT || 5432,
                database: process.env.DB_NAME || 'gift_tracker',
                user: process.env.DB_USER || 'admin',
                password: process.env.DB_PASSWORD || 'admin123',
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            });

            // Test the connection
            pool.query('SELECT NOW()', (err, result) => {
                if (err) {
                    console.error('Error connecting to PostgreSQL:', err);
                    reject(err);
                } else {
                    console.log('Connected to PostgreSQL database');
                    resolve(pool);
                }
            });
        } catch (error) {
            console.error('Failed to initialize PostgreSQL:', error);
            reject(error);
        }
    });
}

export function getDatabase() {
    return pool;
}

export function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result.rows);
            }
        });
    });
}

export function runInsert(sql, params = []) {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve({
                    id: result.rows[0]?.id || result.insertId,
                    changes: result.rowCount
                });
            }
        });
    });
}

export function runUpdate(sql, params = []) {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve({ changes: result.rowCount });
            }
        });
    });
}

export function closeDatabase() {
    return new Promise((resolve) => {
        if (pool) {
            pool.end((err) => {
                if (err) {
                    console.error('Error closing PostgreSQL connection:', err);
                } else {
                    console.log('PostgreSQL connection closed');
                }
                resolve();
            });
        } else {
            resolve();
        }
    });
}