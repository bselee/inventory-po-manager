# API Timeout Fix Guide

## Quick Fix (Immediate Solution)

Run this single command to fix API timeouts immediately:

```bash
npm run fix
```

This will:
- Create sample inventory data in your database
- Setup basic configuration
- Create a local cache file
- Make your API endpoints responsive

## Problem Diagnosis

The API timeouts are occurring because:

1. **No Data in Database**: The inventory tables are empty, causing queries to timeout
2. **Missing Finale Credentials**: The Finale API integration isn't configured
3. **Redis Cache Issues**: The caching layer may be blocking operations
4. **Sync Lock**: Previous sync attempts may have left locks in place

## Complete Solution Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Run Immediate Fix
```bash
npm run fix
```

This populates your database with sample data so the application works immediately.

### Step 3: Start Development Server
```bash
npm run dev
```

Visit http://localhost:3000 - the inventory page should load without timeouts.

### Step 4: Configure Finale (Optional)

If you want to sync real data from Finale:

1. Add credentials to `.env.local`:
```env
FINALE_API_KEY=your_api_key_here
FINALE_API_SECRET=your_api_secret_here
FINALE_ACCOUNT_PATH=buildasoilorganics
```

2. Test the connection:
```bash
npm run test:finale
```

3. Sync inventory:
```bash
npm run sync:finale
```

## Available Diagnostic Commands

```bash
# Quick fix - populates sample data immediately
npm run fix

# Full diagnostic - checks all systems
npm run diagnose

# Test Finale connection
npm run test:finale

# Manual sync trigger
npm run sync:manual

# Check sync status
curl http://localhost:3000/api/sync/status

# View inventory (after fix)
curl http://localhost:3000/api/inventory
```

## File Structure Created

After running the fix, these files are created:

1. **Database Tables**:
   - `inventory_items` - Sample inventory data
   - `vendors` - Sample vendor data
   - `settings` - Basic configuration

2. **Cache File**:
   - `.inventory-cache.json` - Local cache for fast access

## Troubleshooting

### If the fix doesn't work:

1. **Check Environment Variables**:
   - Ensure `.env.local` exists with Supabase credentials
   - Verify `NEXT_PUBLIC_SUPABASE_URL` is set
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is set

2. **Clear Any Locks**:
   ```bash
   npm run cache:clear
   ```

3. **Check Database Connection**:
   ```bash
   npm run db:validate
   ```

4. **Run Full Diagnostic**:
   ```bash
   npm run diagnose
   ```

### Common Issues:

**Issue**: "Failed to connect to Supabase"
**Solution**: Check your internet connection and Supabase credentials

**Issue**: "Redis connection failed"
**Solution**: This is OK - the app will work without Redis

**Issue**: "Finale API error"
**Solution**: The app works with sample data - Finale is optional

## How It Works

The fix script:

1. **Connects to Supabase** using your service role key
2. **Creates sample inventory** with realistic BuildASoil products
3. **Sets up vendors** (BuildASoil, Down To Earth, Gaia Green)
4. **Configures settings** with placeholder Finale credentials
5. **Creates a cache file** for immediate data access

This ensures your API endpoints have data to return, eliminating timeouts.

## Next Steps

After fixing the immediate issue:

1. **Add Real Finale Credentials** (optional)
2. **Customize Sample Data** in `/scripts/immediate-fix.js`
3. **Set Up Automated Sync** using cron jobs
4. **Configure Email Alerts** for low stock notifications

## Support

If issues persist after running the fix:

1. Check the diagnostic report: `diagnostic-report.json`
2. Review logs in `.deployment/` directory
3. Run `npm run diagnose` for detailed system check

The application should now be fully functional with sample data!