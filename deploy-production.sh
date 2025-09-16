#!/bin/bash

# Gift Tracker Multi-Tenant Production Deployment Script

echo "🚀 Gift Tracker Multi-Tenant Production Deployment"
echo "=================================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "❌ Please don't run this script as root"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "📁 Creating necessary directories..."
mkdir -p data/instances
mkdir -p data/backups
mkdir -p traefik/certificates

echo "🔐 Setting permissions..."
chmod 600 traefik/certificates/acme.json
chmod 755 data
chmod 755 data/instances
chmod 755 data/backups

echo "🔨 Building Docker images..."
docker build -t gift-tracker-instance:latest gift-tracker-instance/
docker build -t gift-tracker-admin-panel:latest admin-panel/

echo "🛑 Stopping existing containers..."
docker-compose down

echo "🚀 Starting the system..."
docker-compose up -d --build

echo "⏳ Waiting for services to start..."
sleep 10

echo "🔍 Checking service status..."
docker-compose ps

echo "✅ Deployment completed!"
echo ""
echo "🌐 Access URLs:"
echo "   Admin Panel: https://admin.o3-ttgifts.com"
echo "   Traefik Dashboard: https://traefik.o3-ttgifts.com"
echo "   Example Instance: https://gift-tracker-example.o3-ttgifts.com"
echo ""
echo "📊 Default Credentials:"
echo "   Admin Panel: admin / admin123"
echo "   Traefik Dashboard: admin / admin123"
echo "   Example Instance: admin / example_password"
echo ""
echo "🛠️  Management Commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop system: docker-compose down"
echo "   Restart: docker-compose restart"
echo ""
echo "📋 Next Steps:"
echo "   1. Wait for SSL certificates to be generated (may take a few minutes)"
echo "   2. Access the admin panel to create your first instance"
echo "   3. Test the gift tracker functionality"
echo ""
echo "🔧 Troubleshooting:"
echo "   - Check logs: docker-compose logs [service-name]"
echo "   - Check SSL certificates: ls -la traefik/certificates/"
echo "   - Restart services: docker-compose restart [service-name]"
