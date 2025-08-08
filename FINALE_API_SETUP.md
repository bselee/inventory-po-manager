# Finale API Setup Guide

## Current Status
The Finale Report URLs in your `.env.local` file are expired or require authentication. They're returning HTML login pages instead of CSV data.

## Solution: Set Up Finale REST API

### Step 1: Get API Credentials from Finale

1. Log into your Finale account at: https://app.finaleinventory.com/buildasoilorganics
2. Navigate to: **Settings > API Access** (or **Settings > Integrations**)
3. Click **"Generate API Key"** or **"Create New API Key"**
4. Save the following information:
   - API Key (looks like: `ak_1234567890abcdef`)
   - API Secret (looks like: `as_abcdef1234567890`)
   - Your account name is: `buildasoilorganics`

### Step 2: Add Credentials to .env.local

Add these lines to your `.env.local` file:

```env
# Finale REST API Credentials
FINALE_API_KEY=your_api_key_here
FINALE_API_SECRET=your_api_secret_here
FINALE_ACCOUNT_PATH=buildasoilorganics
```

### Step 3: Test the Connection

Run the test script:
```bash
npx tsx scripts/test-finale-simple.ts
```

### Step 4: Sync Your Data

Once the connection test passes, sync your inventory:

```bash
# Test sync (dry run)
curl -X POST http://localhost:3000/api/sync-finale \
  -H "Content-Type: application/json" \
  -d '{"syncType": "smart", "dryRun": true}'

# Full sync
curl -X POST http://localhost:3000/api/sync-finale \
  -H "Content-Type: application/json" \
  -d '{"syncType": "full"}'
```

## Alternative: Update Report URLs

If you cannot use the REST API, you can regenerate the report URLs:

### Step 1: Generate New Report URLs

1. Log into Finale
2. Go to **Reports > Pivot Tables**
3. Find these reports:
   - "Reorder For Shipping" 
   - "Supplier list"
   - "PURCHASING STOCK REPORT- ALL"
4. For each report:
   - Click the report
   - Click **Export** or **Share**
   - Choose **"Get CSV URL"** or **"Get Streaming URL"**
   - Copy the full URL

### Step 2: Update .env.local

Replace the existing report URLs with the new ones:

```env
FINALE_INVENTORY_REPORT_URL="new_url_here"
FINALE_VENDORS_REPORT_URL="new_url_here"
FINALE_REORDER_REPORT_URL="new_url_here"
```

## API Endpoints Reference

Once configured, the system will use these Finale endpoints:

- **Products**: `/api/product`
- **Inventory**: `/api/inventoryitem`
- **Vendors**: `/api/vendor` or `/api/party`
- **Purchase Orders**: `/api/purchaseOrder`

## Troubleshooting

### Error: 401 Unauthorized
- Check API key and secret are correct
- Verify API access is enabled in Finale settings

### Error: 404 Not Found
- Check account path is correct (should be: `buildasoilorganics`)
- Don't include `https://` or `.finaleinventory.com` in the path

### Error: Rate Limit
- The system has built-in rate limiting
- Will automatically retry with exponential backoff

### Report URLs Return HTML
- URLs have expired - regenerate them in Finale
- Or switch to REST API (recommended)

## Contact Support

If you need help:
1. Finale Support: support@finaleinventory.com
2. Check Finale API docs: https://support.finaleinventory.com/hc/en-us/sections/115000571443-API

## Next Steps

After setting up the API:
1. Run a test sync to verify everything works
2. Set up automated syncing (every 30 minutes recommended)
3. Monitor sync logs in the database
4. Configure email alerts for sync failures