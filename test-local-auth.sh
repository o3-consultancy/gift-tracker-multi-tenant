#!/bin/bash

# Test Local Authentication Script for Gift Tracker Multi-Tenant

echo "🔐 Testing Local Authentication for Gift Tracker Multi-Tenant"
echo "============================================================"

# Check if localhost system is running
echo ""
echo "📊 Checking if localhost system is running..."
if ! docker compose -f docker-compose.localhost.yml ps | grep -q "Up"; then
    echo "❌ Localhost system is not running. Please start it first:"
    echo "   ./start.localhost.sh"
    exit 1
fi

echo "✅ Localhost system is running"

# Test admin panel authentication
echo ""
echo "📊 Testing Admin Panel Authentication..."
echo "URL: http://admin.localhost"
echo "Expected: Username: admin, Password: admin123"

# Test with curl
echo ""
echo "Testing with curl (should return 200 if auth works):"
curl -u admin:admin123 -I http://admin.localhost 2>/dev/null | head -1

# Test Traefik dashboard authentication
echo ""
echo "📈 Testing Traefik Dashboard Authentication..."
echo "URL: http://traefik.localhost"
echo "Expected: Username: admin, Password: admin123"

# Test with curl
echo ""
echo "Testing with curl (should return 200 if auth works):"
curl -u admin:admin123 -I http://traefik.localhost 2>/dev/null | head -1

# Test example instance authentication
echo ""
echo "🎁 Testing Example Instance Authentication..."
echo "URL: http://gift-tracker-example.localhost"
echo "Expected: Username: admin, Password: admin123 (from SQL database)"

# Test with curl
echo ""
echo "Testing with curl (should return 200 if auth works):"
curl -u admin:admin123 -I http://gift-tracker-example.localhost 2>/dev/null | head -1

# Test database connection
echo ""
echo "🗄️ Testing Database Connection..."
echo "Testing PostgreSQL connection..."

# Test if we can connect to the database
if docker exec gift-tracker-postgres-localhost psql -U admin -d gift_tracker -c "SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
    echo "✅ Database connection successful"
    
    # Show user count
    USER_COUNT=$(docker exec gift-tracker-postgres-localhost psql -U admin -d gift_tracker -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
    echo "📊 Total users in database: $USER_COUNT"
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
curl -u admin:admin123 -s http://admin.localhost/api/users | head -c 100
echo "..."

echo ""
echo "✅ Local authentication tests complete!"
echo ""
echo "📋 Summary:"
echo "- Check the HTTP status codes above (200 OK indicates success)"
echo "- If you see 401 Unauthorized, there's still an issue with the auth configuration"
echo "- If database tests fail, check PostgreSQL container logs"
echo ""
echo "🔧 Troubleshooting:"
echo "- Check logs: docker compose -f docker-compose.localhost.yml logs"
echo "- Restart services: docker compose -f docker-compose.localhost.yml restart"
echo "- Check database: docker exec -it gift-tracker-postgres-localhost psql -U admin -d gift_tracker"
