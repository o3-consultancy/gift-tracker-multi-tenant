#!/bin/bash

# Health check script for Gift Tracker Multi-Tenant System
# Usage: ./health-check.sh

set -e

echo "🏥 Gift Tracker Multi-Tenant Health Check"
echo "========================================="

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running"
    exit 1
fi

echo "✅ Docker is running"

# Check if containers are running
echo ""
echo "📦 Container Status:"
docker-compose ps

# Check Traefik health
echo ""
echo "🌐 Traefik Health:"
if curl -s http://localhost:8080/api/health &> /dev/null; then
    echo "✅ Traefik is healthy"
else
    echo "❌ Traefik is not responding"
fi

# Check Admin Panel health
echo ""
echo "🖥️  Admin Panel Health:"
if curl -s http://localhost:3000/health &> /dev/null; then
    echo "✅ Admin Panel is healthy"
else
    echo "❌ Admin Panel is not responding"
fi

# Check gift tracker instances
echo ""
echo "🎁 Gift Tracker Instances:"
INSTANCES=$(docker ps --filter "label=gift-tracker.instance" --format "table {{.Names}}\t{{.Status}}")
if [ -n "$INSTANCES" ]; then
    echo "$INSTANCES"
else
    echo "ℹ️  No gift tracker instances running"
fi

# Check disk space
echo ""
echo "💾 Disk Usage:"
df -h / | tail -1 | awk '{print "Used: " $3 " / " $2 " (" $5 ")"}'

# Check memory usage
echo ""
echo "🧠 Memory Usage:"
free -h | grep Mem | awk '{print "Used: " $3 " / " $2}'

# Check network connectivity
echo ""
echo "🌍 Network Connectivity:"
if ping -c 1 8.8.8.8 &> /dev/null; then
    echo "✅ Internet connectivity OK"
else
    echo "❌ No internet connectivity"
fi

echo ""
echo "🏁 Health check completed!"
