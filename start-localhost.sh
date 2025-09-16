#!/bin/bash

# Start Localhost Development Environment for Gift Tracker Multi-Tenant

echo "🚀 Starting Gift Tracker Multi-Tenant Local Development Environment"
echo "=================================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is running"

# Create necessary directories
echo ""
echo "📁 Creating necessary directories..."
mkdir -p data/instances/example
mkdir -p traefik/certificates
mkdir -p traefik/dynamic

# Set permissions
chmod 755 data
chmod 755 traefik/certificates
chmod 755 traefik/dynamic

echo "✅ Directories created"

# Build the gift-tracker-instance image
echo ""
echo "🔨 Building gift-tracker-instance Docker image..."
if docker build -t gift-tracker-instance:latest gift-tracker-instance/; then
    echo "✅ Gift tracker instance image built successfully"
else
    echo "❌ Failed to build gift-tracker-instance image"
    exit 1
fi

# Start the services
echo ""
echo "🐳 Starting Docker Compose services..."
if docker compose -f docker-compose.localhost.yml up -d; then
    echo "✅ Services started successfully"
else
    echo "❌ Failed to start services"
    exit 1
fi

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo ""
echo "📊 Service Status:"
docker compose -f docker-compose.localhost.yml ps

# Test database connection
echo ""
echo "🗄️ Testing database connection..."
if docker exec gift-tracker-postgres-localhost psql -U admin -d gift_tracker -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database is ready"
else
    echo "⚠️ Database might still be starting up..."
fi

echo ""
echo "🎉 Local development environment is ready!"
echo ""
echo "📋 Available Services:"
echo "- Admin Panel: http://admin.localhost (admin/admin123)"
echo "- Traefik Dashboard: http://traefik.localhost (admin/admin123)"
echo "- Example Instance: http://gift-tracker-example.localhost (admin/admin123)"
echo "- PostgreSQL: localhost:5432 (admin/admin123)"
echo ""
echo "🔧 Useful Commands:"
echo "- View logs: docker compose -f docker-compose.localhost.yml logs -f"
echo "- Stop services: docker compose -f docker-compose.localhost.yml down"
echo "- Restart services: docker compose -f docker-compose.localhost.yml restart"
echo "- Test authentication: ./test-local-auth.sh"
echo ""
echo "📖 For more information, see README-SQL-AUTH.md"
