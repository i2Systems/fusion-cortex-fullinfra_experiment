#!/bin/bash

# Ensure backups directory exists
mkdir -p backups

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Check for optional tag argument
if [ -n "$1" ]; then
  TAG="_$1"
else
  TAG=""
fi

FILENAME="backups/fusion_cortex_$TIMESTAMP$TAG.sql"

# Check if container is running
if ! docker ps | grep -q fusion-cortex-db; then
  echo "❌ Error: Database container 'fusion-cortex-db' is not running."
  echo "   Run 'npm run cortex:wakeup' first."
  exit 1
fi

echo "📦 Backing up database to $FILENAME..."

# Execute pg_dump inside the container
docker exec fusion-cortex-db pg_dump -U postgres fusion_cortex > "$FILENAME"

if [ $? -eq 0 ]; then
  echo "✅ Backup complete!"
  echo "   File: $FILENAME"
  # Keep only last 10 backups
  ls -t backups/*.sql | tail -n +11 | xargs -I {} rm -- {} 2>/dev/null
else
  echo "❌ Backup failed."
  rm "$FILENAME"
  exit 1
fi
