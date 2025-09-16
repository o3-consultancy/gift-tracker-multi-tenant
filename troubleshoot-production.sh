#!/bin/bash

# Gift Tracker Multi-Tenant Production Troubleshooting Script

echo "🔧 Gift Tracker Multi-Tenant Troubleshooting"
echo "============================================="

echo "📊 System Status:"
echo "=================="
docker-compose ps

echo ""
echo "🌐 Network Status:"
echo "=================="
docker network ls | grep gift-tracker

echo ""
echo "📦 Container Images:"
echo "===================="
docker images | grep gift-tracker

echo ""
echo "🔐 SSL Certificates:"
echo "===================="
if [ -f "traefik/certificates/acme.json" ]; then
    echo "✅ ACME file exists"
    ls -la traefik/certificates/
else
    echo "❌ ACME file missing"
fi

echo ""
echo "📋 Recent Logs (last 20 lines):"
echo "==============================="
echo "Traefik logs:"
docker-compose logs --tail=20 traefik

echo ""
echo "Admin Panel logs:"
docker-compose logs --tail=20 admin-panel

echo ""
echo "🔍 Traefik Configuration Test:"
echo "=============================="
docker-compose exec traefik traefik version

echo ""
echo "🌍 DNS Resolution Test:"
echo "======================="
echo "Testing admin.o3-ttgifts.com:"
nslookup admin.o3-ttgifts.com || echo "❌ DNS resolution failed"

echo ""
echo "Testing traefik.o3-ttgifts.com:"
nslookup traefik.o3-ttgifts.com || echo "❌ DNS resolution failed"

echo ""
echo "🔧 Common Fixes:"
echo "================"
echo "1. If SSL certificates are missing:"
echo "   - Wait 5-10 minutes for Let's Encrypt to generate certificates"
echo "   - Check DNS is pointing to this server"
echo "   - Verify ports 80 and 443 are open"
echo ""
echo "2. If containers won't start:"
echo "   - Check logs: docker-compose logs [service-name]"
echo "   - Rebuild images: docker-compose build --no-cache"
echo "   - Restart: docker-compose restart"
echo ""
echo "3. If 404 errors:"
echo "   - Check Traefik routing: docker-compose logs traefik"
echo "   - Verify container labels are correct"
echo "   - Check network connectivity"
echo ""
echo "4. If middleware errors:"
echo "   - Each instance needs unique middleware names"
echo "   - Check for duplicate middleware configurations"
