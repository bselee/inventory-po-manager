#!/bin/bash

# Vercel Deployment Script
# This script handles common Vercel deployment issues and forces a fresh deployment
# Usage: ./scripts/deploy-vercel.sh [token]

echo "🚀 Vercel Deployment Script"
echo "=========================="
echo ""

# Check if token is provided as argument, otherwise prompt
if [ -z "$1" ]; then
    echo "Please provide your Vercel token:"
    read -s VERCEL_TOKEN
else
    VERCEL_TOKEN=$1
fi

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check current git status
echo -e "${YELLOW}1. Checking Git Status...${NC}"
CURRENT_BRANCH=$(git branch --show-current)
echo "   Current branch: $CURRENT_BRANCH"

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    echo -e "   ${YELLOW}⚠️  Warning: You have uncommitted changes${NC}"
    git status --short
    echo ""
    read -p "   Do you want to continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 2: Check if commits are pushed
echo -e "\n${YELLOW}2. Checking Remote Status...${NC}"
git fetch origin --quiet
LOCAL_COMMIT=$(git rev-parse HEAD)
REMOTE_COMMIT=$(git rev-parse origin/$CURRENT_BRANCH)

if [ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]; then
    echo -e "   ${RED}❌ Local is not in sync with remote${NC}"
    echo "   Local:  $LOCAL_COMMIT"
    echo "   Remote: $REMOTE_COMMIT"
    echo ""
    read -p "   Push local commits to remote? (Y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        git push origin $CURRENT_BRANCH
    fi
else
    echo -e "   ${GREEN}✅ Local and remote are in sync${NC}"
fi

# Step 3: Check Vercel configuration
echo -e "\n${YELLOW}3. Checking Vercel Configuration...${NC}"
if [ -f "vercel.json" ]; then
    echo -e "   ${GREEN}✅ vercel.json found${NC}"
    
    # Check for cron jobs that might cause issues on Hobby plan
    if grep -q '"crons"' vercel.json; then
        CRON_SCHEDULE=$(grep -A 2 '"crons"' vercel.json | grep '"schedule"' | cut -d'"' -f4)
        if [[ "$CRON_SCHEDULE" == *"* * * *"* ]] && [[ "$CRON_SCHEDULE" != *"0 12 * * *"* ]]; then
            echo -e "   ${YELLOW}⚠️  Warning: Cron job may be too frequent for Hobby plan${NC}"
            echo "   Current schedule: $CRON_SCHEDULE"
        fi
    fi
else
    echo -e "   ${RED}❌ vercel.json not found${NC}"
fi

# Step 4: Check recent deployments
echo -e "\n${YELLOW}4. Checking Recent Deployments...${NC}"
LATEST_DEPLOYMENT=$(vercel ls --token $VERCEL_TOKEN 2>/dev/null | grep -m 1 "Ready.*Production" | awk '{print $2}')
if [ -n "$LATEST_DEPLOYMENT" ]; then
    echo "   Latest deployment: $LATEST_DEPLOYMENT"
else
    echo -e "   ${YELLOW}⚠️  Could not fetch deployment info${NC}"
fi

# Step 5: Deploy to Vercel
echo -e "\n${YELLOW}5. Deploying to Vercel...${NC}"
echo "   This may take a few minutes..."
echo ""

# Run the deployment
vercel --prod --token $VERCEL_TOKEN --yes

DEPLOY_EXIT_CODE=$?

if [ $DEPLOY_EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}✅ Deployment successful!${NC}"
    
    # Get the new deployment URL
    NEW_DEPLOYMENT=$(vercel ls --token $VERCEL_TOKEN 2>/dev/null | grep -m 1 "Ready.*Production" | awk '{print $2}')
    echo -e "\n${GREEN}🎉 Your app is now live at:${NC}"
    echo "   Production: https://inventory-po-manager.vercel.app"
    if [ -n "$NEW_DEPLOYMENT" ]; then
        echo "   Deployment: $NEW_DEPLOYMENT"
    fi
else
    echo -e "\n${RED}❌ Deployment failed${NC}"
    echo ""
    echo "Common solutions:"
    echo "1. Check if GitHub webhook is connected in Vercel Dashboard"
    echo "2. Ensure all environment variables are set in Vercel"
    echo "3. Check if cron job frequency is compatible with your plan"
    echo "4. Try disconnecting and reconnecting GitHub in Vercel settings"
    echo ""
    echo "For more help, see: docs/vercel_troubleshooting.md"
    exit 1
fi

# Step 6: Verify deployment
echo -e "\n${YELLOW}6. Verifying Deployment...${NC}"
sleep 5  # Wait for deployment to propagate

# Check health endpoint
HEALTH_CHECK=$(curl -s https://inventory-po-manager.vercel.app/api/health 2>/dev/null)
if [[ "$HEALTH_CHECK" == *'"status":"ok"'* ]]; then
    echo -e "   ${GREEN}✅ Health check passed${NC}"
else
    echo -e "   ${YELLOW}⚠️  Health check failed or timed out${NC}"
fi

echo -e "\n${GREEN}🚀 Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Visit https://inventory-po-manager.vercel.app to see your changes"
echo "2. Check Vercel Dashboard for detailed logs"
echo "3. If automatic deployments aren't working, reconnect GitHub in Vercel settings"