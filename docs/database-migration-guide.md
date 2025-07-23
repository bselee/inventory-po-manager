# Database Migration Guide

This guide explains how to set up the database for the BuildASoil Inventory Manager.

## Quick Start - Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to your [Supabase project dashboard](https://app.supabase.com)
   - Sign in to your account

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query" button

3. **Run the Migration**
   - Copy the entire contents of [`scripts/all-migrations.sql`](../scripts/all-migrations.sql)
   - Paste it into the SQL editor
   - Click "Run" button (or press Ctrl+Enter)

4. **Verify Success**
   - You should see "Success" at the bottom
   - The query should complete without errors

## What the Migration Creates

### Core Tables
- **`inventory_items`** - Product catalog with stock levels and sales data
- **`purchase_orders`** - PO management with Finale sync tracking
- **`vendors`** - Vendor information with Finale integration
- **`settings`** - Application configuration
- **`sync_logs`** - Comprehensive sync operation logging

### Key Features Added
- **Sales tracking fields** for velocity analysis
- **Finale integration columns** for two-way sync
- **Performance indexes** for fast queries
- **Data validation constraints** for integrity
- **Row Level Security** policies

## Verification

After running the migration, verify it worked:

1. **Check Tables Exist**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

2. **Test Application**
   - Visit your deployed application
   - Go to Settings page
   - Verify Finale configuration fields are visible

## Troubleshooting

### "Permission denied" Error
- Ensure you're using the Supabase SQL Editor
- The web interface has full permissions

### "Column already exists" Error
- This is safe to ignore
- The migration uses `IF NOT EXISTS` clauses
- Existing data won't be affected

### Application Not Working After Migration
- Check the browser console for errors
- Verify environment variables are set
- Check Supabase connection in Settings page
1. Check that all migrations completed
2. Restart your application
3. Clear browser cache
4. Check browser console for errors

## Need Help?

If you encounter issues:
1. Check the [Supabase documentation](https://supabase.com/docs/guides/database)
2. Review error messages carefully
3. Ensure you're connected to the correct database