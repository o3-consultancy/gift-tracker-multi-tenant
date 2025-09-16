#!/bin/bash

# Test Instance Authentication Script
# This script tests authentication for a specific gift tracker instance

set -e

if [ $# -ne 3 ]; then
    echo "Usage: $0 <instance-url> <username> <password>"
    echo "Example: $0 https://gift-tracker-test.o3-ttgifts.com admin mypassword123"
    exit 1
fi

INSTANCE_URL=$1
USERNAME=$2
PASSWORD=$3

echo "🧪 Testing authentication for instance: $INSTANCE_URL"
echo "👤 Username: $USERNAME"
echo "🔐 Password: $PASSWORD"
echo ""

# Test basic authentication
echo "📡 Testing basic authentication..."
AUTH_HEADER=$(echo -n "$USERNAME:$PASSWORD" | base64)

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Basic $AUTH_HEADER" \
    "$INSTANCE_URL/api/state")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | head -n -1)

echo "HTTP Status Code: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Authentication successful!"
    echo "📊 Response: $RESPONSE_BODY"
elif [ "$HTTP_CODE" = "401" ]; then
    echo "❌ Authentication failed - Invalid credentials"
    echo "📊 Response: $RESPONSE_BODY"
else
    echo "⚠️  Unexpected response code: $HTTP_CODE"
    echo "📊 Response: $RESPONSE_BODY"
fi

echo ""
echo "🔍 Testing dashboard access..."
DASHBOARD_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Basic $AUTH_HEADER" \
    "$INSTANCE_URL/")

DASHBOARD_HTTP_CODE=$(echo "$DASHBOARD_RESPONSE" | tail -n1)

if [ "$DASHBOARD_HTTP_CODE" = "200" ]; then
    echo "✅ Dashboard access successful!"
else
    echo "❌ Dashboard access failed - HTTP $DASHBOARD_HTTP_CODE"
fi
