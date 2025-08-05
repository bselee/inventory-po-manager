#!/bin/bash

# Script to remove legacy/debug/test API endpoints
# Run this before deploying to production

echo "🧹 Cleaning up legacy and debug endpoints..."

# List of directories to remove
DIRS_TO_REMOVE=(
  "app/api/debug-db"
  "app/api/debug-finale-raw"
  "app/api/debug-finale"
  "app/api/debug-settings"
  "app/api/debug-sync-status"
  "app/api/test-finale-connection"
  "app/api/test-finale-deep-scan"
  "app/api/test-finale-direct"
  "app/api/test-finale-endpoints"
  "app/api/test-finale-expanded"
  "app/api/test-finale-party"
  "app/api/test-finale-product-structure"
  "app/api/test-finale-session"
  "app/api/test-finale-simple"
  "app/api/test-finale-suppliers"
  "app/api/test-finale"
  "app/api/test-inventory-data"
  "app/api/test-inventory-endpoint"
  "app/api/test-sendgrid"
  "app/api/test-sheets"
  "app/api/test-sync-all"
  "app/api/test-sync-flow"
  "app/api/test-sync-simple"
  "app/api/test-sync-system"
  "app/api/test-vendor-url"
  "app/api/finale-auth-test"
  "app/api/finale-debug-v2"
  "app/api/finale-verify"
  "app/api/fix-account-path"
  "app/api/fix-settings"
  "app/api/force-save-settings"
  "app/api/simple-save-settings"
  "app/api/load-env-settings"
  "app/api/get-current-settings"
  "app/api/clear-test-data"
  "app/api/direct-db-insert"
  "app/api/verify-schema"
)

# Remove directories
for dir in "${DIRS_TO_REMOVE[@]}"; do
  if [ -d "$dir" ]; then
    echo "  Removing $dir..."
    rm -rf "$dir"
  fi
done

# Legacy KV endpoints (replaced with Redis)
echo "  Removing legacy KV endpoints..."
rm -rf app/api/inventory-kv
rm -rf app/api/settings-kv
rm -rf app/api/cron/sync-inventory-kv

echo "✅ Cleanup complete!"
echo ""
echo "🔍 Remaining API endpoints:"
find app/api -type d -name "route.ts" | sed 's|/route.ts||' | sort | sed 's|app/api/|  - |'