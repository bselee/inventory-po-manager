-- Simple Database Migration for Inventory PO Manager
-- This version avoids complex syntax that might cause issues
-- Run this in your Supabase SQL editor

-- =====================================================
-- Migration 1: Add sales tracking and cost fields
-- =====================================================

-- Add new columns to inventory_items for sales tracking
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS cost DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS sales_last_30_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sales_last_90_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_sales_update TIMESTAMP WITH TIME ZONE;

-- Add sync settings columns
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS sync_frequency_minutes INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS last_sync_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT true;

-- Create index for faster sales data queries
CREATE INDEX IF NOT EXISTS idx_inventory_sales_update 
ON inventory_items(last_sales_update);

-- =====================================================
-- Migration 2: Add Finale PO sync fields
-- =====================================================

-- Add Finale sync fields to purchase_orders
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS finale_order_id TEXT,
ADD COLUMN IF NOT EXISTS finale_sync_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS finale_last_sync TIMESTAMP WITH TIME ZONE;

-- Add Finale vendor ID to vendors table
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS finale_vendor_id TEXT;

-- Create indexes for faster Finale lookups
CREATE INDEX IF NOT EXISTS idx_po_finale_order_id ON purchase_orders(finale_order_id);
CREATE INDEX IF NOT EXISTS idx_vendor_finale_id ON vendors(finale_vendor_id);

-- =====================================================
-- Migration 3: Create sync_logs table
-- =====================================================

-- Create table for sync logs if it doesn't exist
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for querying recent sync logs
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_type ON sync_logs(sync_type);

-- =====================================================
-- Migration 4: Add Finale authentication fields
-- =====================================================

-- Add username/password fields for alternative Finale authentication
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS finale_username TEXT,
ADD COLUMN IF NOT EXISTS finale_password TEXT;

-- =====================================================
-- Migration 5: Ensure all required settings columns
-- =====================================================

-- Add remaining settings columns
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS finale_api_key TEXT,
ADD COLUMN IF NOT EXISTS finale_api_secret TEXT,
ADD COLUMN IF NOT EXISTS finale_account_path TEXT,
ADD COLUMN IF NOT EXISTS google_sheet_id TEXT,
ADD COLUMN IF NOT EXISTS google_sheets_api_key TEXT,
ADD COLUMN IF NOT EXISTS sendgrid_api_key TEXT,
ADD COLUMN IF NOT EXISTS from_email TEXT,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- =====================================================
-- Create or update trigger for updated_at
-- =====================================================

-- Create function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at 
BEFORE UPDATE ON settings 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Initialize settings if needed
-- =====================================================

-- Insert default settings row if table is empty
INSERT INTO settings (low_stock_threshold)
SELECT 10
WHERE NOT EXISTS (SELECT 1 FROM settings LIMIT 1);

-- =====================================================
-- Success!
-- =====================================================
-- Migration completed successfully!