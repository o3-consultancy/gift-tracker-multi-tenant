#!/bin/bash

# Complete Database Migration Script for Gift Tracker Multi-Tenant
# This script runs the complete database migration to fix all schema issues

set -e

echo "🔄 Starting complete database migration..."

# Check if we're in the right directory
if [ ! -f "scripts/complete-database-migration.sql" ]; then
    echo "❌ Error: complete-database-migration.sql not found. Please run this script from the project root."
    exit 1
fi

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Check if the postgres container is running
if ! docker ps | grep -q "gift-tracker-postgres"; then
    echo "❌ Error: PostgreSQL container is not running. Please start the system first."
    echo "Run: docker-compose -f docker-compose.prod.yml up -d"
    exit 1
fi

echo "📊 Running complete database migration..."

# Run the complete migration
docker exec -i gift-tracker-postgres psql -U admin -d gift_tracker < scripts/complete-database-migration.sql

if [ $? -eq 0 ]; then
    echo "✅ Complete database migration completed successfully!"
    echo "🔄 Restarting services to apply changes..."
    
    # Restart the services to pick up the new schema
    docker-compose -f docker-compose.prod.yml restart admin-panel
    docker-compose -f docker-compose.prod.yml restart gift-tracker-example
    
    echo "✅ Services restarted successfully!"
    echo "🎉 Complete migration finished! You can now create new instances."
    echo ""
    echo "📋 What was fixed:"
    echo "- Fixed gift_groups table structure"
    echo "- Added missing columns (group_id, name, color, goal)"
    echo "- Created all required tables"
    echo "- Added proper indexes and constraints"
    echo "- Fixed user creation duplicate issue"
    echo "- Updated database service to handle schema differences"
else
    echo "❌ Complete database migration failed. Please check the error messages above."
    exit 1
fi
