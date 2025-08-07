#!/bin/bash

# Display latest deployment summary

# Colors
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

SUMMARY_FILE=".deployment/latest-summary.md"
DEPLOYMENT_DIR=".deployment"

if [ "$1" == "--list" ] || [ "$1" == "-l" ]; then
    echo -e "${CYAN}📋 Deployment History:${NC}"
    echo ""
    if [ -d "$DEPLOYMENT_DIR" ]; then
        ls -la "$DEPLOYMENT_DIR"/deployment-*.log 2>/dev/null | tail -10
    else
        echo "No deployment history found."
    fi
    exit 0
fi

if [ "$1" == "--clear" ] || [ "$1" == "-c" ]; then
    echo -e "${YELLOW}🗑️  Clearing deployment history...${NC}"
    rm -rf "$DEPLOYMENT_DIR"
    echo -e "${GREEN}✅ Deployment history cleared${NC}"
    exit 0
fi

if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Deployment Summary Tool"
    echo ""
    echo "Usage:"
    echo "  ./scripts/deployment-summary.sh          Show latest deployment summary"
    echo "  ./scripts/deployment-summary.sh --list   List deployment history"
    echo "  ./scripts/deployment-summary.sh --clear  Clear deployment history"
    echo "  ./scripts/deployment-summary.sh --help   Show this help"
    exit 0
fi

# Show latest summary
if [ -f "$SUMMARY_FILE" ]; then
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}📊 LATEST DEPLOYMENT SUMMARY${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Convert markdown to colored terminal output
    while IFS= read -r line; do
        # Headers
        if [[ $line == "# "* ]]; then
            echo -e "${CYAN}${line:2}${NC}"
        elif [[ $line == "## "* ]]; then
            echo -e "${YELLOW}${line:3}${NC}"
        # Success items
        elif [[ $line == *"✅"* ]]; then
            echo -e "${GREEN}$line${NC}"
        # Warning items
        elif [[ $line == *"⚠️"* ]] || [[ $line == *"🟡"* ]]; then
            echo -e "${YELLOW}$line${NC}"
        # Error items
        elif [[ $line == *"❌"* ]] || [[ $line == *"🔴"* ]]; then
            echo -e "${RED}$line${NC}"
        # Info items
        elif [[ $line == *"🟢"* ]]; then
            echo -e "${GREEN}$line${NC}"
        # Code blocks
        elif [[ $line == '```'* ]]; then
            IN_CODE_BLOCK=true
        elif [[ $IN_CODE_BLOCK == true ]] && [[ $line == '```' ]]; then
            IN_CODE_BLOCK=false
        elif [[ $IN_CODE_BLOCK == true ]]; then
            echo "  $line"
        # Default
        else
            echo "$line"
        fi
    done < "$SUMMARY_FILE"
    
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
    echo -e "${YELLOW}No deployment summary found.${NC}"
    echo ""
    echo "The deployment summary is generated automatically when you run:"
    echo "  git push"
    echo ""
    echo "Or you can manually run:"
    echo "  .git/hooks/pre-push"
fi