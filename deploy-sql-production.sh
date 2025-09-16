#!/bin/bash

# Gift Tracker Multi-Tenant SQL Production Deployment Script

echo "🚀 Gift Tracker Multi-Tenant SQL Production Deployment"
echo "====================================================="

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

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from config.env..."
    cp config.env .env
    echo "⚠️  Please edit .env file with your production settings before continuing"
    echo "   Important settings to update:"
    echo "   - DOMAIN=your-domain.com"
    echo "   - ACME_EMAIL=your-email@domain.com"
    echo "   - DB_PASSWORD=your-secure-database-password"
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
chmod 755 traefik/certificates

echo "📦 Building gift-tracker-instance Docker image..."
docker build -t gift-tracker-instance:latest gift-tracker-instance/

echo "🗄️ Starting PostgreSQL database..."
docker-compose -f docker-compose.prod.yml up -d postgres

echo "⏳ Waiting for database to be ready..."
sleep 10

# Check if database is ready
echo "🔍 Checking database connection..."
for i in {1..30}; do
    if docker exec gift-tracker-postgres pg_isready -U admin -d gift_tracker > /dev/null 2>&1; then
        echo "✅ Database is ready"
        break
    fi
    echo "⏳ Waiting for database... ($i/30)"
    sleep 2
done

echo "⬆️ Bringing up all Docker Compose services..."
docker-compose -f docker-compose.prod.yml up -d --build

echo "⏳ Waiting for services to start..."
sleep 15

echo "🔍 Checking service status..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "✅ SQL Production deployment complete!"
echo ""
echo "📊 Access URLs:"
echo "   Admin Panel: https://admin.$(grep DOMAIN .env | cut -d'=' -f2)"
echo "   Traefik Dashboard: https://traefik.$(grep DOMAIN .env | cut -d'=' -f2)"
echo "   Example Instance: https://gift-tracker-example.$(grep DOMAIN .env | cut -d'=' -f2)"
echo ""
echo "🔐 Default Credentials:"
echo "   Admin Panel: admin / admin123"
echo "   Example Instance: admin / example_password"
echo ""
echo "🗄️ Database Information:"
echo "   Host: localhost (from host machine)"
echo "   Port: 5432 (if exposed)"
echo "   Database: gift_tracker"
echo "   Username: admin"
echo "   Password: $(grep DB_PASSWORD .env | cut -d'=' -f2)"
echo ""
echo "🛠️ Management Commands:"
echo "   View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "   Stop system: docker-compose -f docker-compose.prod.yml down"
echo "   Restart: docker-compose -f docker-compose.prod.yml restart"
echo "   Database access: docker exec -it gift-tracker-postgres psql -U admin -d gift_tracker"
echo ""
echo "📋 Next Steps:"
echo "   1. Test authentication with: ./test-sql-auth.sh"
echo "   2. Create your first instance via the admin panel"
echo "   3. Monitor logs for any issues"
echo ""
echo "🔧 Troubleshooting:"
echo "   - Check logs: docker-compose -f docker-compose.prod.yml logs [service-name]"
echo "   - Check database: docker exec -it gift-tracker-postgres psql -U admin -d gift_tracker"
echo "   - Restart services: docker-compose -f docker-compose.prod.yml restart [service-name]"
