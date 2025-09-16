#!/bin/bash

# Test Authentication Script for Gift Tracker Multi-Tenant

echo "🔐 Testing Authentication for Gift Tracker Multi-Tenant"
echo "======================================================"

# Test admin panel authentication
echo ""
echo "📊 Testing Admin Panel Authentication..."
echo "URL: https://admin.o3-ttgifts.com"
echo "Expected: Username: admin, Password: admin123"

# Test with curl
echo ""
echo "Testing with curl (should return 200 if auth works):"
curl -u admin:admin123 -I https://admin.o3-ttgifts.com 2>/dev/null | head -1

echo ""
echo "📈 Testing Traefik Dashboard Authentication..."
echo "URL: https://traefik.o3-ttgifts.com"
echo "Expected: Username: admin, Password: admin123"

# Test with curl
echo ""
echo "Testing with curl (should return 200 if auth works):"
curl -u admin:admin123 -I https://traefik.o3-ttgifts.com 2>/dev/null | head -1

echo ""
echo "🎁 Testing Example Instance Authentication..."
echo "URL: https://gift-tracker-example.o3-ttgifts.com"
echo "Expected: Username: admin, Password: example_password"

# Test with curl
echo ""
echo "Testing with curl (should return 200 if auth works):"
curl -u admin:example_password -I https://gift-tracker-example.o3-ttgifts.com 2>/dev/null | head -1

echo ""
echo "✅ Authentication test completed!"
echo ""
echo "If you see 200 OK responses, authentication is working."
echo "If you see 401 Unauthorized, there's still an issue with the auth configuration."
