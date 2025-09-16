#!/bin/bash

# Cleanup script for orphaned instances and port conflicts
echo "🧹 Cleaning up orphaned instances and port conflicts..."

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Connect to the database and clean up
echo "📊 Connecting to PostgreSQL database..."

# Show current instances
echo "📊 Current instances:"
docker exec -i gift-tracker-postgres psql -U admin -d gift_tracker -c "SELECT id, name, port, status, created_at FROM instances ORDER BY port;"

# Find duplicate ports
echo "🔍 Duplicate ports:"
docker exec -i gift-tracker-postgres psql -U admin -d gift_tracker -c "SELECT port, COUNT(*) as count FROM instances GROUP BY port HAVING COUNT(*) > 1;"

# Clean up any instances with duplicate ports (keep the oldest one)
echo "🧽 Cleaning up duplicate ports..."
docker exec -i gift-tracker-postgres psql -U admin -d gift_tracker -c "
WITH duplicates AS (
    SELECT id, port, 
           ROW_NUMBER() OVER (PARTITION BY port ORDER BY created_at) as rn
    FROM instances
)
DELETE FROM instances 
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);"

# Show remaining instances
echo "📊 Remaining instances after cleanup:"
docker exec -i gift-tracker-postgres psql -U admin -d gift_tracker -c "SELECT id, name, port, status, created_at FROM instances ORDER BY port;"

# Show next available ports
echo "🔢 Next available ports:"
docker exec -i gift-tracker-postgres psql -U admin -d gift_tracker -c "
WITH used_ports AS (
    SELECT port FROM instances WHERE port IS NOT NULL
    UNION
    SELECT 3001 as port -- gift-tracker-example port
)
SELECT generate_series(3001, 3010) as port
WHERE generate_series(3001, 3010) NOT IN (SELECT port FROM used_ports)
ORDER BY port
LIMIT 5;"

echo "✅ Cleanup completed!"
echo "💡 You can now try creating new instances again"
