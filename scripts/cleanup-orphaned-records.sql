-- Cleanup script for orphaned records in the database
-- This script removes orphaned records that violate foreign key constraints

-- Clean up orphaned instance_configs records
DELETE FROM instance_configs 
WHERE instance_id NOT IN (SELECT id FROM instances);

-- Clean up orphaned gift_groups records
DELETE FROM gift_groups 
WHERE instance_id NOT IN (SELECT id FROM instances);

-- Clean up orphaned goals records
DELETE FROM goals 
WHERE instance_id NOT IN (SELECT id FROM instances);

-- Clean up orphaned sessions records
DELETE FROM sessions 
WHERE instance_id NOT IN (SELECT id FROM instances);

-- Clean up orphaned gift_events records
DELETE FROM gift_events 
WHERE session_id NOT IN (SELECT id FROM sessions);

-- Clean up orphaned viewer_events records
DELETE FROM viewer_events 
WHERE session_id NOT IN (SELECT id FROM sessions);

-- Clean up orphaned logs records
DELETE FROM logs 
WHERE instance_id NOT IN (SELECT id FROM instances);

-- Show remaining records count
SELECT 
    'instances' as table_name, COUNT(*) as count FROM instances
UNION ALL
SELECT 
    'instance_configs' as table_name, COUNT(*) as count FROM instance_configs
UNION ALL
SELECT 
    'gift_groups' as table_name, COUNT(*) as count FROM gift_groups
UNION ALL
SELECT 
    'goals' as table_name, COUNT(*) as count FROM goals
UNION ALL
SELECT 
    'sessions' as table_name, COUNT(*) as count FROM sessions
UNION ALL
SELECT 
    'gift_events' as table_name, COUNT(*) as count FROM gift_events
UNION ALL
SELECT 
    'viewer_events' as table_name, COUNT(*) as count FROM viewer_events
UNION ALL
SELECT 
    'logs' as table_name, COUNT(*) as count FROM logs;
