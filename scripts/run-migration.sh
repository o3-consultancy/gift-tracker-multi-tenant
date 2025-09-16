#!/bin/bash

# Database Migration Script for Gift Tracker Multi-Tenant
# This script runs the database migration to add new tables

set -e

echo "🔄 Starting database migration..."

# Check if we're in the right directory
if [ ! -f "scripts/migrate-database.sql" ]; then
    echo "❌ Error: migrate-database.sql not found. Please run this script from the project root."
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

echo "📊 Running database migration..."

# Run the migration
docker exec -i gift-tracker-postgres psql -U admin -d gift_tracker < scripts/migrate-database.sql

if [ $? -eq 0 ]; then
    echo "✅ Database migration completed successfully!"
    echo "🔄 Restarting services to apply changes..."
    
    # Restart the services to pick up the new schema
    docker-compose -f docker-compose.prod.yml restart admin-panel
    docker-compose -f docker-compose.prod.yml restart gift-tracker-example
    
    echo "✅ Services restarted successfully!"
    echo "🎉 Migration complete! You can now create new instances."
else
    echo "❌ Database migration failed. Please check the error messages above."
    exit 1
fi
