# API Endpoint Testing Scripts

This directory contains scripts for testing all critical API endpoints in the inventory-po-manager application.

## Scripts Available

### 1. `test-api-endpoints.sh` (Basic)
A simple script that tests all endpoints and provides a color-coded summary.

**Usage:**
```bash
# Test local development server
./test-api-endpoints.sh

# Test production (modify BASE_URL in script)
# Edit the script and change BASE_URL to your production URL
./test-api-endpoints.sh
```

**Features:**
- Color-coded output (green = pass, red = fail)
- Tests all core, sync, and cron endpoints
- Summary report with pass/fail counts
- Clean, easy-to-read output

### 2. `test-api-endpoints-advanced.sh` (Advanced)
A comprehensive testing script with additional features.

**Usage:**
```bash
# Test local development server
./test-api-endpoints-advanced.sh

# Test production using environment variable
API_BASE_URL=https://your-app.vercel.app ./test-api-endpoints-advanced.sh
```

**Features:**
- Response time measurement
- JSON validation
- Detailed logging to file
- Performance analysis (fastest/slowest endpoints)
- HTML report generation
- Error handling tests
- Support for authenticated endpoints (placeholder)

## Endpoints Tested

### Core Endpoints
- `GET /api/health` - Health check
- `GET /api/inventory` - Inventory listing
- `GET /api/vendors` - Vendors listing
- `GET /api/purchase-orders` - Purchase orders listing
- `GET /api/settings` - Application settings

### Sync Endpoints
- `GET /api/sync-finale/status` - Finale sync status
- `GET /api/sync-finale/history` - Sync history
- `GET /api/sync-logs` - General sync logs

### Cron Endpoints
- `GET /api/cron/sync-finale` - Finale sync job
- `GET /api/cron/check-inventory` - Inventory check job
- `GET /api/cron/cleanup` - Cleanup job

### Error Handling (Advanced script only)
- `GET /api/nonexistent` - Should return 404
- `POST /api/inventory` - Should return 405 (Method Not Allowed)

## Output Files

The advanced script generates:
- `api-test-results-[timestamp].log` - Detailed log file
- `api-test-report-[timestamp].html` - HTML report (if jq is installed)

## Requirements

- `curl` - For making HTTP requests
- `jq` (optional) - For JSON validation and HTML report generation
- `bc` - For response time calculations (advanced script)

## Interpreting Results

### Status Codes
- `200` - Success
- `404` - Not Found (expected for non-existent endpoints)
- `405` - Method Not Allowed (expected for wrong HTTP methods)
- `500` - Server Error (indicates a problem)

### Common Issues
1. **Connection Refused**: Make sure the server is running
2. **Timeout**: Check if the server is responding or increase timeout
3. **Invalid JSON**: API is returning malformed JSON response
4. **Wrong Status Code**: API logic might have issues

## Customization

To add new endpoints to test:
1. Open the script in an editor
2. Add new `test_endpoint` or `test_endpoint_advanced` calls
3. Specify method, endpoint, expected status, and description

Example:
```bash
test_endpoint "GET" "/api/new-endpoint" "200" "Description of endpoint"
```

## CI/CD Integration

These scripts can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions usage
- name: Test API Endpoints
  run: |
    chmod +x ./test-api-endpoints.sh
    ./test-api-endpoints.sh
```

## Troubleshooting

- **Permission Denied**: Run `chmod +x test-api-endpoints*.sh`
- **Server Not Found**: Check BASE_URL or API_BASE_URL
- **All Tests Failing**: Verify server is running and accessible