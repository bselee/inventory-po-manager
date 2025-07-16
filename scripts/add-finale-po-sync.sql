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