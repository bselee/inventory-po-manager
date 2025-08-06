// Script to verify database migrations
import { createClient } from '@supabase/supabase-js'

// Note: This is a verification script to help check if migrations ran successfully
   - sales_last_30_days (int8)
   - sales_last_90_days (int8)
   - last_sales_update (timestamptz)

2. ✅ settings table should have:
   - sync_frequency_minutes (int8)
   - last_sync_time (timestamptz)
   - sync_enabled (bool)

3. ✅ purchase_orders table should have:
   - finale_order_id (text)
   - finale_sync_status (text)
   - finale_last_sync (timestamptz)

4. ✅ vendors table should have:
   - finale_vendor_id (text, unique)

5. ✅ sync_logs table should exist with:
   - id (int8)
   - sync_type (text)
   - status (text)
   - items_processed (int8)
   - items_inserted (int8)
   - items_updated (int8)
   - errors (jsonb)
   - duration_ms (int8)
   - synced_at (timestamptz)
   - created_at (timestamptz)

6. ✅ Indexes should exist:
   - idx_inventory_sales
   - idx_purchase_orders_finale_order_id
   - idx_vendors_finale_vendor_id
   - idx_sync_logs_sync_type
   - idx_sync_logs_status
   - idx_sync_logs_synced_at

If all items above are present, your migrations ran successfully! 🎉
`);