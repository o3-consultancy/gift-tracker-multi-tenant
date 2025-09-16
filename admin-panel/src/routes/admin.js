import express from 'express';
import {
    runQuery,
    runInsert,
    runUpdate
} from '../services/database.js';
import { getAllContainers } from '../services/docker.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// Get system overview
router.get('/overview', async (req, res) => {
    try {
        // Get instance statistics
        const instanceStats = await runQuery(`
      SELECT 
        COUNT(*) as total_instances,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running_instances,
        SUM(CASE WHEN status = 'stopped' THEN 1 ELSE 0 END) as stopped_instances
      FROM instances
    `);

        // Get recent logs
        const recentLogs = await runQuery(`
      SELECT 
        l.*,
        i.name as instance_name
      FROM logs l
      JOIN instances i ON l.instance_id = i.id
      ORDER BY l.timestamp DESC
      LIMIT 20
    `);

        // Get container information
        const containers = await getAllContainers();

        // Get disk usage
        const dataPath = path.join(__dirname, '../../data');
        const diskUsage = await getDiskUsage(dataPath);

        res.json({
            instances: instanceStats[0],
            recentLogs,
            containers: containers.length,
            diskUsage,
            system: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                nodeVersion: process.version,
                platform: process.platform
            }
        });

    } catch (error) {
        console.error('Error fetching overview:', error);
        res.status(500).json({ error: 'Failed to fetch system overview' });
    }
});

// Get all logs
router.get('/logs', async (req, res) => {
    try {
        const { level, instance_id, limit = 100, offset = 0 } = req.query;

        let query = `
      SELECT 
        l.*,
        i.name as instance_name
      FROM logs l
      JOIN instances i ON l.instance_id = i.id
      WHERE 1=1
    `;

        const params = [];

        if (level) {
            query += ' AND l.level = ?';
            params.push(level);
        }

        if (instance_id) {
            query += ' AND l.instance_id = ?';
            params.push(instance_id);
        }

        query += ' ORDER BY l.timestamp DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const logs = await runQuery(query, params);

        res.json(logs);

    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

// Get settings
router.get('/settings', async (req, res) => {
    try {
        const settings = await runQuery('SELECT * FROM settings ORDER BY key');

        const settingsObj = {};
        settings.forEach(setting => {
            settingsObj[setting.key] = setting.value;
        });

        res.json(settingsObj);

    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Update settings
router.put('/settings', async (req, res) => {
    try {
        const settings = req.body;

        for (const [key, value] of Object.entries(settings)) {
            await runUpdate(
                'UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
                [value, key]
            );
        }

        res.json({ message: 'Settings updated successfully' });

    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Get all containers
router.get('/containers', async (req, res) => {
    try {
        const containers = await getAllContainers();
        res.json(containers);

    } catch (error) {
        console.error('Error fetching containers:', error);
        res.status(500).json({ error: 'Failed to fetch containers' });
    }
});

// Backup system
router.post('/backup', async (req, res) => {
    try {
        const { includeData = true } = req.body;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(__dirname, '../../data/backups', `backup-${timestamp}`);

        await fs.ensureDir(backupPath);

        // Backup database
        const dbPath = path.join(__dirname, '../../data/admin.db');
        if (await fs.pathExists(dbPath)) {
            await fs.copy(dbPath, path.join(backupPath, 'admin.db'));
        }

        // Backup instance data if requested
        if (includeData) {
            const instancesPath = path.join(__dirname, '../../data/instances');
            if (await fs.pathExists(instancesPath)) {
                await fs.copy(instancesPath, path.join(backupPath, 'instances'));
            }
        }

        // Create backup manifest
        const manifest = {
            timestamp: new Date().toISOString(),
            includeData,
            instances: await runQuery('SELECT id, name, tiktok_username, subdomain FROM instances')
        };

        await fs.writeJson(path.join(backupPath, 'manifest.json'), manifest, { spaces: 2 });

        res.json({
            message: 'Backup created successfully',
            backupPath: `backup-${timestamp}`
        });

    } catch (error) {
        console.error('Error creating backup:', error);
        res.status(500).json({ error: 'Failed to create backup' });
    }
});

// List backups
router.get('/backups', async (req, res) => {
    try {
        const backupsPath = path.join(__dirname, '../../data/backups');
        await fs.ensureDir(backupsPath);

        const backups = await fs.readdir(backupsPath);
        const backupInfo = [];

        for (const backup of backups) {
            const backupPath = path.join(backupsPath, backup);
            const manifestPath = path.join(backupPath, 'manifest.json');

            if (await fs.pathExists(manifestPath)) {
                const manifest = await fs.readJson(manifestPath);
                const stats = await fs.stat(backupPath);

                backupInfo.push({
                    name: backup,
                    timestamp: manifest.timestamp,
                    includeData: manifest.includeData,
                    instances: manifest.instances.length,
                    size: await getDirectorySize(backupPath),
                    created: stats.birthtime
                });
            }
        }

        backupInfo.sort((a, b) => new Date(b.created) - new Date(a.created));

        res.json(backupInfo);

    } catch (error) {
        console.error('Error listing backups:', error);
        res.status(500).json({ error: 'Failed to list backups' });
    }
});

// System health check
router.get('/health', async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                database: 'healthy',
                docker: 'healthy',
                disk: 'healthy'
            }
        };

        // Check database
        try {
            await runQuery('SELECT 1');
        } catch (error) {
            health.services.database = 'unhealthy';
            health.status = 'degraded';
        }

        // Check Docker
        try {
            const { getAllContainers } = await import('../services/docker.js');
            await getAllContainers();
        } catch (error) {
            health.services.docker = 'unhealthy';
            health.status = 'degraded';
        }

        // Check disk space
        try {
            const dataPath = path.join(__dirname, '../../data');
            const diskUsage = await getDiskUsage(dataPath);
            if (diskUsage.usage > 90) {
                health.services.disk = 'warning';
                if (health.status === 'healthy') {
                    health.status = 'degraded';
                }
            }
        } catch (error) {
            health.services.disk = 'unhealthy';
            health.status = 'degraded';
        }

        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);

    } catch (error) {
        console.error('Error checking health:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: 'Health check failed'
        });
    }
});

// Helper functions
async function getDiskUsage(path) {
    try {
        const stats = await fs.stat(path);
        // This is a simplified version - in production you'd want to use a proper disk usage library
        return {
            path,
            usage: 0, // Placeholder
            free: 0,  // Placeholder
            total: 0  // Placeholder
        };
    } catch (error) {
        return { path, usage: 0, free: 0, total: 0 };
    }
}

async function getDirectorySize(dirPath) {
    try {
        let totalSize = 0;
        const files = await fs.readdir(dirPath);

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = await fs.stat(filePath);

            if (stats.isDirectory()) {
                totalSize += await getDirectorySize(filePath);
            } else {
                totalSize += stats.size;
            }
        }

        return totalSize;
    } catch (error) {
        return 0;
    }
}

export default router;
