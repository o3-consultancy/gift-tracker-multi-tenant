#!/bin/bash

echo "🧪 Testing Instance Management - Gift Tracker Multi-Tenant System"
echo "================================================================="

echo "1️⃣ Checking system status..."
docker compose -f docker-compose.localhost.yml ps

echo ""
echo "2️⃣ Testing admin panel API..."
echo "   - Health check:"
curl -s http://localhost:3000/health || echo "❌ Health check failed"

echo ""
echo "   - Instances list:"
curl -s http://localhost:3000/api/instances | head -200 || echo "❌ Instances API failed"

echo ""
echo "3️⃣ Testing instance creation..."
echo "   Creating test instance..."

# Create a test instance
curl -s -X POST http://localhost:3000/api/instances \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-instance",
    "tiktokUsername": "test_user",
    "subdomain": "gift-tracker-test",
    "password": "test123"
  }' | head -200

echo ""
echo "4️⃣ Checking created instance..."
sleep 2
curl -s http://localhost:3000/api/instances | head -200

echo ""
echo "5️⃣ Testing instance management..."
echo "   - Starting instance:"
curl -s -X POST http://localhost:3000/api/instances/1/start | head -200

echo ""
echo "   - Stopping instance:"
curl -s -X POST http://localhost:3000/api/instances/1/stop | head -200

echo ""
echo "6️⃣ Checking container status..."
docker ps -a --filter "name=gift-tracker" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"

echo ""
echo "7️⃣ Testing instance deletion..."
echo "   Deleting test instance..."
curl -s -X DELETE http://localhost:3000/api/instances/1 | head -200

echo ""
echo "8️⃣ Final status check..."
curl -s http://localhost:3000/api/instances | head -200

echo ""
echo "✅ Instance management testing complete!"
echo ""
echo "🌐 Access URLs:"
echo "   Admin Panel: http://admin.localhost"
echo "   Traefik Dashboard: http://traefik.localhost"
echo "   Example Instance: http://gift-tracker-example.localhost"
echo ""
echo "📊 Credentials:"
echo "   Admin Panel: admin / admin123"
echo "   Example Instance: admin / example_password"
echo ""
echo "🔧 If you see any errors above, check the admin panel logs:"
echo "   docker compose -f docker-compose.localhost.yml logs admin-panel"
