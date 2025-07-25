#!/bin/bash

# Test API Endpoints Script
# Tests all critical API endpoints and generates a summary report

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL - modify this for production testing
BASE_URL="http://localhost:3000"

# Array to store test results
declare -a results

# Function to test an endpoint
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local expected_status="$3"
    local description="$4"
    
    echo -n "Testing $method $endpoint... "
    
    # Make the request and capture the response
    response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$endpoint" -H "Accept: application/json")
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✓ OK${NC} (Status: $response)"
        results+=("✓|$method|$endpoint|$response|$expected_status|$description")
    else
        echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $response)"
        results+=("✗|$method|$endpoint|$response|$expected_status|$description")
    fi
    
    # Small delay to avoid overwhelming the server
    sleep 0.5
}

# Clear the terminal
clear

echo "=========================================="
echo "API Endpoint Testing Script"
echo "Base URL: $BASE_URL"
echo "Date: $(date)"
echo "=========================================="
echo

# Test Core Endpoints
echo -e "${YELLOW}Testing Core Endpoints:${NC}"
echo "------------------------"
test_endpoint "GET" "/api/health" "200" "Health check endpoint"
test_endpoint "GET" "/api/inventory" "200" "Inventory listing"
test_endpoint "GET" "/api/vendors" "200" "Vendors listing"
test_endpoint "GET" "/api/purchase-orders" "200" "Purchase orders listing"
test_endpoint "GET" "/api/settings" "200" "Application settings"
echo

# Test Sync Endpoints
echo -e "${YELLOW}Testing Sync Endpoints:${NC}"
echo "------------------------"
test_endpoint "GET" "/api/sync-finale/status" "200" "Finale sync status"
test_endpoint "GET" "/api/sync-finale/history" "200" "Finale sync history"
test_endpoint "GET" "/api/sync-logs" "200" "General sync logs"
echo

# Test Cron Endpoints
echo -e "${YELLOW}Testing Cron Endpoints:${NC}"
echo "------------------------"
test_endpoint "GET" "/api/cron/sync-finale" "200" "Finale sync cron job"
test_endpoint "GET" "/api/cron/check-inventory" "200" "Inventory check cron job"
test_endpoint "GET" "/api/cron/cleanup" "200" "Cleanup cron job"
echo

# Generate Summary Report
echo "=========================================="
echo -e "${YELLOW}SUMMARY REPORT${NC}"
echo "=========================================="
echo

# Count successes and failures
success_count=0
fail_count=0

for result in "${results[@]}"; do
    IFS='|' read -r status method endpoint response expected description <<< "$result"
    if [ "$status" = "✓" ]; then
        ((success_count++))
    else
        ((fail_count++))
    fi
done

# Overall summary
echo "Total Endpoints Tested: ${#results[@]}"
echo -e "Successful: ${GREEN}$success_count${NC}"
echo -e "Failed: ${RED}$fail_count${NC}"
echo

# Detailed results table
echo "Detailed Results:"
echo "-----------------"
printf "%-8s %-6s %-35s %-10s %-10s %s\n" "Status" "Method" "Endpoint" "Response" "Expected" "Description"
echo "$(printf '%.0s-' {1..100})"

for result in "${results[@]}"; do
    IFS='|' read -r status method endpoint response expected description <<< "$result"
    if [ "$status" = "✓" ]; then
        printf "${GREEN}%-8s${NC} %-6s %-35s %-10s %-10s %s\n" "$status" "$method" "$endpoint" "$response" "$expected" "$description"
    else
        printf "${RED}%-8s${NC} %-6s %-35s ${RED}%-10s${NC} %-10s %s\n" "$status" "$method" "$endpoint" "$response" "$expected" "$description"
    fi
done

echo
echo "=========================================="
echo "Test completed at: $(date)"
echo "=========================================="

# Exit with appropriate code
if [ "$fail_count" -gt 0 ]; then
    echo
    echo -e "${RED}WARNING: Some endpoints failed!${NC}"
    exit 1
else
    echo
    echo -e "${GREEN}All endpoints passed successfully!${NC}"
    exit 0
fi