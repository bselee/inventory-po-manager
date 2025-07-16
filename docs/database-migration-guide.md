# Database Migration Guide

This guide explains how to run the database migrations for the Inventory PO Manager.

## Quick Start - Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to your [Supabase project dashboard](https://app.supabase.com)
   - Sign in to your account

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query" button

3. **Run the Migration**
   - Copy the entire contents of [`scripts/complete-migration.sql`](../scripts/complete-migration.sql)
   - Paste it into the SQL editor
   - Click "Run" button (or press Ctrl+Enter)

4. **Verify Success**
   - You should see "Success" at the bottom
   - The query should complete without errors

## What the Migration Does

The complete migration includes:

### 1. Sales Tracking Fields
- Adds `cost`, `sales_last_30_days`, `sales_last_90_days`, `last_sales_update` to inventory
- Adds sync configuration fields to settings

### 2. Finale Integration
- Adds Finale PO sync fields to purchase orders
- Adds Finale vendor ID mapping
- Creates indexes for performance

### 3. Sync Logging
- Creates `sync_logs` table for audit trail
- Enables Row Level Security
- Adds proper indexes

### 4. Authentication Fields
- Adds `finale_username` and `finale_password` for session-based auth
- Supports both API key and username/password authentication

### 5. Settings Table
- Ensures all required columns exist
- Adds automatic timestamp updates
- Creates default settings row

## Alternative Methods

### Method 1: Using Node.js Script (Experimental)
```bash
# Make sure you have .env configured
node scripts/run-supabase-migration.js
```
Note: This may not work due to Supabase permissions. If it fails, use the SQL Editor method above.

### Method 2: Individual Migrations
If you prefer to run migrations one at a time:

1. `scripts/add-sales-cost-fields.sql`
2. `scripts/add-finale-po-sync.sql`
3. `scripts/add-finale-auth-fields.sql`
4. The sync_logs table creation from `complete-migration.sql`

## Verification

After running the migration, verify it worked:

1. **Check Settings Table**
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'settings' 
   ORDER BY ordinal_position;
   ```

2. **Check Sync Logs Table**
   ```sql
   SELECT * FROM sync_logs LIMIT 1;
   ```

3. **Test in Application**
   - Go to Settings page
   - You should see username/password fields
   - Test Finale connection

## Troubleshooting

### "Permission denied" Error
- Make sure you're using the Supabase SQL Editor
- The web interface has full permissions

### "Column already exists" Error
- This is safe to ignore
- The migration uses `IF NOT EXISTS` clauses
- Existing columns won't be modified

### Application Not Working After Migration
1. Check that all migrations completed
2. Restart your application
3. Clear browser cache
4. Check browser console for errors

## Need Help?

If you encounter issues:
1. Check the [Supabase documentation](https://supabase.com/docs/guides/database)
2. Review error messages carefully
3. Ensure you're connected to the correct database