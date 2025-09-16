-- Database Schema Fix Script for Gift Tracker Multi-Tenant
-- This script fixes schema mismatches and adds missing columns

-- Check if gift_groups table has the correct structure
-- If it doesn't have group_id column, we need to add it

-- First, let's check the current structure and add missing columns if needed
DO $$
BEGIN
    -- Add group_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'gift_groups' AND column_name = 'group_id'
    ) THEN
        ALTER TABLE gift_groups ADD COLUMN group_id VARCHAR(50);
        
        -- Update existing records to have group_id = id
        UPDATE gift_groups SET group_id = id::text WHERE group_id IS NULL;
        
        -- Make group_id NOT NULL after updating existing records
        ALTER TABLE gift_groups ALTER COLUMN group_id SET NOT NULL;
        
        -- Add unique constraint
        ALTER TABLE gift_groups ADD CONSTRAINT gift_groups_instance_group_unique UNIQUE(instance_id, group_id);
    END IF;
    
    -- Add name column if it doesn't exist (rename from group_name if needed)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'gift_groups' AND column_name = 'name'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'gift_groups' AND column_name = 'group_name'
        ) THEN
            -- Rename group_name to name
            ALTER TABLE gift_groups RENAME COLUMN group_name TO name;
        ELSE
            -- Add name column
            ALTER TABLE gift_groups ADD COLUMN name VARCHAR(100) NOT NULL DEFAULT 'Group';
        END IF;
    END IF;
    
    -- Add color column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'gift_groups' AND column_name = 'color'
    ) THEN
        ALTER TABLE gift_groups ADD COLUMN color VARCHAR(7) DEFAULT '#0cf';
    END IF;
    
    -- Add goal column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'gift_groups' AND column_name = 'goal'
    ) THEN
        ALTER TABLE gift_groups ADD COLUMN goal INTEGER DEFAULT 0;
    END IF;
    
    -- Ensure gift_ids is JSONB if it exists, or create it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'gift_groups' AND column_name = 'gift_ids'
    ) THEN
        ALTER TABLE gift_groups ADD COLUMN gift_ids JSONB DEFAULT '[]';
    END IF;
    
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_gift_groups_instance_id ON gift_groups(instance_id);
CREATE INDEX IF NOT EXISTS idx_gift_groups_group_id ON gift_groups(group_id);

-- Update any existing records that might have NULL values
UPDATE gift_groups SET 
    name = COALESCE(name, 'Group ' || id),
    color = COALESCE(color, '#0cf'),
    goal = COALESCE(goal, 0),
    gift_ids = COALESCE(gift_ids, '[]'::jsonb)
WHERE name IS NULL OR color IS NULL OR goal IS NULL OR gift_ids IS NULL;

-- Show the final structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'gift_groups' 
ORDER BY ordinal_position;
