import bcrypt from 'bcrypt';
import { Pool } from 'pg';

let pool = null;

export function initializeAuth() {
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
    console.log('✅ PostgreSQL connection pool initialized for instance');
    return pool;
}

export async function authenticateUser(username, password) {
    if (!pool) {
        throw new Error('Database connection not initialized');
    }

    try {
        // First, try to find the user by username
        let result = await pool.query(
            'SELECT id, username, password_hash, role, is_active FROM users WHERE username = $1 AND is_active = true',
            [username]
        );

        // If no user found and username is 'admin', try to find the instance-specific user
        if (result.rows.length === 0 && username === 'admin') {
            // Get the instance name from environment variable
            const instanceName = process.env.INSTANCE_NAME || process.env.TIKTOK_USERNAME;
            if (instanceName) {
                result = await pool.query(
                    'SELECT id, username, password_hash, role, is_active FROM users WHERE username = $1 AND is_active = true',
                    [instanceName]
                );
            }
        }

        if (result.rows.length === 0) {
            console.log(`Authentication failed: User '${username}' not found`);
            return null;
        }

        const user = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            console.log(`Authentication failed: Invalid password for user '${username}'`);
            return null;
        }

        console.log(`Authentication successful for user '${user.username}'`);
        return {
            id: user.id,
            username: user.username,
            role: user.role,
            isActive: user.is_active
        };
    } catch (error) {
        console.error('Authentication error:', error);
        throw error;
    }
}

export async function getUserByUsername(username) {
    if (!pool) {
        throw new Error('Database connection not initialized');
    }

    try {
        const result = await pool.query(
            'SELECT id, username, email, role, is_active, created_at FROM users WHERE username = $1',
            [username]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('Error fetching user:', error);
        throw error;
    }
}

export async function closeAuth() {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('✅ PostgreSQL connection pool closed for instance');
    }
}
