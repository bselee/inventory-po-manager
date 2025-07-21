-- Add sync control columns to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS sync_inventory BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS sync_vendors BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS sync_purchase_orders BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS sync_schedule VARCHAR(20) DEFAULT 'daily';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS sync_time TIME DEFAULT '02:00:00';

-- Add metadata column to sync_logs for additional info
ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Update existing sync_logs entries to have proper sync_type values
UPDATE sync_logs 
SET sync_type = 'inventory' 
WHERE sync_type = 'finale_inventory';

-- Create index for faster sync log queries
-- Note: This will be created by fix-sync-logs-columns.sql which handles the column naming issue