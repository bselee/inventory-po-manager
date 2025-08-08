# Finale Report API Setup Guide

## Overview
The application now uses Finale's Report API for efficient data synchronization. This guide will help you set up the required report URLs.

## Prerequisites
- Finale account with API access enabled
- API Key and API Secret from Finale
- Access to create/edit reports in Finale

## Step 1: Get Your Finale API Credentials

1. Log in to Finale: https://app.finaleinventory.com/buildasoilorganics
2. Navigate to: **Settings → Integrations → API Access**
3. Copy your:
   - **API Key**
   - **API Secret**

## Step 2: Create or Configure Reports in Finale

### Inventory Report
You need a report that includes inventory data with supplier information.

1. In Finale, go to **Reports → Custom Reports**
2. Create a new report or use an existing one that includes:
   - Product ID (SKU)
   - Product Name
   - Supplier/Vendor information
   - Stock levels (Units in stock)
   - Location data
   - Cost information
   - Sales data (optional but useful)

3. Configure the report:
   - Set output format to support API access
   - Ensure it uses `pivotTable` format (not `pivotTableStream`)
   - Include all necessary fields

4. Get the Report URL:
   - After creating the report, run it
   - Look for the "API" or "Share" option
   - Copy the full report URL

Example format:
```
https://app.finaleinventory.com/buildasoilorganics/doc/report/inventoryReport.json?format=jsonObject&filters=...
```

### Vendors Report (Optional)
If you want dedicated vendor data:

1. Create a report that includes:
   - Vendor/Supplier ID
   - Vendor Name
   - Contact information
   - Payment terms
   - Active status

2. Get the Report URL similar to the inventory report

## Step 3: Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Finale API Credentials (Required)
FINALE_API_KEY=your_api_key_here
FINALE_API_SECRET=your_api_secret_here
FINALE_ACCOUNT_PATH=buildasoilorganics

# Finale Report URLs (Required for Report API)
FINALE_INVENTORY_REPORT_URL=https://app.finaleinventory.com/buildasoilorganics/doc/report/your-inventory-report.json?format=jsonObject
FINALE_VENDORS_REPORT_URL=https://app.finaleinventory.com/buildasoilorganics/doc/report/your-vendors-report.json?format=jsonObject

# Redis Configuration (Required for caching)
REDIS_URL=redis://your-redis-url-here
```

## Step 4: Test the Configuration

### 1. Test Connection
```bash
# Test the Finale connection
curl http://localhost:3000/api/test-finale
```

Expected response:
```json
{
  "success": true,
  "finale": {
    "connected": true,
    "accountPath": "buildasoilorganics",
    "hasInventoryReportUrl": true,
    "hasVendorsReportUrl": true
  },
  "redis": {
    "connected": true,
    "data": {
      "inventoryItems": 0,
      "vendors": 0,
      "lastSync": null
    }
  }
}
```

### 2. Run Initial Sync
```bash
# Trigger a manual sync
curl -X POST http://localhost:3000/api/sync-finale/trigger \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'
```

### 3. Verify Data in Redis
```bash
# Check inventory data
curl http://localhost:3000/api/inventory
```

## Troubleshooting

### "r is not a function" Error
This error usually means the Report URL is not configured. Make sure:
1. `FINALE_INVENTORY_REPORT_URL` is set in `.env.local`
2. The URL is valid and accessible with your API credentials

### No Data After Sync
1. Check that your report includes data
2. Verify the report URL uses `format=jsonObject`
3. Ensure the report uses `pivotTable` not `pivotTableStream`
4. Check Redis connection is working

### Connection Failed
1. Verify API Key and Secret are correct
2. Check that API access is enabled in Finale
3. Ensure the account path is correct (usually your company subdomain)

### Redis Not Connected
1. Verify `REDIS_URL` is set correctly
2. Check Redis server is accessible
3. For local development, you can use Redis Cloud free tier

## Report URL Format

The Report API URLs should follow this format:
```
https://app.finaleinventory.com/{account}/doc/report/{reportName}.{format}?format={outputFormat}&filters={base64EncodedFilters}
```

Where:
- `{account}` = Your Finale account path (e.g., "buildasoilorganics")
- `{reportName}` = The name/ID of your report
- `{format}` = File extension (json for API access)
- `{outputFormat}` = "jsonObject" for JSON array output
- `{filters}` = Optional base64-encoded filter parameters

## Adding Filters to Reports

You can add filters to your report URLs as documented here:
https://support.finaleinventory.com/hc/en-us/articles/360009042733-Adding-Filters-to-Report-URL-called-by-the-API

Example with year filter:
```javascript
const filters = {
  "year": 2024,
  "status": "active"
}
const encodedFilters = Buffer.from(JSON.stringify(filters)).toString('base64')
const reportUrl = `${baseUrl}?format=jsonObject&filters=${encodedFilters}`
```

## Automatic Sync Schedule

Once configured, the system will automatically sync:
- **Inventory**: Every 15 minutes (if enabled in settings)
- **Vendors**: Every hour (if enabled in settings)

You can also trigger manual syncs through:
- The Settings page in the UI
- The API endpoint: `POST /api/sync-finale/trigger`
- The test script: `npx tsx scripts/test-finale-sync.ts`

## Next Steps

After successful setup:
1. Monitor sync logs in the database
2. Set up email alerts for sync failures
3. Configure sync frequency in Settings
4. Test the inventory and purchase order features

## Support

For Finale API documentation:
- https://support.finaleinventory.com/hc/en-us/sections/360000686114-API

For application issues:
- Check logs in Vercel dashboard
- Review sync_logs table in Supabase
- Check Redis cache status