import { Pool } from 'pg';

// Database connection pool
let pool = null;

export function initializeDatabase() {
    return new Promise((resolve, reject) => {
        try {
            pool = new Pool({
                host: process.env.DB_HOST || 'postgres',
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
                    console.log('Connected to PostgreSQL database for gift tracker instance');
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
                    id: result.rows[0]?.id,
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

// Session Management Functions
export async function createSession(instanceId) {
    const result = await runInsert(`
        INSERT INTO sessions (instance_id, status)
        VALUES ($1, 'active')
        RETURNING id
    `, [instanceId]);

    return result.id;
}

export async function endSession(sessionId, stats = {}) {
    await runUpdate(`
        UPDATE sessions 
        SET end_time = CURRENT_TIMESTAMP, 
            status = 'completed',
            total_gifts = $2,
            total_diamonds = $3,
            peak_viewers = $4,
            unique_viewers = $5
        WHERE id = $1
    `, [sessionId, stats.totalGifts || 0, stats.totalDiamonds || 0, stats.peakViewers || 0, stats.uniqueViewers || 0]);
}

export async function getActiveSession(instanceId) {
    const sessions = await runQuery(`
        SELECT * FROM sessions 
        WHERE instance_id = $1 AND status = 'active'
        ORDER BY start_time DESC
        LIMIT 1
    `, [instanceId]);

    return sessions[0] || null;
}

// Gift Event Functions
export async function logGiftEvent(sessionId, giftData) {
    await runInsert(`
        INSERT INTO gift_events (session_id, gift_id, gift_name, gift_value, sender_name, repeat_count)
        VALUES ($1, $2, $3, $4, $5, $6)
    `, [sessionId, giftData.giftId, giftData.giftName, giftData.diamondCount, giftData.nickname, giftData.repeatCount || 1]);
}

// Viewer Event Functions
export async function logViewerEvent(sessionId, viewerId, eventType) {
    await runInsert(`
        INSERT INTO viewer_events (session_id, viewer_id, event_type)
        VALUES ($1, $2, $3)
    `, [sessionId, viewerId, eventType]);
}

// Configuration Functions
export async function getInstanceConfig(instanceId) {
    const configs = await runQuery(`
        SELECT * FROM instance_configs 
        WHERE instance_id = $1
        ORDER BY created_at DESC
        LIMIT 1
    `, [instanceId]);

    if (configs.length === 0) {
        // Create default config
        const result = await runInsert(`
            INSERT INTO instance_configs (instance_id, overlay_style, animation_speed, theme, custom_colors, sound_enabled, auto_connect)
            VALUES ($1, 'classic', 'normal', 'dark', '{}', false, false)
            RETURNING *
        `, [instanceId]);

        return result;
    }

    return configs[0];
}

export async function updateInstanceConfig(instanceId, config) {
    const existing = await getInstanceConfig(instanceId);

    if (existing) {
        await runUpdate(`
            UPDATE instance_configs 
            SET overlay_style = $2, animation_speed = $3, theme = $4, 
                custom_colors = $5, sound_enabled = $6, auto_connect = $7
            WHERE instance_id = $1
        `, [instanceId, config.overlayStyle, config.animationSpeed, config.theme,
            JSON.stringify(config.customColors || {}), config.soundEnabled, config.autoConnect]);
    } else {
        await runInsert(`
            INSERT INTO instance_configs (instance_id, overlay_style, animation_speed, theme, custom_colors, sound_enabled, auto_connect)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [instanceId, config.overlayStyle, config.animationSpeed, config.theme,
            JSON.stringify(config.customColors || {}), config.soundEnabled, config.autoConnect]);
    }
}

// Gift Groups Functions
export async function getGiftGroups(instanceId) {
    const groups = await runQuery(`
        SELECT group_id, name, gift_ids, color, goal
        FROM gift_groups 
        WHERE instance_id = $1
        ORDER BY created_at ASC
    `, [instanceId]);

    // Convert to the format expected by the frontend
    const groupsObj = {};
    groups.forEach(group => {
        groupsObj[group.group_id] = {
            name: group.name,
            giftIds: group.gift_ids || [],
            color: group.color,
            goal: group.goal
        };
    });

    return groupsObj;
}

export async function saveGiftGroups(instanceId, groups) {
    // Clear existing groups
    await runUpdate('DELETE FROM gift_groups WHERE instance_id = $1', [instanceId]);

    // Insert new groups
    for (const [groupId, groupData] of Object.entries(groups)) {
        await runInsert(`
            INSERT INTO gift_groups (instance_id, group_id, name, gift_ids, color, goal)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [instanceId, groupId, groupData.name, groupData.giftIds || [], groupData.color, groupData.goal || 0]);
    }
}

// Analytics Functions
export async function getSessionHistory(instanceId, limit = 10) {
    return await runQuery(`
        SELECT id, start_time, end_time, total_gifts, total_diamonds, peak_viewers, unique_viewers, status
        FROM sessions 
        WHERE instance_id = $1
        ORDER BY start_time DESC
        LIMIT $2
    `, [instanceId, limit]);
}

export async function getSessionStats(instanceId) {
    const stats = await runQuery(`
        SELECT 
            COUNT(*) as total_sessions,
            SUM(total_gifts) as total_gifts,
            SUM(total_diamonds) as total_diamonds,
            AVG(total_gifts) as avg_gifts_per_session,
            AVG(total_diamonds) as avg_diamonds_per_session,
            MAX(peak_viewers) as max_viewers,
            AVG(unique_viewers) as avg_unique_viewers
        FROM sessions 
        WHERE instance_id = $1 AND status = 'completed'
    `, [instanceId]);

    return stats[0] || {};
}

export async function getGiftAnalytics(instanceId, sessionId = null) {
    let query = `
        SELECT 
            ge.gift_name,
            ge.gift_id,
            COUNT(*) as gift_count,
            SUM(ge.gift_value * ge.repeat_count) as total_value,
            SUM(ge.repeat_count) as total_quantity
        FROM gift_events ge
        JOIN sessions s ON ge.session_id = s.id
        WHERE s.instance_id = $1
    `;

    const params = [instanceId];

    if (sessionId) {
        query += ' AND ge.session_id = $2';
        params.push(sessionId);
    }

    query += `
        GROUP BY ge.gift_name, ge.gift_id
        ORDER BY total_value DESC
    `;

    return await runQuery(query, params);
}
