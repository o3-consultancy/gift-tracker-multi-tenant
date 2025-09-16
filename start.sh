#!/bin/bash

# Gift Tracker Multi-Tenant Startup Script
# This script sets up and starts the entire system

set -e

echo "🚀 Gift Tracker Multi-Tenant System Setup"
echo "=========================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
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

# Check if .env exists, if not copy from example
if [ ! -f .env ]; then
    if [ -f config.env ]; then
        echo "📋 Creating .env from config.env..."
        cp config.env .env
        echo "⚠️  Please edit .env file with your actual configuration before continuing."
        echo "   Especially update:"
        echo "   - DOMAIN=your-domain.com"
        echo "   - ACME_EMAIL=your-email@domain.com"
        echo "   - ADMIN_PASSWORD=your-secure-password"
        echo ""
        read -p "Press Enter after updating .env file..."
    else
        echo "❌ No .env or config.env file found. Please create one first."
        exit 1
    fi
fi

# Build the gift tracker instance image
echo "🔨 Building gift tracker instance image..."
docker build -t gift-tracker-instance:latest ./gift-tracker-instance/

# Start the system
echo "🚀 Starting the system..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
echo "🔍 Checking service status..."
docker-compose ps

# Display access information
echo ""
echo "✅ System started successfully!"
echo ""
echo "🌐 Access URLs:"
echo "   Admin Panel: https://admin.o3consultancy.ae"
echo "   Traefik Dashboard: https://traefik.o3consultancy.ae"
echo ""
echo "📊 Default Credentials:"
echo "   Admin Panel: admin / admin123"
echo "   (Change this in .env file)"
echo ""
echo "🛠️  Management Commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop system: docker-compose down"
echo "   Restart: docker-compose restart"
echo ""
echo "📋 Next Steps:"
echo "   1. Configure your DNS to point *.o3consultancy.ae to this server"
echo "   2. Access the admin panel to create your first instance"
echo "   3. Test SSL certificate generation"
echo ""
echo "🔧 Troubleshooting:"
echo "   - Check logs: docker-compose logs [service-name]"
echo "   - Check health: curl http://localhost:8080/api/health"
echo "   - Restart services: docker-compose restart [service-name]"
