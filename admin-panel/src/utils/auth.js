import crypto from 'crypto';

/**
 * Generate a basic auth hash for Traefik using MD5 (htpasswd format)
 * @param {string} username - The username
 * @param {string} password - The password
 * @returns {string} - The hashed credentials in format "username:$apr1$salt$hash"
 */
export function generateBasicAuthHash(username, password) {
    // Generate a random salt
    const salt = crypto.randomBytes(8).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);

    // Create MD5 hash in Apache htpasswd format
    const hash = crypto.createHash('md5');
    hash.update(password);
    hash.update(salt);
    const digest = hash.digest('base64');

    return `${username}:$$apr1$${salt}$${digest}`;
}

/**
 * Generate a simple basic auth string for Traefik (plain text - for testing)
 * @param {string} username - The username
 * @param {string} password - The password
 * @returns {string} - The credentials in format "username:password"
 */
export function generateBasicAuthString(username, password) {
    return `${username}:${password}`;
}
