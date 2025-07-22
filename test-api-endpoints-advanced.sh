#!/bin/bash

# Advanced API Endpoint Testing Script
# Tests all critical API endpoints with response validation and detailed reporting

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${API_BASE_URL:-http://localhost:3000}"
TIMEOUT=10
LOG_FILE="api-test-results-$(date +%Y%m%d-%H%M%S).log"

# Array to store test results
declare -a results

# Function to validate JSON response
is_valid_json() {
    echo "$1" | jq . >/dev/null 2>&1
    return $?
}

# Function to test an endpoint with detailed validation
test_endpoint_advanced() {
    local method="$1"
    local endpoint="$2"
    local expected_status="$3"
    local description="$4"
    local validate_json="${5:-true}"
    
    echo -n "Testing $method $endpoint... "
    
    # Create temp file for response body
    local temp_file=$(mktemp)
    
    # Make the request and capture both status and body
    local start_time=$(date +%s.%N)
    response_code=$(curl -s -w "%{http_code}" -X "$method" \
        -H "Accept: application/json" \
        -H "Content-Type: application/json" \
        --connect-timeout $TIMEOUT \
        -o "$temp_file" \
        "$BASE_URL$endpoint")
    local end_time=$(date +%s.%N)
    
    # Calculate response time
    local response_time=$(echo "$end_time - $start_time" | bc)
    response_time=$(printf "%.3f" $response_time)
    
    # Read response body
    local response_body=$(cat "$temp_file")
    rm -f "$temp_file"
    
    # Check status code
    local status_ok=false
    if [ "$response_code" = "$expected_status" ]; then
        status_ok=true
    fi
    
    # Validate JSON if required
    local json_valid="N/A"
    if [ "$validate_json" = "true" ] && [ -n "$response_body" ]; then
        if is_valid_json "$response_body"; then
            json_valid="Valid"
        else
            json_valid="Invalid"
        fi
    fi
    
    # Determine overall result
    if [ "$status_ok" = true ] && ([ "$validate_json" = "false" ] || [ "$json_valid" = "Valid" ] || [ -z "$response_body" ]); then
        echo -e "${GREEN}✓ OK${NC} (Status: $response_code, Time: ${response_time}s)"
        results+=("✓|$method|$endpoint|$response_code|$expected_status|$response_time|$json_valid|$description")
        
        # Log successful response
        echo "[SUCCESS] $method $endpoint - Status: $response_code, Time: ${response_time}s" >> "$LOG_FILE"
        if [ -n "$response_body" ]; then
            echo "Response sample: $(echo "$response_body" | jq -c '.' 2>/dev/null || echo "$response_body" | head -c 100)..." >> "$LOG_FILE"
        fi
    else
        echo -e "${RED}✗ FAIL${NC} (Status: $response_code, Expected: $expected_status, JSON: $json_valid, Time: ${response_time}s)"
        results+=("✗|$method|$endpoint|$response_code|$expected_status|$response_time|$json_valid|$description")
        
        # Log failed response
        echo "[FAILURE] $method $endpoint - Status: $response_code (Expected: $expected_status), JSON: $json_valid, Time: ${response_time}s" >> "$LOG_FILE"
        if [ -n "$response_body" ]; then
            echo "Response: $response_body" >> "$LOG_FILE"
        fi
    fi
    
    echo "---" >> "$LOG_FILE"
    
    # Small delay to avoid overwhelming the server
    sleep 0.2
}

# Function to test authenticated endpoints
test_auth_endpoint() {
    local method="$1"
    local endpoint="$2"
    local expected_status="$3"
    local description="$4"
    local auth_token="${5:-}"
    
    if [ -n "$auth_token" ]; then
        echo -n "Testing $method $endpoint (authenticated)... "
        # Would add Authorization header here
        test_endpoint_advanced "$method" "$endpoint" "$expected_status" "$description"
    else
        test_endpoint_advanced "$method" "$endpoint" "$expected_status" "$description"
    fi
}

# Clear the terminal
clear

echo "=========================================="
echo "Advanced API Endpoint Testing Script"
echo "Base URL: $BASE_URL"
echo "Date: $(date)"
echo "Log File: $LOG_FILE"
echo "=========================================="
echo

# Initialize log file
echo "API Endpoint Test Results - $(date)" > "$LOG_FILE"
echo "Base URL: $BASE_URL" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"
echo >> "$LOG_FILE"

# Test Core Endpoints
echo -e "${YELLOW}Testing Core Endpoints:${NC}"
echo "------------------------"
test_endpoint_advanced "GET" "/api/health" "200" "Health check endpoint" "true"
test_endpoint_advanced "GET" "/api/inventory" "200" "Inventory listing" "true"
test_endpoint_advanced "GET" "/api/vendors" "200" "Vendors listing" "true"
test_endpoint_advanced "GET" "/api/purchase-orders" "200" "Purchase orders listing" "true"
test_endpoint_advanced "GET" "/api/settings" "200" "Application settings" "true"
echo

# Test Sync Endpoints
echo -e "${YELLOW}Testing Sync Endpoints:${NC}"
echo "------------------------"
test_endpoint_advanced "GET" "/api/sync-finale/status" "200" "Finale sync status" "true"
test_endpoint_advanced "GET" "/api/sync-finale/history" "200" "Finale sync history" "true"
test_endpoint_advanced "GET" "/api/sync-logs" "200" "General sync logs" "true"
echo

# Test Cron Endpoints
echo -e "${YELLOW}Testing Cron Endpoints:${NC}"
echo "------------------------"
test_endpoint_advanced "GET" "/api/cron/sync-finale" "200" "Finale sync cron job" "true"
test_endpoint_advanced "GET" "/api/cron/check-inventory" "200" "Inventory check cron job" "true"
test_endpoint_advanced "GET" "/api/cron/cleanup" "200" "Cleanup cron job" "true"
echo

# Test Error Handling (optional)
echo -e "${YELLOW}Testing Error Handling:${NC}"
echo "------------------------"
test_endpoint_advanced "GET" "/api/nonexistent" "404" "Non-existent endpoint" "false"
test_endpoint_advanced "POST" "/api/inventory" "405" "Method not allowed" "true"
echo

# Generate Summary Report
echo "=========================================="
echo -e "${YELLOW}SUMMARY REPORT${NC}"
echo "=========================================="
echo

# Count successes and failures
success_count=0
fail_count=0
total_response_time=0

for result in "${results[@]}"; do
    IFS='|' read -r status method endpoint response expected time json description <<< "$result"
    if [ "$status" = "✓" ]; then
        ((success_count++))
    else
        ((fail_count++))
    fi
    total_response_time=$(echo "$total_response_time + $time" | bc)
done

# Calculate average response time
avg_response_time=0
if [ "${#results[@]}" -gt 0 ]; then
    avg_response_time=$(echo "scale=3; $total_response_time / ${#results[@]}" | bc)
fi

# Overall summary
echo "Total Endpoints Tested: ${#results[@]}"
echo -e "Successful: ${GREEN}$success_count${NC}"
echo -e "Failed: ${RED}$fail_count${NC}"
echo "Average Response Time: ${avg_response_time}s"
echo

# Performance Analysis
echo -e "${BLUE}Performance Analysis:${NC}"
echo "---------------------"
echo "Fastest endpoints:"
for result in "${results[@]}"; do
    IFS='|' read -r status method endpoint response expected time json description <<< "$result"
    echo "$time|$endpoint"
done | sort -n | head -3 | while IFS='|' read -r time endpoint; do
    printf "  %-35s %ss\n" "$endpoint" "$time"
done

echo
echo "Slowest endpoints:"
for result in "${results[@]}"; do
    IFS='|' read -r status method endpoint response expected time json description <<< "$result"
    echo "$time|$endpoint"
done | sort -nr | head -3 | while IFS='|' read -r time endpoint; do
    printf "  %-35s %ss\n" "$endpoint" "$time"
done
echo

# Detailed results table
echo "Detailed Results:"
echo "-----------------"
printf "%-8s %-6s %-30s %-8s %-8s %-8s %-8s %s\n" "Status" "Method" "Endpoint" "Code" "Expect" "Time(s)" "JSON" "Description"
echo "$(printf '%.0s-' {1..110})"

for result in "${results[@]}"; do
    IFS='|' read -r status method endpoint response expected time json description <<< "$result"
    if [ "$status" = "✓" ]; then
        printf "${GREEN}%-8s${NC} %-6s %-30s %-8s %-8s %-8s %-8s %s\n" \
            "$status" "$method" "$endpoint" "$response" "$expected" "$time" "$json" "$description"
    else
        printf "${RED}%-8s${NC} %-6s %-30s ${RED}%-8s${NC} %-8s %-8s ${RED}%-8s${NC} %s\n" \
            "$status" "$method" "$endpoint" "$response" "$expected" "$time" "$json" "$description"
    fi
done

# Failed endpoints details
if [ "$fail_count" -gt 0 ]; then
    echo
    echo -e "${RED}Failed Endpoints Details:${NC}"
    echo "-------------------------"
    for result in "${results[@]}"; do
        IFS='|' read -r status method endpoint response expected time json description <<< "$result"
        if [ "$status" = "✗" ]; then
            echo "  • $method $endpoint"
            echo "    Expected: $expected, Got: $response"
            if [ "$json" = "Invalid" ]; then
                echo "    JSON validation failed"
            fi
        fi
    done
fi

echo
echo "=========================================="
echo "Test completed at: $(date)"
echo "Full results logged to: $LOG_FILE"
echo "=========================================="

# Generate HTML report (optional)
if command -v jq &> /dev/null; then
    HTML_FILE="api-test-report-$(date +%Y%m%d-%H%M%S).html"
    cat > "$HTML_FILE" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>API Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .success { color: green; }
        .failure { color: red; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .summary { background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>API Endpoint Test Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p>Date: $(date)</p>
        <p>Base URL: $BASE_URL</p>
        <p>Total Endpoints: ${#results[@]}</p>
        <p class="success">Successful: $success_count</p>
        <p class="failure">Failed: $fail_count</p>
        <p>Average Response Time: ${avg_response_time}s</p>
    </div>
    <h2>Test Results</h2>
    <table>
        <tr>
            <th>Status</th>
            <th>Method</th>
            <th>Endpoint</th>
            <th>Response Code</th>
            <th>Expected Code</th>
            <th>Response Time</th>
            <th>JSON Valid</th>
            <th>Description</th>
        </tr>
EOF
    
    for result in "${results[@]}"; do
        IFS='|' read -r status method endpoint response expected time json description <<< "$result"
        class="success"
        symbol="✓"
        if [ "$status" = "✗" ]; then
            class="failure"
            symbol="✗"
        fi
        echo "<tr class='$class'>" >> "$HTML_FILE"
        echo "<td>$symbol</td>" >> "$HTML_FILE"
        echo "<td>$method</td>" >> "$HTML_FILE"
        echo "<td>$endpoint</td>" >> "$HTML_FILE"
        echo "<td>$response</td>" >> "$HTML_FILE"
        echo "<td>$expected</td>" >> "$HTML_FILE"
        echo "<td>${time}s</td>" >> "$HTML_FILE"
        echo "<td>$json</td>" >> "$HTML_FILE"
        echo "<td>$description</td>" >> "$HTML_FILE"
        echo "</tr>" >> "$HTML_FILE"
    done
    
    echo "</table></body></html>" >> "$HTML_FILE"
    echo
    echo "HTML report generated: $HTML_FILE"
fi

# Exit with appropriate code
if [ "$fail_count" -gt 0 ]; then
    echo
    echo -e "${RED}WARNING: $fail_count endpoint(s) failed!${NC}"
    exit 1
else
    echo
    echo -e "${GREEN}All endpoints passed successfully!${NC}"
    exit 0
fi