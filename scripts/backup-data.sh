#!/bin/bash

# Backup all gift tracker data
# Usage: ./backup-data.sh [backup-name]

set -e

BACKUP_NAME=${1:-"backup-$(date +%Y%m%d-%H%M%S)"}
BACKUP_DIR="data/backups/$BACKUP_NAME"

echo "🔄 Creating backup: $BACKUP_NAME"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
if [ -f "data/admin.db" ]; then
    echo "📊 Backing up database..."
    cp "data/admin.db" "$BACKUP_DIR/"
fi

# Backup instance data
if [ -d "data/instances" ]; then
    echo "📁 Backing up instance data..."
    cp -r "data/instances" "$BACKUP_DIR/"
fi

# Create backup manifest
cat > "$BACKUP_DIR/manifest.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "backup_name": "$BACKUP_NAME",
  "instances": $(find data/instances -maxdepth 1 -type d -name "*" | wc -l),
  "database_size": $(stat -f%z data/admin.db 2>/dev/null || echo 0),
  "total_size": $(du -sh "$BACKUP_DIR" | cut -f1)
}
EOF

echo "✅ Backup created successfully!"
echo "📁 Location: $BACKUP_DIR"
echo "📊 Size: $(du -sh "$BACKUP_DIR" | cut -f1)"

# List recent backups
echo ""
echo "📋 Recent backups:"
ls -la data/backups/ | tail -5
