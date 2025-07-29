# 🚀 How to Sync Your 2000+ Items from Finale

You currently have only **58 test items** in the database. Here's how to sync your actual inventory:

## Method 1: Using the Settings Page (Easiest)

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Go to Settings:**
   - Open http://localhost:3001/settings
   - Scroll down to "Finale Sync Manager" section

3. **Start Full Sync:**
   - Click "Start Sync" button
   - Select **"Full Sync"** option
   - Click "Start Selected Sync"
   - Wait for completion (may take several minutes for 2000+ items)

## Method 2: Using the API Directly

1. **With the dev server running:**
   ```bash
   # First get a CSRF token
   curl http://localhost:3001/api/auth/csrf
   
   # Then trigger full sync
   curl -X POST http://localhost:3001/api/sync-finale \
     -H "Content-Type: application/json" \
     -d '{"syncType": "full"}'
   ```

## Method 3: Using Node Script

Create and run this script:

```javascript
// sync-all-inventory.js
const http = require('http');

async function syncAllInventory() {
  console.log('Starting full inventory sync...');
  
  const data = JSON.stringify({ syncType: 'full' });
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/sync-finale',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };
  
  const req = http.request(options, (res) => {
    let responseData = '';
    res.on('data', (chunk) => responseData += chunk);
    res.on('end', () => {
      console.log('Sync response:', responseData);
    });
  });
  
  req.on('error', console.error);
  req.write(data);
  req.end();
}

syncAllInventory();
```

## What Happens During Sync

1. **Connects to Finale API**
2. **Fetches all products** (in batches of 100)
3. **Updates your database** with:
   - SKU, name, descriptions
   - Current stock levels
   - Costs and prices
   - Vendor information
   - Sales data (if available)

## Monitor Progress

- Check sync status at: http://localhost:3001/settings
- Look for "Sync Status Monitor" section
- You'll see:
  - Items being processed
  - Any errors that occur
  - Completion status

## Troubleshooting

### "No Finale credentials" error:
1. Go to Settings page
2. Enter your Finale API credentials
3. Test connection first
4. Then try sync again

### "Sync already running" error:
- Wait for current sync to complete
- Or check for stuck syncs in Settings

### Sync is very slow:
- Normal for 2000+ items
- First sync may take 5-10 minutes
- Subsequent syncs are faster (only updates changes)

## After Sync Completes

1. **Refresh inventory page:**
   - http://localhost:3001/inventory
   - Should now show 2000+ items!

2. **Verify counts:**
   - Check summary stats at top
   - Use filters to see categories

3. **Set up automatic sync:**
   - In Settings, enable "Automatic sync"
   - Choose frequency (hourly recommended)

## Quick Check Script

To verify how many items you have after sync:

```bash
node -e "require('dotenv').config({path:'.env.local'}); const {createClient}=require('@supabase/supabase-js'); const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); s.from('inventory_items').select('*',{count:'exact',head:true}).then(({count})=>console.log('Total items:',count))"
```

This should show 2000+ after successful sync!