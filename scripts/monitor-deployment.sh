#!/bin/bash

# Deployment monitoring script for Vercel free tier
EXPECTED_COMMIT="0d330a4"
URL="https://inventory-po-manager.vercel.app/api/deployment-info"
CHECK_INTERVAL=30  # seconds

echo "🔍 Monitoring Vercel deployment..."
echo "Expected commit: $EXPECTED_COMMIT"
echo "Checking every $CHECK_INTERVAL seconds..."
echo "Press Ctrl+C to stop"
echo ""

while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Fetch deployment info
    RESPONSE=$(curl -s "$URL" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        # Extract lastCommit from JSON
        CURRENT_COMMIT=$(echo "$RESPONSE" | grep -o '"lastCommit":"[^"]*"' | cut -d'"' -f4)
        
        if [ "$CURRENT_COMMIT" = "$EXPECTED_COMMIT" ]; then
            echo "✅ [$TIMESTAMP] Deployment complete! Commit: $CURRENT_COMMIT"
            echo ""
            echo "🎉 Your latest changes are now live at:"
            echo "   https://inventory-po-manager.vercel.app"
            echo ""
            echo "New features available:"
            echo "   - Two-way vendor sync"
            echo "   - Credential persistence from .env"
            echo "   - Date filtering for inventory"
            echo ""
            exit 0
        else
            echo "⏳ [$TIMESTAMP] Still deploying... Current: $CURRENT_COMMIT, Expected: $EXPECTED_COMMIT"
        fi
    else
        echo "❌ [$TIMESTAMP] Failed to check deployment status"
    fi
    
    sleep $CHECK_INTERVAL
done