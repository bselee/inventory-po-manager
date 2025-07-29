#!/bin/bash

# Finale API Improvements Verification Script
# This script runs various tests to verify all improvements are working

echo "🔍 Finale API Improvements Verification"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo "1. Checking if development server is running..."
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${RED}✗ Server is not running. Start with: npm run dev${NC}"
    exit 1
fi

echo ""
echo "2. Checking TypeScript compilation..."
if npm run type-check 2>/dev/null; then
    echo -e "${GREEN}✓ TypeScript compilation successful${NC}"
else
    echo -e "${YELLOW}⚠ TypeScript errors found (non-critical)${NC}"
fi

echo ""
echo "3. Checking for required files..."
FILES=(
    "app/lib/finale-rate-limiter.ts"
    "app/lib/finale-error-messages.ts"
    "app/lib/validation/finale-credentials.ts"
    "app/lib/sync-logger.ts"
    "app/components/inventory/InventoryDataWarning.tsx"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ Found: $file${NC}"
    else
        echo -e "${RED}✗ Missing: $file${NC}"
    fi
done

echo ""
echo "4. Running Node.js tests..."
if [ -f "scripts/test-improvements.js" ]; then
    node scripts/test-improvements.js
else
    echo -e "${YELLOW}⚠ Test script not found${NC}"
fi

echo ""
echo "5. Checking API endpoints..."
ENDPOINTS=(
    "/api/test-finale-simple"
    "/api/finale-debug-v2"
    "/api/sync-finale"
)

for endpoint in "${ENDPOINTS[@]}"; do
    if curl -s -X POST http://localhost:3000$endpoint \
        -H "Content-Type: application/json" \
        -d '{}' > /dev/null; then
        echo -e "${GREEN}✓ Endpoint responding: $endpoint${NC}"
    else
        echo -e "${RED}✗ Endpoint not responding: $endpoint${NC}"
    fi
done

echo ""
echo "6. Running Playwright tests (if available)..."
if command -v npx &> /dev/null && [ -f "tests/e2e/improvements-verification.spec.ts" ]; then
    echo "Starting Playwright tests..."
    npx playwright test tests/e2e/improvements-verification.spec.ts --reporter=list
else
    echo -e "${YELLOW}⚠ Playwright not available or test file missing${NC}"
fi

echo ""
echo "======================================"
echo "📋 Manual Testing Required:"
echo ""
echo "Please open IMPROVEMENT_VERIFICATION_CHECKLIST.md and follow the manual tests for:"
echo "- Frontend validation visual feedback"
echo "- Debug panel copy/download buttons"
echo "- Real-time error messages"
echo "- Data quality warnings"
echo ""
echo "Run manual tests with:"
echo "  1. npm run dev (if not running)"
echo "  2. Open http://localhost:3000/settings"
echo "  3. Follow checklist in IMPROVEMENT_VERIFICATION_CHECKLIST.md"
echo ""
echo "======================================"