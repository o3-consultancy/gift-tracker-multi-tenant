import express from 'express';
import {
    createUser,
    getUserById,
    getUserByUsername,
    listUsers,
    updateUserPassword,
    deactivateUser
} from '../services/auth.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const users = await listUsers(parseInt(limit), parseInt(offset));
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get user by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await getUserById(parseInt(id));

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Create new user
router.post('/', async (req, res) => {
    try {
        const { username, password, email, role = 'user' } = req.body;

        // Validate required fields
        if (!username || !password) {
            return res.status(400).json({
                error: 'Username and password are required'
            });
        }

        // Check if username already exists
        const existingUser = await getUserByUsername(username);
        if (existingUser) {
            return res.status(409).json({
                error: 'Username already exists'
            });
        }

        const user = await createUser({ username, password, email, role });
        res.status(201).json(user);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Update user password
router.put('/:id/password', async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({
                error: 'New password is required'
            });
        }

        const success = await updateUserPassword(parseInt(id), newPassword);

        if (!success) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ error: 'Failed to update password' });
    }
});

// Deactivate user
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const success = await deactivateUser(parseInt(id));

        if (!success) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deactivated successfully' });
    } catch (error) {
        console.error('Error deactivating user:', error);
        res.status(500).json({ error: 'Failed to deactivate user' });
    }
});

export default router;
