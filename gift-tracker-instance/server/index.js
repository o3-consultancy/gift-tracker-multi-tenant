import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { WebcastPushConnection } from 'tiktok-live-connector';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeAuth, authenticateUser, closeAuth } from './auth.js';
import {
  initializeDatabase,
  closeDatabase,
  createSession,
  endSession,
  getActiveSession,
  logGiftEvent,
  logViewerEvent,
  getInstanceConfig,
  updateInstanceConfig,
  getGiftGroups,
  saveGiftGroups,
  getSessionHistory,
  getSessionStats,
  getGiftAnalytics
} from './database.js';

/* ── env ───────────────────────────── */
const PORT = process.env.PORT || 3000;
const USERNAME = process.env.TIKTOK_USERNAME;
const DASH_PASSWORD = process.env.DASH_PASSWORD || 'changeme';
const INSTANCE_ID = process.env.INSTANCE_ID || 1; // Will be set by admin panel

if (!USERNAME) { console.error('TIKTOK_USERNAME missing'); process.exit(1); }

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ── config & saved state ──────────── */
let cfg = { target: 10_000 };
let groups = {};
let instanceConfig = {};
let currentSession = null;

/* ── runtime state ─────────────────── */
let counters = {};
let liveStatus = 'DISCONNECTED';   // DISCONNECTED | CONNECTING | ONLINE | OFFLINE
let viewers = 0;
let uniques = new Set();
let totalGifts = 0;
let totalDiamonds = 0;
let giftCatalog = [];

function initCounters() {
  counters = {};
  for (const g in groups) counters[g] = { count: 0, diamonds: 0 };
}

// Load configuration and groups from database
async function loadInstanceData() {
  try {
    // Load instance configuration
    instanceConfig = await getInstanceConfig(INSTANCE_ID);
    cfg.target = instanceConfig.target || 10_000;

    // Load gift groups
    groups = await getGiftGroups(INSTANCE_ID);

    // Initialize counters
    initCounters();

    console.log('✅ Instance data loaded from database');
  } catch (error) {
    console.error('❌ Failed to load instance data:', error);
    // Fallback to default values
    initCounters();
  }
}

/* ── TikTok connector (created on demand) ─────────────────────────── */
let tiktok = null;

async function connectTikTok() {
  if (liveStatus === 'CONNECTING' || liveStatus === 'ONLINE') return;

  liveStatus = 'CONNECTING'; broadcast();
  try {
    // Create new session
    currentSession = await createSession(INSTANCE_ID);
    console.log(`📊 Started new session: ${currentSession}`);

    tiktok = new WebcastPushConnection(USERNAME, {
      enableExtendedGiftInfo: true,
      signServerUrl: 'https://sign.furetto.dev/api/sign'
    });

    /* … listeners (streamEnd, viewer, member) stay the same … */

    tiktok.on('gift', async (data) => {
      io.emit('giftStream', data);       // still echo raw event to the UI

      /* 1️⃣  Calculate how many gifts to add (delta) */
      let delta = 0;

      if (data.giftType === 1) {               // streak-capable gifts
        if (data.repeatEnd) {
          delta = data.repeatCount;            // count once, at the end
        } else {
          return;                              // ignore in-progress ticks
        }
      } else {
        /* Non-streak gifts arrive once with repeatCount === 1 */
        delta = data.repeatCount || 1;
      }

      /* 2️⃣  Global totals */
      totalGifts += delta;
      totalDiamonds += data.diamondCount * delta;

      /* 3️⃣  Log gift event to database */
      if (currentSession) {
        try {
          await logGiftEvent(currentSession, {
            giftId: data.giftId,
            giftName: data.giftName,
            diamondCount: data.diamondCount,
            nickname: data.nickname,
            repeatCount: delta
          });
        } catch (error) {
          console.error('Failed to log gift event:', error);
        }
      }

      /* add unseen gift to catalog */
      if (!giftCatalog.find(g => g.id === data.giftId)) {
        giftCatalog.push({
          id: data.giftId,
          name: data.giftName,
          diamondCost: data.diamondCount,
          iconUrl: data.giftPictureUrl || null
        });
        io.emit('giftCatalog', giftCatalog);      // update all clients
      }

      /* 4️⃣  Per-group totals */
      const gid = Object.keys(groups).find(k =>
        (groups[k].giftIds || []).includes(data.giftId)
      );
      if (gid) {
        counters[gid].count += delta;
        counters[gid].diamonds += data.diamondCount * delta;
      }

      /* 5️⃣  Broadcast updated payload */
      broadcast();
    });

    await tiktok.connect();              // may throw if stream offline
    liveStatus = 'ONLINE';

    /* ── NEW: fetch full gift catalogue after successful connect ── */
    giftCatalog = (await tiktok.fetchAvailableGifts().catch(() => []))
      .map(g => ({
        id: g.id,
        name: g.name,
        diamondCost: g.diamondCost,
        iconUrl: g.image?.url_list?.[0] || null
      }));
    io.emit('giftCatalog', giftCatalog); // send to all dashboards
  } catch (err) {
    console.error('Connect failed:', err.message);
    liveStatus = 'OFFLINE';
  }
  broadcast();
}

async function disconnectTikTok() {
  if (tiktok) {
    try { await tiktok.disconnect(); } catch { }
    tiktok = null;
  }

  // End current session
  if (currentSession) {
    try {
      await endSession(currentSession, {
        totalGifts,
        totalDiamonds,
        peakViewers: viewers,
        uniqueViewers: uniques.size
      });
      console.log(`📊 Ended session: ${currentSession}`);
    } catch (error) {
      console.error('Failed to end session:', error);
    }
    currentSession = null;
  }

  liveStatus = 'DISCONNECTED';
  broadcast();
}

/* ── Express, static, auth, overlay public -------------------------- */
const app = express();
const http = createServer(app);
const io = new Server(http, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const pub = path.join(__dirname, '..', 'public');
app.use('/overlay.html', express.static(path.join(pub, 'overlay.html')));
app.use('/overlay.js', express.static(path.join(pub, 'overlay.js')));
app.use('/styles.css', express.static(path.join(pub, 'styles.css')));

// Custom SQL-based authentication middleware
const authenticateInstance = async (req, res, next) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Gift Tracker Instance"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const credentials = Buffer.from(auth.slice(6), 'base64').toString();
  const [username, password] = credentials.split(':');

  try {
    const user = await authenticateUser(username, password);

    if (!user) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Gift Tracker Instance"');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Add user info to request
    req.user = user;
    return next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.setHeader('WWW-Authenticate', 'Basic realm="Gift Tracker Instance"');
    return res.status(500).json({ error: 'Authentication service error' });
  }
};

// Apply authentication to all routes except overlay
app.use('/overlay.html', express.static(path.join(pub, 'overlay.html')));
app.use('/overlay.js', express.static(path.join(pub, 'overlay.js')));
app.use('/styles.css', express.static(path.join(pub, 'styles.css')));

// Protected routes
app.use(authenticateInstance);
app.use(express.static(pub));
app.get('/', (_, res) => res.sendFile(path.join(pub, 'index.html')));

/* ── API routes ───────────────────────────────────────────────────── */
app.post('/api/connect', async (_, res) => { await connectTikTok(); res.json({ ok: true }); });
app.post('/api/disconnect', async (_, res) => { await disconnectTikTok(); res.json({ ok: true }); });

app.get('/api/state', (_, res) => res.json(buildPayload()));

app.post('/api/groups', async (req, res) => {
  try {
    groups = req.body || {};
    await saveGiftGroups(INSTANCE_ID, groups);
    initCounters();
    broadcast();
    res.json({ ok: true });
  } catch (error) {
    console.error('Failed to save groups:', error);
    res.status(500).json({ error: 'Failed to save groups' });
  }
});


app.post('/api/counter', (req, res) => {
  const { groupId, diamonds = null, count = null } = req.body || {};
  if (!groups[groupId]) return res.status(404).json({ error: 'group not found' });

  counters[groupId] ??= { count: 0, diamonds: 0 };
  if (diamonds !== null) counters[groupId].diamonds = Number(diamonds);
  if (count !== null) counters[groupId].count = Number(count);

  broadcast();
  res.json({ ok: true });
});

app.post('/api/target', async (req, res) => {
  try {
    cfg.target = Number(req.body?.target) || cfg.target;
    await updateInstanceConfig(INSTANCE_ID, { ...instanceConfig, target: cfg.target });
    broadcast();
    res.json({ ok: true });
  } catch (error) {
    console.error('Failed to update target:', error);
    res.status(500).json({ error: 'Failed to update target' });
  }
});

app.post('/api/reset', (_, res) => {
  initCounters();
  uniques = new Set();
  viewers = 0;
  totalGifts = totalDiamonds = 0;
  broadcast();
  res.json({ ok: true });
});

// New Analytics API endpoints
app.get('/api/analytics/sessions', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const sessions = await getSessionHistory(INSTANCE_ID, parseInt(limit));
    res.json(sessions);
  } catch (error) {
    console.error('Failed to get session history:', error);
    res.status(500).json({ error: 'Failed to get session history' });
  }
});

app.get('/api/analytics/stats', async (req, res) => {
  try {
    const stats = await getSessionStats(INSTANCE_ID);
    res.json(stats);
  } catch (error) {
    console.error('Failed to get session stats:', error);
    res.status(500).json({ error: 'Failed to get session stats' });
  }
});

app.get('/api/analytics/gifts', async (req, res) => {
  try {
    const { sessionId } = req.query;
    const analytics = await getGiftAnalytics(INSTANCE_ID, sessionId);
    res.json(analytics);
  } catch (error) {
    console.error('Failed to get gift analytics:', error);
    res.status(500).json({ error: 'Failed to get gift analytics' });
  }
});

// Configuration API endpoints
app.get('/api/config', async (req, res) => {
  try {
    const config = await getInstanceConfig(INSTANCE_ID);
    res.json(config);
  } catch (error) {
    console.error('Failed to get instance config:', error);
    res.status(500).json({ error: 'Failed to get instance config' });
  }
});

app.put('/api/config', async (req, res) => {
  try {
    const config = req.body;
    await updateInstanceConfig(INSTANCE_ID, config);
    res.json({ ok: true });
  } catch (error) {
    console.error('Failed to update instance config:', error);
    res.status(500).json({ error: 'Failed to update instance config' });
  }
});

app.get('/api/overlay-styles', (req, res) => {
  const styles = [
    { id: 'classic', name: 'Classic Progress Bar', description: 'Traditional horizontal progress bar' },
    { id: 'circular', name: 'Circular Progress', description: 'Modern circular progress ring' },
    { id: 'dashboard', name: 'Dashboard Style', description: 'Detailed dashboard with stats' },
    { id: 'bubbles', name: 'Floating Bubbles', description: 'Animated bubble grid display' },
    { id: 'minimalist', name: 'Minimalist Text', description: 'Clean text-only display' },
    { id: 'showcase', name: 'Gift Showcase', description: 'Featured gift display with icon' }
  ];
  res.json(styles);
});

app.get('/api/themes', (req, res) => {
  const themes = [
    { id: 'dark', name: 'Dark Theme', colors: ['#ff6b6b', '#4ecdc4', '#45b7d1'] },
    { id: 'light', name: 'Light Theme', colors: ['#e74c3c', '#3498db', '#2ecc71'] },
    { id: 'neon', name: 'Neon Theme', colors: ['#00ffff', '#ff00ff', '#ffff00'] },
    { id: 'sunset', name: 'Sunset Theme', colors: ['#ff7b54', '#ff6b9d', '#c44569'] },
    { id: 'ocean', name: 'Ocean Theme', colors: ['#00d2ff', '#3a7bd5', '#00c9ff'] }
  ];
  res.json(themes);
});

app.get('/api/animations', (req, res) => {
  const animations = [
    { id: 'none', name: 'No Animation', description: 'Static display' },
    { id: 'normal', name: 'Normal', description: 'Flash on gift received' },
    { id: 'flash', name: 'Flash', description: 'Bright flash effect' },
    { id: 'bounce', name: 'Bounce', description: 'Bouncing animation' },
    { id: 'shake', name: 'Shake', description: 'Shaking effect' }
  ];
  res.json(animations);
});

/* ── Socket.IO initial emit ───────────────────────────────────────── */
io.on('connection', s => {
  s.emit('giftCatalog', giftCatalog);  // <── send current catalogue
  s.emit('update', buildPayload());
});

/* ── helpers ──────────────────────────────────────────────────────── */
function buildPayload() {
  return {
    counters,
    groups,
    target: cfg.target,
    stats: {
      liveStatus,
      username: USERNAME,
      liveViewers: viewers,
      uniqueJoins: uniques.size,
      totalGifts,
      totalDiamonds
    }
  };
}
function broadcast() { io.emit('update', buildPayload()); }

/* ── start server ─────────────────────────────────────────────────── */
async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    console.log('✅ Database initialized');

    // Initialize authentication service
    await initializeAuth();
    console.log('✅ Authentication service initialized');

    // Load instance data from database
    await loadInstanceData();

    // Start server
    http.listen(PORT, () => {
      console.log(`🚀 Gift Tracker Instance running on port ${PORT}`);
      console.log(`📊 Dashboard: http://localhost:${PORT}`);
      console.log(`🔐 Authentication: SQL-based (PostgreSQL)`);
      console.log(`📈 Analytics: Enabled with session tracking`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await disconnectTikTok();
  await closeAuth();
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await disconnectTikTok();
  await closeAuth();
  await closeDatabase();
  process.exit(0);
});

startServer();
