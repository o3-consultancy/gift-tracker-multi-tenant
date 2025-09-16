#!/bin/bash

# Script to clean up orphaned instances that can't be deleted due to foreign key constraints
echo "🧹 Cleaning up orphaned instances with foreign key constraints..."

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo "📊 Current instances in database:"
docker exec -i gift-tracker-postgres psql -U admin -d gift_tracker -c "SELECT id, name, port, status, created_at FROM instances ORDER BY id;"

echo "📋 Logs for each instance:"
docker exec -i gift-tracker-postgres psql -U admin -d gift_tracker -c "SELECT instance_id, COUNT(*) as log_count FROM logs GROUP BY instance_id ORDER BY instance_id;"

echo "🧽 Cleaning up logs for orphaned instances..."
# Delete logs for instances that don't have corresponding containers
docker exec -i gift-tracker-postgres psql -U admin -d gift_tracker -c "
DELETE FROM logs 
WHERE instance_id IN (
    SELECT i.id 
    FROM instances i 
    WHERE NOT EXISTS (
        SELECT 1 FROM docker_containers dc 
        WHERE dc.name = 'gift-tracker-' || i.name
    )
);"

echo "🗑️ Deleting orphaned instances..."
# Delete instances that don't have corresponding containers
docker exec -i gift-tracker-postgres psql -U admin -d gift_tracker -c "
DELETE FROM instances 
WHERE id IN (
    SELECT i.id 
    FROM instances i 
    WHERE NOT EXISTS (
        SELECT 1 FROM docker_containers dc 
        WHERE dc.name = 'gift-tracker-' || i.name
    )
);"

echo "📊 Remaining instances after cleanup:"
docker exec -i gift-tracker-postgres psql -U admin -d gift_tracker -c "SELECT id, name, port, status, created_at FROM instances ORDER BY id;"

echo "✅ Orphaned instances cleanup completed!"
echo "💡 You can now try deleting instances from the admin panel again"
