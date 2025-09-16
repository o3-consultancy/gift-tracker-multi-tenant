-- Database Migration Script for Gift Tracker Multi-Tenant
-- This script adds the new tables required for Phase 1 improvements

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    instance_id INTEGER REFERENCES instances(id),
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

-- Create gift_events table
CREATE TABLE IF NOT EXISTS gift_events (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id),
    gift_id INTEGER NOT NULL,
    gift_name VARCHAR(100) NOT NULL,
    gift_value INTEGER NOT NULL,
    sender_name VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    repeat_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create viewer_events table
CREATE TABLE IF NOT EXISTS viewer_events (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id),
    viewer_id VARCHAR(100),
    event_type VARCHAR(20), -- 'join', 'leave', 'gift'
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create instance_configs table
CREATE TABLE IF NOT EXISTS instance_configs (
    id SERIAL PRIMARY KEY,
    instance_id INTEGER REFERENCES instances(id),
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

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    instance_id INTEGER REFERENCES instances(id),
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

-- Create gift_groups table
CREATE TABLE IF NOT EXISTS gift_groups (
    id SERIAL PRIMARY KEY,
    instance_id INTEGER REFERENCES instances(id),
    group_name VARCHAR(100) NOT NULL,
    gift_ids JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- Create triggers for new tables
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instance_configs_updated_at BEFORE UPDATE ON instance_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gift_groups_updated_at BEFORE UPDATE ON gift_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default instance configs for existing instances
INSERT INTO instance_configs (instance_id, target)
SELECT id, 10000 FROM instances
WHERE id NOT IN (SELECT instance_id FROM instance_configs);

-- Insert default gift groups for existing instances
INSERT INTO gift_groups (instance_id, group_name, gift_ids)
SELECT id, 'default', '[]' FROM instances
WHERE id NOT IN (SELECT instance_id FROM gift_groups);

COMMIT;
