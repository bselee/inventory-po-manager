-- Migration 005: Add report URL fields to settings table
-- Date: 2025-08-05
-- Description: Add fields for Finale report URLs and data source configuration

-- Add report URL columns
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS finale_inventory_report_url TEXT,
ADD COLUMN IF NOT EXISTS finale_consumption_14day_url TEXT,
ADD COLUMN IF NOT EXISTS finale_consumption_30day_url TEXT,
ADD COLUMN IF NOT EXISTS finale_stock_report_url TEXT,
ADD COLUMN IF NOT EXISTS inventory_data_source TEXT DEFAULT 'supabase' CHECK (inventory_data_source IN ('supabase', 'vercel-kv', 'finale-cache', 'enhanced'));

-- Add comment to document the fields
COMMENT ON COLUMN settings.finale_inventory_report_url IS 'URL for Finale inventory report with supplier data';
COMMENT ON COLUMN settings.finale_consumption_14day_url IS 'URL for Finale 14-day consumption report';
COMMENT ON COLUMN settings.finale_consumption_30day_url IS 'URL for Finale 30-day consumption report';
COMMENT ON COLUMN settings.finale_stock_report_url IS 'URL for Finale stock detail report (QoH, Packed, Transit, WIP)';
COMMENT ON COLUMN settings.inventory_data_source IS 'Data source for inventory page: supabase (default), vercel-kv, finale-cache, or enhanced';