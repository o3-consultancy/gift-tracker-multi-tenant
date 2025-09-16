import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

import { initializeDatabase } from './services/database.js';
import { initializeAuth, authenticateUser } from './services/auth.js';
import { initializeDocker } from './services/docker.js';
import instanceRoutes from './routes/instances.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/users.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// Initialize Express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.socket.io"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:", "https://cdn.socket.io"]
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS and body parsing
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Authentication middleware
const authenticateAdmin = async (req, res, next) => {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
        return res.status(401).json({ error: 'Authentication required' });
    }

    const credentials = Buffer.from(auth.slice(6), 'base64').toString();
    const [username, password] = credentials.split(':');

    try {
        const user = await authenticateUser(username, password);

        if (!user) {
            res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if user has admin role
        if (user.role !== 'admin') {
            res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
            return res.status(403).json({ error: 'Admin access required' });
        }

        // Add user info to request
        req.user = user;
        return next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
        return res.status(500).json({ error: 'Authentication service error' });
    }
};

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes with authentication
app.use('/api/instances', authenticateAdmin, instanceRoutes);
app.use('/api/admin', authenticateAdmin, adminRoutes);
app.use('/api/users', authenticateAdmin, userRoutes);

// Serve admin panel with authentication
app.get('/', authenticateAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Socket.IO for real-time updates
io.on('connection', (socket) => {
    console.log('Admin client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Admin client disconnected:', socket.id);
    });
});

// Make io available to routes
app.set('io', io);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Initialize services and start server
async function startServer() {
    try {
        // Ensure data directory exists
        await fs.ensureDir(path.join(__dirname, '../../data'));

        // Initialize database
        await initializeDatabase();
        console.log('✅ Database initialized');

        // Initialize authentication service
        await initializeAuth();
        console.log('✅ Authentication service initialized');

        // Initialize Docker connection
        await initializeDocker();
        console.log('✅ Docker connection established');

        // Start server
        httpServer.listen(PORT, () => {
            console.log(`🚀 Admin panel running on port ${PORT}`);
            console.log(`📊 Dashboard: http://localhost:${PORT}`);
            console.log(`🔧 API: http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

startServer();
