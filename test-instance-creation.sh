#!/bin/bash

echo "🧪 Testing Instance Creation and Management"
echo "==========================================="

echo "1️⃣ Checking system status..."
docker compose -f docker-compose.localhost.yml ps

echo ""
echo "2️⃣ Testing admin panel API..."
echo "   - Health check:"
curl -s http://localhost:3000/health || echo "❌ Health check failed"

echo ""
echo "   - Instances list (should be empty):"
curl -s http://localhost:3000/api/instances || echo "❌ Instances API failed"

echo ""
echo "3️⃣ Creating a test instance..."
echo "   Creating instance: test-instance-1"

# Create a test instance
RESPONSE=$(curl -s -X POST http://localhost:3000/api/instances \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-instance-1",
    "tiktokUsername": "test_user_1",
    "subdomain": "gift-tracker-test-1",
    "password": "test123"
  }')

echo "Response: $RESPONSE"

echo ""
echo "4️⃣ Checking created instance..."
sleep 3
curl -s http://localhost:3000/api/instances

echo ""
echo "5️⃣ Checking container status..."
docker ps -a --filter "name=gift-tracker" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"

echo ""
echo "6️⃣ Testing instance start..."
echo "   Starting instance..."
curl -s -X POST http://localhost:3000/api/instances/1/start

echo ""
echo "7️⃣ Testing instance stop..."
echo "   Stopping instance..."
curl -s -X POST http://localhost:3000/api/instances/1/stop

echo ""
echo "8️⃣ Testing instance deletion..."
echo "   Deleting instance..."
curl -s -X DELETE http://localhost:3000/api/instances/1

echo ""
echo "9️⃣ Final status check..."
curl -s http://localhost:3000/api/instances

echo ""
echo "🔟 Container cleanup check..."
docker ps -a --filter "name=gift-tracker" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"

echo ""
echo "✅ Instance management testing complete!"
echo ""
echo "If you see any errors above, check the admin panel logs:"
echo "docker compose -f docker-compose.localhost.yml logs admin-panel"
