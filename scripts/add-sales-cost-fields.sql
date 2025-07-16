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