-- Combined migrations for BuildASoil Inventory & Purchase Order Manager
-- Run this file in Supabase SQL Editor

-- ============================================
-- Migration 1: Add sales data and cost fields
-- ============================================

-- Add sales data and cost fields to inventory_items table
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sales_last_30_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sales_last_90_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_sales_update TIMESTAMP WITH TIME ZONE;

-- Add sync frequency to settings table
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS sync_frequency_minutes INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS last_sync_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT true;

-- Create index for sales data queries
CREATE INDEX IF NOT EXISTS idx_inventory_sales ON inventory_items(sales_last_30_days, sales_last_90_days);

-- Add comment for documentation
COMMENT ON COLUMN inventory_items.cost IS 'Product cost - manually updated from Finale reports';
COMMENT ON COLUMN inventory_items.sales_last_30_days IS 'Units sold in last 30 days from Finale report';
COMMENT ON COLUMN inventory_items.sales_last_90_days IS 'Units sold in last 90 days from Finale report';
COMMENT ON COLUMN inventory_items.last_sales_update IS 'Timestamp of last sales data update';
COMMENT ON COLUMN settings.sync_frequency_minutes IS 'How often to sync with Finale (in minutes)';

-- ============================================
-- Migration 2: Add Finale PO sync fields
-- ============================================

-- Add Finale sync fields to purchase_orders table
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS finale_order_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS finale_sync_status VARCHAR(50) DEFAULT 'not_synced',
ADD COLUMN IF NOT EXISTS finale_last_sync TIMESTAMP WITH TIME ZONE;

-- Add Finale vendor ID to vendors table
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS finale_vendor_id VARCHAR(255) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_purchase_orders_finale_order_id ON purchase_orders(finale_order_id);
CREATE INDEX IF NOT EXISTS idx_vendors_finale_vendor_id ON vendors(finale_vendor_id);

-- Add comments for documentation
COMMENT ON COLUMN purchase_orders.finale_order_id IS 'Finale order ID for two-way sync';
COMMENT ON COLUMN purchase_orders.finale_sync_status IS 'Sync status: not_synced, synced, error';
COMMENT ON COLUMN purchase_orders.finale_last_sync IS 'Last successful sync with Finale';
COMMENT ON COLUMN vendors.finale_vendor_id IS 'Finale vendor ID for matching vendors';

-- ============================================
-- Migration 3: Create sync_logs table
-- ============================================

-- Create sync_logs table for tracking sync history
CREATE TABLE IF NOT EXISTS sync_logs (
  id BIGSERIAL PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'partial', 'error')),
  items_processed INTEGER DEFAULT 0,
  items_inserted INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  duration_ms INTEGER,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_type ON sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_synced_at ON sync_logs(synced_at DESC);

-- Enable RLS on sync_logs
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Policy for service role (full access)
CREATE POLICY "Service role can manage sync logs" ON sync_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for authenticated users (read only)
CREATE POLICY "Authenticated users can view sync logs" ON sync_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- Success message
-- ============================================
-- All migrations completed successfully!