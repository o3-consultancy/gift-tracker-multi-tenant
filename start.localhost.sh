#!/bin/bash

# Gift Tracker Multi-Tenant Startup Script - Localhost Development
# This script sets up and starts the entire system for local testing

set -e

echo "🚀 Gift Tracker Multi-Tenant System Setup - Localhost Development"
echo "================================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p data/{instances,backups}
mkdir -p traefik/certificates
mkdir -p admin-panel/src/{public,views}

# Set proper permissions
echo "🔐 Setting permissions..."
chmod +x scripts/*.sh

# Copy localhost configuration
echo "📋 Setting up localhost configuration..."
cp config.localhost.env .env

# Create example instance data
echo "📊 Creating example instance data..."
mkdir -p data/instances/example
cat > data/instances/example/groups.json << EOF
{
  "roses": {
    "name": "Roses",
    "giftIds": [5655],
    "goal": 1000,
    "color": "#ff0066"
  }
}
EOF

cat > data/instances/example/config.json << EOF
{
  "target": 10000
}
EOF

# Build the images
echo "🔨 Building Docker images..."
docker compose -f docker-compose.localhost.yml build

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.localhost.yml down 2>/dev/null || true

# Start the system
echo "🚀 Starting the system..."
docker compose -f docker-compose.localhost.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15

# Check if services are running
echo "🔍 Checking service status..."
docker compose -f docker-compose.localhost.yml ps

# Display access information
echo ""
echo "✅ System started successfully!"
echo ""
echo "🌐 Access URLs (add to /etc/hosts if needed):"
echo "   Admin Panel: http://admin.localhost"
echo "   Traefik Dashboard: http://traefik.localhost"
echo "   Example Instance: http://gift-tracker-example.localhost"
echo ""
echo "📊 Default Credentials:"
echo "   Admin Panel: admin / admin123"
echo "   Example Instance: admin / example_password"
echo ""
echo "🛠️  Management Commands:"
echo "   View logs: docker compose -f docker-compose.localhost.yml logs -f"
echo "   Stop system: docker compose -f docker-compose.localhost.yml down"
echo "   Restart: docker compose -f docker-compose.localhost.yml restart"
echo ""
echo "📋 Next Steps:"
echo "   1. Add to /etc/hosts: 127.0.0.1 admin.localhost traefik.localhost gift-tracker-example.localhost"
echo "   2. Access the admin panel to create your first instance"
echo "   3. Test the gift tracker functionality"
echo ""
echo "🔧 Troubleshooting:"
echo "   - Check logs: docker compose -f docker-compose.localhost.yml logs [service-name]"
echo "   - Check health: curl http://localhost:8080/api/health"
echo "   - Restart services: docker compose -f docker-compose.localhost.yml restart [service-name]"
echo ""
echo "💡 Note: This is a development setup without SSL certificates."
echo "   For production, use the main docker-compose.yml with proper domain configuration."
