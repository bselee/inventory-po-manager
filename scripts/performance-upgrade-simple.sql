-- Performance Upgrade for Inventory System
-- Copy and paste this entire file into Supabase SQL Editor

-- Step 1: Add change detection columns
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS content_hash VARCHAR(32),
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS sync_priority INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'pending';

-- Step 2: Add critical performance indexes
CREATE INDEX IF NOT EXISTS idx_inventory_sync_priority 
ON inventory_items(sync_priority DESC, last_synced_at ASC);

CREATE INDEX IF NOT EXISTS idx_inventory_critical_items 
ON inventory_items(stock, reorder_point) 
WHERE stock <= reorder_point;

CREATE INDEX IF NOT EXISTS idx_inventory_out_of_stock 
ON inventory_items(sku) 
WHERE stock = 0;

-- Step 3: Create critical items view
CREATE OR REPLACE VIEW critical_inventory_items AS
SELECT 
  sku,
  product_name,
  stock,
  reorder_point,
  vendor,
  CASE 
    WHEN stock = 0 THEN 'out_of_stock'
    WHEN stock <= reorder_point THEN 'below_reorder'
    ELSE 'normal'
  END as status
FROM inventory_items
WHERE stock <= reorder_point
ORDER BY stock ASC;

-- Step 4: Add metadata column to sync_logs
ALTER TABLE sync_logs 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Verify the upgrade
SELECT 
  'Columns Added' as check_type,
  COUNT(*) as result
FROM information_schema.columns 
WHERE table_name = 'inventory_items' 
  AND column_name IN ('content_hash', 'sync_priority', 'sync_status', 'last_synced_at')
UNION ALL
SELECT 
  'Critical View Created' as check_type,
  COUNT(*) as result
FROM information_schema.views 
WHERE table_name = 'critical_inventory_items';