-- Gift Tracker Multi-Tenant Database Schema
-- This script initializes the database with required tables

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create instances table
CREATE TABLE IF NOT EXISTS instances (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    tiktok_username VARCHAR(100) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    port INTEGER UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'stopped',
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    config JSONB DEFAULT '{}',
    data_path VARCHAR(255) NOT NULL
);

-- Create logs table
CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    instance_id INTEGER REFERENCES instances(id),
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_instances_user_id ON instances(user_id);
CREATE INDEX IF NOT EXISTS idx_instances_status ON instances(status);
CREATE INDEX IF NOT EXISTS idx_logs_instance_id ON logs(instance_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password_hash, email, role) 
VALUES ('admin', '$2b$10$Fdw5jIrGATIQtqCibFXXV.CuN2BfKAHJDLmQhMBM.6vFk3NxAnsMu', 'admin@localhost', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Insert default settings
INSERT INTO settings (key, value) VALUES 
    ('domain', 'localhost'),
    ('base_port', '3001'),
    ('max_instances', '50'),
    ('auto_ssl', 'false'),
    ('backup_enabled', 'false'),
    ('backup_interval', '24')
ON CONFLICT (key) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instances_updated_at BEFORE UPDATE ON instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- GIFT TRACKER INSTANCE ENHANCEMENTS
-- ========================================

-- Session tracking table
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    instance_id INTEGER REFERENCES instances(id) ON DELETE CASCADE,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    total_gifts INTEGER DEFAULT 0,
    total_diamonds INTEGER DEFAULT 0,
    peak_viewers INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gift events (detailed tracking)
CREATE TABLE IF NOT EXISTS gift_events (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    gift_id INTEGER NOT NULL,
    gift_name VARCHAR(100) NOT NULL,
    gift_value INTEGER NOT NULL,
    sender_name VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    repeat_count INTEGER DEFAULT 1
);

-- Viewer events
CREATE TABLE IF NOT EXISTS viewer_events (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    viewer_id VARCHAR(100),
    event_type VARCHAR(20), -- 'join', 'leave', 'gift'
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Instance configurations
CREATE TABLE IF NOT EXISTS instance_configs (
    id SERIAL PRIMARY KEY,
    instance_id INTEGER REFERENCES instances(id) ON DELETE CASCADE,
    overlay_style VARCHAR(50) DEFAULT 'classic',
    animation_speed VARCHAR(20) DEFAULT 'normal',
    theme VARCHAR(20) DEFAULT 'dark',
    custom_colors JSONB DEFAULT '{}',
    sound_enabled BOOLEAN DEFAULT false,
    auto_connect BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Goals and targets
CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    instance_id INTEGER REFERENCES instances(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    target_type VARCHAR(20) NOT NULL, -- 'diamonds', 'gifts', 'viewers'
    target_value INTEGER NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    achieved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gift groups (persistent storage)
CREATE TABLE IF NOT EXISTS gift_groups (
    id SERIAL PRIMARY KEY,
    instance_id INTEGER REFERENCES instances(id) ON DELETE CASCADE,
    group_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    gift_ids INTEGER[] DEFAULT '{}',
    color VARCHAR(7) DEFAULT '#0cf',
    goal INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(instance_id, group_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_instance_id ON sessions(instance_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_gift_events_session_id ON gift_events(session_id);
CREATE INDEX IF NOT EXISTS idx_gift_events_timestamp ON gift_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_viewer_events_session_id ON viewer_events(session_id);
CREATE INDEX IF NOT EXISTS idx_viewer_events_timestamp ON viewer_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_instance_configs_instance_id ON instance_configs(instance_id);
CREATE INDEX IF NOT EXISTS idx_goals_instance_id ON goals(instance_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_gift_groups_instance_id ON gift_groups(instance_id);

-- Create triggers for new tables
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instance_configs_updated_at BEFORE UPDATE ON instance_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gift_groups_updated_at BEFORE UPDATE ON gift_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
