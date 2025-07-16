# 🔍 Database Migration Verification Guide

## Quick Verification Steps

### 1. Open Supabase Dashboard
Go to your Supabase project → Table Editor

### 2. Check Each Table

#### ✅ inventory_items
Should have these NEW columns:
- `cost` (numeric, default: 0)
- `sales_last_30_days` (int8, default: 0)
- `sales_last_90_days` (int8, default: 0) 
- `last_sales_update` (timestamptz, nullable)

#### ✅ settings
Should have these NEW columns:
- `sync_frequency_minutes` (int8, default: 60)
- `last_sync_time` (timestamptz, nullable)
- `sync_enabled` (boolean, default: true)

#### ✅ purchase_orders
Should have these NEW columns:
- `finale_order_id` (text, nullable)
- `finale_sync_status` (text, default: 'not_synced')
- `finale_last_sync` (timestamptz, nullable)

#### ✅ vendors  
Should have this NEW column:
- `finale_vendor_id` (text, unique, nullable)

#### ✅ sync_logs
This should be a NEW table with columns:
- `id` (int8, primary key)
- `sync_type` (text)
- `status` (text)
- `items_processed` (int8)
- `items_inserted` (int8)
- `items_updated` (int8)
- `errors` (jsonb)
- `duration_ms` (int8)
- `synced_at` (timestamptz)
- `created_at` (timestamptz)

### 3. Verify in Your App

1. **Go to Settings Page** (`/settings`)
   - You should see sync frequency dropdown
   - Sales Data Upload section should work
   - Vendor Sync Manager should appear

2. **Go to Inventory Page** (`/inventory`)
   - You should see Sales columns (30d, 90d)
   - Cost field should be editable (click pencil icon)

3. **Test the API endpoint**:
   Navigate to: `https://your-app.vercel.app/api/verify-schema`
   
   You should see a JSON response showing all tables exist.

## 🎉 If Everything Checks Out

Your database is ready for:
- 📊 Sales data tracking from Excel uploads
- 💰 Cost management with inline editing
- 🔄 Automated Finale sync (hourly)
- 📦 Two-way purchase order sync
- 👥 Vendor synchronization

## ⚠️ If Something's Missing

1. Check for any error messages in Supabase SQL Editor
2. Re-run the specific migration that failed
3. Make sure you're in the correct Supabase project

## 📝 Migration Files Location

- Combined: `/scripts/all-migrations.sql`
- Individual:
  - `/scripts/add-sales-cost-fields.sql`
  - `/scripts/add-finale-po-sync.sql`