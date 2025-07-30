# How to Sync Your Finale Inventory RIGHT NOW

Since the UI is having issues, here's how to trigger the sync directly:

## Method 1: Browser Console (Recommended)

1. Open your browser and go to: http://localhost:3000/settings
2. Open the browser console (Press F12, then click "Console" tab)
3. Copy and paste this code:

```javascript
// Trigger Finale Sync
fetch('/api/sync-finale-background', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dryRun: false,
    filterYear: new Date().getFullYear() - 1 // Last 2 years
  })
})
.then(res => res.json())
.then(result => {
  if (result.success) {
    console.log('✅ SYNC STARTED! Check back in 1-3 minutes.');
    console.log('Refresh the inventory page to see your data.');
  } else {
    console.error('❌ Sync failed:', result.error);
  }
})
.catch(err => console.error('Error:', err));
```

4. Press Enter to run it
5. Wait 1-3 minutes for the sync to complete
6. Go to http://localhost:3000/inventory to see your imported data!

## Method 2: Direct API Call

If you have a tool like Postman or can use curl:

```bash
curl -X POST http://localhost:3000/api/sync-finale-background \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false, "filterYear": 2024}'
```

## What the Sync Does

- Imports all inventory from the last 2 years
- Updates stock levels, costs, and product information
- Typically takes 1-3 minutes for a full sync
- You'll see the items appear on the inventory page once complete

## Troubleshooting

If the sync doesn't work:

1. Make sure your Finale credentials are saved in Settings
2. Test the Finale connection using the "Test Connection" button
3. Check that the account path is just your company name (e.g., "buildasoilorganics")
4. Make sure the dev server is running (npm run dev)

## Why is the Sync Button Not Visible?

The FinaleSyncManager component exists in the code but may not be rendering due to:
- A client-side rendering issue
- Missing dependencies
- State management problems

The browser console method bypasses all UI issues and triggers the sync directly.