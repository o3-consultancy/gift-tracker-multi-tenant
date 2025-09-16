import express from 'express';
import {
    runQuery,
    runInsert,
    runUpdate,
    getDatabase
} from '../services/database.js';
import {
    createGiftTrackerInstance,
    stopGiftTrackerInstance,
    startGiftTrackerInstance,
    removeGiftTrackerInstance,
    getContainerStatus,
    getAllContainers,
    getContainerLogs,
    getNextAvailablePort
} from '../services/docker.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// Get all instances
router.get('/', async (req, res) => {
    try {
        const instances = await runQuery(`
      SELECT 
        i.*,
        COUNT(l.id) as log_count
      FROM instances i
      LEFT JOIN logs l ON i.id = l.instance_id
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `);

        // Get container status for each instance
        const instancesWithStatus = await Promise.all(
            instances.map(async (instance) => {
                const containerName = `gift-tracker-${instance.name}`;
                const containerStatus = await getContainerStatus(containerName);

                return {
                    ...instance,
                    container: containerStatus,
                    url: `http://${instance.subdomain}.${process.env.NODE_ENV === 'development' ? 'localhost' : 'o3consultancy.ae'}`
                };
            })
        );

        res.json(instancesWithStatus);
    } catch (error) {
        console.error('Error fetching instances:', error);
        res.status(500).json({ error: 'Failed to fetch instances' });
    }
});

// Get single instance
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const instance = await runQuery(
            'SELECT * FROM instances WHERE id = ?',
            [id]
        );

        if (instance.length === 0) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        const containerName = `gift-tracker-${instance[0].name}`;
        const containerStatus = await getContainerStatus(containerName);

        res.json({
            ...instance[0],
            container: containerStatus,
            url: `http://${instance[0].subdomain}.${process.env.NODE_ENV === 'development' ? 'localhost' : 'o3consultancy.ae'}`
        });
    } catch (error) {
        console.error('Error fetching instance:', error);
        res.status(500).json({ error: 'Failed to fetch instance' });
    }
});

// Create new instance
router.post('/', async (req, res) => {
    try {
        const { name, tiktokUsername, subdomain, password, config } = req.body;

        // Validate required fields
        if (!name || !tiktokUsername || !subdomain || !password) {
            return res.status(400).json({
                error: 'Missing required fields: name, tiktokUsername, subdomain, password'
            });
        }

        // Check if name or subdomain already exists
        const existing = await runQuery(
            'SELECT id FROM instances WHERE name = ? OR subdomain = ?',
            [name, subdomain]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                error: 'Instance with this name or subdomain already exists'
            });
        }

        // Get next available port
        const port = await getNextAvailablePort();

        // Create instance in database
        const result = await runInsert(`
      INSERT INTO instances (name, tiktok_username, subdomain, password, port, config, data_path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
            name,
            tiktokUsername,
            subdomain,
            password,
            port,
            JSON.stringify(config || {}),
            `/app/data/instances/${name}`
        ]);

        // Create Docker container
        const container = await createGiftTrackerInstance({
            name,
            tiktokUsername,
            subdomain,
            password,
            port,
            config
        });

        // Update instance with container info
        await runUpdate(
            'UPDATE instances SET status = ? WHERE id = ?',
            ['running', result.id]
        );

        // Log the creation
        await runInsert(
            'INSERT INTO logs (instance_id, level, message) VALUES (?, ?, ?)',
            [result.id, 'info', `Instance created and started successfully`]
        );

        res.status(201).json({
            id: result.id,
            name,
            tiktokUsername,
            subdomain,
            port,
            status: 'running',
            url: `http://${subdomain}.${process.env.NODE_ENV === 'development' ? 'localhost' : 'o3consultancy.ae'}`,
            container
        });

    } catch (error) {
        console.error('Error creating instance:', error);
        res.status(500).json({ error: 'Failed to create instance' });
    }
});

// Update instance
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { tiktokUsername, password, config } = req.body;

        // Get current instance
        const instance = await runQuery(
            'SELECT * FROM instances WHERE id = ?',
            [id]
        );

        if (instance.length === 0) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        const currentInstance = instance[0];

        // Update database
        const updates = [];
        const values = [];

        if (tiktokUsername) {
            updates.push('tiktok_username = ?');
            values.push(tiktokUsername);
        }

        if (password) {
            updates.push('password = ?');
            values.push(password);
        }

        if (config) {
            updates.push('config = ?');
            values.push(JSON.stringify(config));
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        await runUpdate(
            `UPDATE instances SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        // If TikTok username or password changed, restart container
        if (tiktokUsername || password) {
            const containerName = `gift-tracker-${currentInstance.name}`;
            await stopGiftTrackerInstance(containerName);
            await startGiftTrackerInstance(containerName);

            await runInsert(
                'INSERT INTO logs (instance_id, level, message) VALUES (?, ?, ?)',
                [id, 'info', 'Instance restarted due to configuration change']
            );
        }

        res.json({ message: 'Instance updated successfully' });

    } catch (error) {
        console.error('Error updating instance:', error);
        res.status(500).json({ error: 'Failed to update instance' });
    }
});

// Start instance
router.post('/:id/start', async (req, res) => {
    try {
        const { id } = req.params;

        const instance = await runQuery(
            'SELECT * FROM instances WHERE id = ?',
            [id]
        );

        if (instance.length === 0) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        const containerName = `gift-tracker-${instance[0].name}`;
        await startGiftTrackerInstance(containerName);

        await runUpdate(
            'UPDATE instances SET status = ? WHERE id = ?',
            ['running', id]
        );

        await runInsert(
            'INSERT INTO logs (instance_id, level, message) VALUES (?, ?, ?)',
            [id, 'info', 'Instance started']
        );

        res.json({ message: 'Instance started successfully' });

    } catch (error) {
        console.error('Error starting instance:', error);
        res.status(500).json({ error: 'Failed to start instance' });
    }
});

// Stop instance
router.post('/:id/stop', async (req, res) => {
    try {
        const { id } = req.params;

        const instance = await runQuery(
            'SELECT * FROM instances WHERE id = ?',
            [id]
        );

        if (instance.length === 0) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        const containerName = `gift-tracker-${instance[0].name}`;
        await stopGiftTrackerInstance(containerName);

        await runUpdate(
            'UPDATE instances SET status = ? WHERE id = ?',
            ['stopped', id]
        );

        await runInsert(
            'INSERT INTO logs (instance_id, level, message) VALUES (?, ?, ?)',
            [id, 'info', 'Instance stopped']
        );

        res.json({ message: 'Instance stopped successfully' });

    } catch (error) {
        console.error('Error stopping instance:', error);
        res.status(500).json({ error: 'Failed to stop instance' });
    }
});

// Delete instance
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const instance = await runQuery(
            'SELECT * FROM instances WHERE id = ?',
            [id]
        );

        if (instance.length === 0) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        const containerName = `gift-tracker-${instance[0].name}`;

        // Stop and remove container
        await removeGiftTrackerInstance(containerName);

        // Remove data directory
        const dataPath = path.join(__dirname, '../../data/instances', instance[0].name);
        if (await fs.pathExists(dataPath)) {
            await fs.remove(dataPath);
        }

        // Remove from database
        await runUpdate('DELETE FROM instances WHERE id = ?', [id]);

        res.json({ message: 'Instance deleted successfully' });

    } catch (error) {
        console.error('Error deleting instance:', error);
        res.status(500).json({ error: 'Failed to delete instance' });
    }
});

// Get instance logs
router.get('/:id/logs', async (req, res) => {
    try {
        const { id } = req.params;
        const { tail = 100 } = req.query;

        const instance = await runQuery(
            'SELECT * FROM instances WHERE id = ?',
            [id]
        );

        if (instance.length === 0) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        const containerName = `gift-tracker-${instance[0].name}`;
        const logs = await getContainerLogs(containerName, parseInt(tail));

        res.json({ logs });

    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

// Get container status
router.get('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;

        const instance = await runQuery(
            'SELECT * FROM instances WHERE id = ?',
            [id]
        );

        if (instance.length === 0) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        const containerName = `gift-tracker-${instance[0].name}`;
        const status = await getContainerStatus(containerName);

        res.json(status);

    } catch (error) {
        console.error('Error fetching status:', error);
        res.status(500).json({ error: 'Failed to fetch status' });
    }
});

export default router;
