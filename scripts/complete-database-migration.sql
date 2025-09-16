-- Complete Database Migration Script for Gift Tracker Multi-Tenant
-- This script ensures all tables and columns exist with the correct structure

-- Start transaction
BEGIN;

-- Create sessions table if it doesn't exist
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

-- Create gift_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS gift_events (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    gift_id INTEGER NOT NULL,
    gift_name VARCHAR(100) NOT NULL,
    gift_value INTEGER NOT NULL,
    sender_name VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    repeat_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create viewer_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS viewer_events (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    viewer_id VARCHAR(100),
    event_type VARCHAR(20), -- 'join', 'leave', 'gift'
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create instance_configs table if it doesn't exist
CREATE TABLE IF NOT EXISTS instance_configs (
    id SERIAL PRIMARY KEY,
    instance_id INTEGER REFERENCES instances(id) ON DELETE CASCADE,
    overlay_style VARCHAR(50) DEFAULT 'classic',
    animation_speed VARCHAR(20) DEFAULT 'normal',
    theme VARCHAR(20) DEFAULT 'dark',
    custom_colors JSONB DEFAULT '{}',
    sound_enabled BOOLEAN DEFAULT false,
    auto_connect BOOLEAN DEFAULT false,
    target INTEGER DEFAULT 10000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create goals table if it doesn't exist
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

-- Fix gift_groups table structure
DO $$
BEGIN
    -- Drop and recreate gift_groups table with correct structure
    DROP TABLE IF EXISTS gift_groups CASCADE;
    
    CREATE TABLE gift_groups (
        id SERIAL PRIMARY KEY,
        instance_id INTEGER REFERENCES instances(id) ON DELETE CASCADE,
        group_id VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        gift_ids JSONB DEFAULT '[]',
        color VARCHAR(7) DEFAULT '#0cf',
        goal INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(instance_id, group_id)
    );
    
END $$;

-- Create indexes for performance
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
CREATE INDEX IF NOT EXISTS idx_gift_groups_group_id ON gift_groups(group_id);

-- Create or replace the update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for new tables (drop first if they exist)
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_instance_configs_updated_at ON instance_configs;
CREATE TRIGGER update_instance_configs_updated_at BEFORE UPDATE ON instance_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_goals_updated_at ON goals;
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gift_groups_updated_at ON gift_groups;
CREATE TRIGGER update_gift_groups_updated_at BEFORE UPDATE ON gift_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default instance configs for existing instances
INSERT INTO instance_configs (instance_id, target)
SELECT id, 10000 FROM instances
WHERE id NOT IN (SELECT instance_id FROM instance_configs);

-- Insert default gift groups for existing instances
INSERT INTO gift_groups (instance_id, group_id, name, gift_ids)
SELECT id, 'default', 'Default Group', '[]' FROM instances
WHERE id NOT IN (SELECT instance_id FROM gift_groups);

-- Commit transaction
COMMIT;

-- Show final table structures
SELECT 'sessions' as table_name, COUNT(*) as record_count FROM sessions
UNION ALL
SELECT 'gift_events' as table_name, COUNT(*) as record_count FROM gift_events
UNION ALL
SELECT 'viewer_events' as table_name, COUNT(*) as record_count FROM viewer_events
UNION ALL
SELECT 'instance_configs' as table_name, COUNT(*) as record_count FROM instance_configs
UNION ALL
SELECT 'goals' as table_name, COUNT(*) as record_count FROM goals
UNION ALL
SELECT 'gift_groups' as table_name, COUNT(*) as record_count FROM gift_groups;
