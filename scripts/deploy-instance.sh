#!/bin/bash

# Deploy a new gift tracker instance
# Usage: ./deploy-instance.sh <instance-name> <tiktok-username> <subdomain> <password>

set -e

INSTANCE_NAME=$1
TIKTOK_USERNAME=$2
SUBDOMAIN=$3
PASSWORD=$4

if [ -z "$INSTANCE_NAME" ] || [ -z "$TIKTOK_USERNAME" ] || [ -z "$SUBDOMAIN" ] || [ -z "$PASSWORD" ]; then
    echo "Usage: $0 <instance-name> <tiktok-username> <subdomain> <password>"
    echo "Example: $0 gift-ss1 yalastars1 gift-tracker-ss1 mypassword123"
    exit 1
fi

echo "🚀 Deploying new gift tracker instance..."
echo "Instance Name: $INSTANCE_NAME"
echo "TikTok Username: $TIKTOK_USERNAME"
echo "Subdomain: $SUBDOMAIN"
echo "Password: [HIDDEN]"

# Get next available port
NEXT_PORT=$(docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
    docker:cli ps --format "table {{.Ports}}" | \
    grep -o ':[0-9]*->3000' | \
    sed 's/:\([0-9]*\)->3000/\1/' | \
    sort -n | tail -1 | awk '{print $1+1}' || echo "3001")

echo "Using port: $NEXT_PORT"

# Create data directory
mkdir -p "data/instances/$INSTANCE_NAME"

# Create groups.json
cat > "data/instances/$INSTANCE_NAME/groups.json" << EOF
{
  "roses": {
    "name": "Roses",
    "giftIds": [5655],
    "goal": 1000,
    "color": "#ff0066"
  }
}
EOF

# Create config.json
cat > "data/instances/$INSTANCE_NAME/config.json" << EOF
{
  "target": 10000
}
EOF

# Add to docker-compose.yml
cat >> docker-compose.yml << EOF

  # Gift Tracker Instance: $INSTANCE_NAME
  gift-tracker-$INSTANCE_NAME:
    build: ./gift-tracker-instance
    container_name: gift-tracker-$INSTANCE_NAME
    restart: unless-stopped
    environment:
      - TIKTOK_USERNAME=$TIKTOK_USERNAME
      - DASH_PASSWORD=$PASSWORD
      - PORT=3000
    volumes:
      - ./data/instances/$INSTANCE_NAME:/app/data
    networks:
      - gift-tracker-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.gift-$INSTANCE_NAME.rule=Host(\`$SUBDOMAIN.o3consultancy.ae\`)"
      - "traefik.http.routers.gift-$INSTANCE_NAME.tls=true"
      - "traefik.http.routers.gift-$INSTANCE_NAME.tls.certresolver=letsencrypt"
      - "traefik.http.routers.gift-$INSTANCE_NAME.service=gift-$INSTANCE_NAME"
      - "traefik.http.services.gift-$INSTANCE_NAME.loadbalancer.server.port=3000"
      - "traefik.http.routers.gift-$INSTANCE_NAME.middlewares=auth-basic"
      - "traefik.http.middlewares.auth-basic.basicauth.users=admin:\$2y\$10\$8K1p/a0dL2Lz8bVK5VQhCOYz6Vz8K1p/a0dL2Lz8bVK5VQhCOYz6Vz"
EOF

# Start the new service
echo "Starting new service..."
docker-compose up -d gift-tracker-$INSTANCE_NAME

echo "✅ Instance deployed successfully!"
echo "🌐 URL: https://$SUBDOMAIN.o3consultancy.ae"
echo "👤 Username: admin"
echo "🔑 Password: $PASSWORD"
echo ""
echo "📊 Admin Panel: https://admin.o3consultancy.ae"
