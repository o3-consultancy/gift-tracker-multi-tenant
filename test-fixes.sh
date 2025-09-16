#!/bin/bash

echo "🧪 Testing Fixes for Gift Tracker Multi-Tenant System"
echo "====================================================="

echo "1️⃣ Checking container status..."
docker compose -f docker-compose.localhost.yml ps

echo ""
echo "2️⃣ Testing admin panel health..."
curl -s http://localhost:3000/health || echo "❌ Admin panel health check failed"

echo ""
echo "3️⃣ Testing admin panel access..."
curl -s -I http://admin.localhost | head -1 || echo "❌ Admin panel access failed"

echo ""
echo "4️⃣ Testing Traefik dashboard..."
curl -s -I http://traefik.localhost | head -1 || echo "❌ Traefik dashboard check failed"

echo ""
echo "5️⃣ Testing example instance..."
curl -s -I http://gift-tracker-example.localhost | head -1 || echo "❌ Example instance check failed"

echo ""
echo "6️⃣ Checking Docker images..."
docker images | grep gift-tracker

echo ""
echo "✅ Testing complete!"
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
echo "🔧 Next Steps:"
echo "   1. Open http://admin.localhost in your browser"
echo "   2. Try creating a new instance"
echo "   3. Check that URLs show .localhost instead of .o3consultancy.ae"
echo "   4. Verify Socket.IO is working (no CSP errors)"
