import bcrypt from 'bcrypt';
import { Pool } from 'pg';

// Database connection pool
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

    console.log('✅ PostgreSQL connection pool initialized');
    return pool;
}

export function getPool() {
    if (!pool) {
        throw new Error('Database pool not initialized. Call initializeAuth() first.');
    }
    return pool;
}

/**
 * Authenticate a user with username and password
 * @param {string} username - The username
 * @param {string} password - The plain text password
 * @returns {Promise<Object|null>} - User object if authenticated, null otherwise
 */
export async function authenticateUser(username, password) {
    try {
        const client = await pool.connect();

        try {
            const result = await client.query(
                'SELECT id, username, password_hash, email, role, is_active FROM users WHERE username = $1 AND is_active = true',
                [username]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const user = result.rows[0];
            const isValid = await bcrypt.compare(password, user.password_hash);

            if (!isValid) {
                return null;
            }

            // Remove password hash from returned object
            const { password_hash, ...userWithoutPassword } = user;
            return userWithoutPassword;

        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error authenticating user:', error);
        throw error;
    }
}

/**
 * Create a new user
 * @param {Object} userData - User data
 * @param {string} userData.username - Username
 * @param {string} userData.password - Plain text password
 * @param {string} userData.email - Email address
 * @param {string} userData.role - User role (default: 'user')
 * @returns {Promise<Object>} - Created user object
 */
export async function createUser(userData) {
    const { username, password, email, role = 'user' } = userData;

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const client = await pool.connect();

        try {
            const result = await client.query(
                'INSERT INTO users (username, password_hash, email, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, is_active, created_at',
                [username, passwordHash, email, role]
            );

            return result.rows[0];
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}

/**
 * Get user by ID
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} - User object or null
 */
export async function getUserById(userId) {
    try {
        const client = await pool.connect();

        try {
            const result = await client.query(
                'SELECT id, username, email, role, is_active, created_at, updated_at FROM users WHERE id = $1',
                [userId]
            );

            return result.rows[0] || null;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error getting user by ID:', error);
        throw error;
    }
}

/**
 * Get user by username
 * @param {string} username - Username
 * @returns {Promise<Object|null>} - User object or null
 */
export async function getUserByUsername(username) {
    try {
        const client = await pool.connect();

        try {
            const result = await client.query(
                'SELECT id, username, email, role, is_active, created_at, updated_at FROM users WHERE username = $1',
                [username]
            );

            return result.rows[0] || null;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error getting user by username:', error);
        throw error;
    }
}

/**
 * Update user password
 * @param {number} userId - User ID
 * @param {string} newPassword - New plain text password
 * @returns {Promise<boolean>} - Success status
 */
export async function updateUserPassword(userId, newPassword) {
    try {
        const passwordHash = await bcrypt.hash(newPassword, 10);
        const client = await pool.connect();

        try {
            const result = await client.query(
                'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [passwordHash, userId]
            );

            return result.rowCount > 0;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error updating user password:', error);
        throw error;
    }
}

/**
 * List all users (admin only)
 * @param {number} limit - Number of users to return
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} - Array of user objects
 */
export async function listUsers(limit = 50, offset = 0) {
    try {
        const client = await pool.connect();

        try {
            const result = await client.query(
                'SELECT id, username, email, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
                [limit, offset]
            );

            return result.rows;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error listing users:', error);
        throw error;
    }
}

/**
 * Deactivate a user
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} - Success status
 */
export async function deactivateUser(userId) {
    try {
        const client = await pool.connect();

        try {
            const result = await client.query(
                'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
                [userId]
            );

            return result.rowCount > 0;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error deactivating user:', error);
        throw error;
    }
}

/**
 * Generate basic auth hash for Traefik
 * @param {string} username - Username
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Basic auth hash
 */
export async function generateBasicAuthHash(username, password) {
    const passwordHash = await bcrypt.hash(password, 10);
    return `${username}:${passwordHash}`;
}

/**
 * Verify basic auth credentials
 * @param {string} username - Username
 * @param {string} password - Plain text password
 * @returns {Promise<boolean>} - Whether credentials are valid
 */
export async function verifyBasicAuth(username, password) {
    const user = await authenticateUser(username, password);
    return user !== null;
}

/**
 * Close the database connection pool
 */
export async function closeAuth() {
    if (pool) {
        await pool.end();
        console.log('PostgreSQL connection pool closed');
    }
}
