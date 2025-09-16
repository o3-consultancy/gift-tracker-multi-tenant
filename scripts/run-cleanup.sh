#!/bin/bash

# Database Cleanup Script for Gift Tracker Multi-Tenant
# This script cleans up orphaned records that violate foreign key constraints

set -e

echo "🧹 Starting database cleanup..."

# Check if we're in the right directory
if [ ! -f "scripts/cleanup-orphaned-records.sql" ]; then
    echo "❌ Error: cleanup-orphaned-records.sql not found. Please run this script from the project root."
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

echo "📊 Running database cleanup..."

# Run the cleanup
docker exec -i gift-tracker-postgres psql -U admin -d gift_tracker < scripts/cleanup-orphaned-records.sql

if [ $? -eq 0 ]; then
    echo "✅ Database cleanup completed successfully!"
    echo ""
    echo "📋 Summary:"
    echo "- Removed orphaned instance_configs records"
    echo "- Removed orphaned gift_groups records"
    echo "- Removed orphaned goals records"
    echo "- Removed orphaned sessions records"
    echo "- Removed orphaned gift_events records"
    echo "- Removed orphaned viewer_events records"
    echo "- Removed orphaned logs records"
    echo ""
    echo "🔄 You can now try creating instances again."
else
    echo "❌ Database cleanup failed!"
    exit 1
fi
