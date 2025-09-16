#!/bin/bash

# Test script for localhost setup
echo "🧪 Testing Gift Tracker Multi-Tenant System - Localhost"
echo "======================================================"

# Test 1: Check if containers are running
echo "1️⃣ Checking container status..."
docker compose -f docker-compose.localhost.yml ps

echo ""
echo "2️⃣ Testing admin panel health..."
curl -s http://localhost:3000/health | jq . || echo "Admin panel health check failed"

echo ""
echo "3️⃣ Testing Traefik dashboard..."
curl -s http://localhost:8080/api/overview | jq . || echo "Traefik dashboard check failed"

echo ""
echo "4️⃣ Testing example instance..."
curl -s -u admin:example_password http://localhost:3000/api/state | jq . || echo "Example instance check failed"

echo ""
echo "5️⃣ Testing admin panel access..."
curl -s http://admin.localhost | head -20 || echo "Admin panel access failed"

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
