#!/bin/bash

# Test SQL Authentication Script for Gift Tracker Multi-Tenant

echo "🔐 Testing SQL Authentication for Gift Tracker Multi-Tenant"
echo "=========================================================="

# Check if production system is running
echo ""
echo "📊 Checking if production system is running..."
if ! docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "❌ Production system is not running. Please start it first:"
    echo "   ./deploy-sql-production.sh"
    exit 1
fi

echo "✅ Production system is running"

# Get domain from .env file
DOMAIN=$(grep DOMAIN .env | cut -d'=' -f2 2>/dev/null || echo "o3-ttgifts.com")

# Test admin panel authentication
echo ""
echo "📊 Testing Admin Panel Authentication..."
echo "URL: https://admin.${DOMAIN}"
echo "Expected: Username: admin, Password: admin123"

# Test with curl
echo ""
echo "Testing with curl (should return 200 if auth works):"
curl -u admin:admin123 -I https://admin.${DOMAIN} 2>/dev/null | head -1

# Test Traefik dashboard authentication
echo ""
echo "📈 Testing Traefik Dashboard Authentication..."
echo "URL: https://traefik.${DOMAIN}"
echo "Expected: Username: admin, Password: admin123"

# Test with curl
echo ""
echo "Testing with curl (should return 200 if auth works):"
curl -u admin:admin123 -I https://traefik.${DOMAIN} 2>/dev/null | head -1

# Test example instance authentication
echo ""
echo "🎁 Testing Example Instance Authentication..."
echo "URL: https://gift-tracker-example.${DOMAIN}"
echo "Expected: Username: admin, Password: admin123 (from SQL database)"

# Test with curl
echo ""
echo "Testing with curl (should return 200 if auth works):"
curl -u admin:admin123 -I https://gift-tracker-example.${DOMAIN} 2>/dev/null | head -1

# Test database connection
echo ""
echo "🗄️ Testing Database Connection..."
echo "Testing PostgreSQL connection..."

# Test if we can connect to the database
if docker exec gift-tracker-postgres psql -U admin -d gift_tracker -c "SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
    echo "✅ Database connection successful"
    
    # Show user count
    USER_COUNT=$(docker exec gift-tracker-postgres psql -U admin -d gift_tracker -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
    echo "📊 Total users in database: $USER_COUNT"
    
    # Show users
    echo "👥 Users in database:"
    docker exec gift-tracker-postgres psql -U admin -d gift_tracker -c "SELECT id, username, email, role, is_active FROM users;"
else
    echo "❌ Database connection failed"
fi

# Test user management API
echo ""
echo "👥 Testing User Management API..."
echo "Testing /api/users endpoint..."

# Test with curl
echo ""
echo "Testing with curl (should return user list if auth works):"
curl -u admin:admin123 -s https://admin.${DOMAIN}/api/users | head -c 100
echo "..."

# Test instance management API
echo ""
echo "🎁 Testing Instance Management API..."
echo "Testing /api/instances endpoint..."

# Test with curl
echo ""
echo "Testing with curl (should return instance list if auth works):"
curl -u admin:admin123 -s https://admin.${DOMAIN}/api/instances | head -c 100
echo "..."

echo ""
echo "✅ SQL authentication tests complete!"
echo ""
echo "📋 Summary:"
echo "- Check the HTTP status codes above (200 OK indicates success)"
echo "- If you see 401 Unauthorized, there's still an issue with the auth configuration"
echo "- If database tests fail, check PostgreSQL container logs"
echo ""
echo "🔧 Troubleshooting:"
echo "- Check logs: docker-compose -f docker-compose.prod.yml logs"
echo "- Restart services: docker-compose -f docker-compose.prod.yml restart"
echo "- Check database: docker exec -it gift-tracker-postgres psql -U admin -d gift_tracker"
echo "- Check SSL certificates: docker-compose -f docker-compose.prod.yml logs traefik"
