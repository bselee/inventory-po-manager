-- Add consumption report URL fields to settings table
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS finale_consumption_14day_url TEXT,
ADD COLUMN IF NOT EXISTS finale_consumption_30day_url TEXT,
ADD COLUMN IF NOT EXISTS finale_purchase_orders_url TEXT;

-- Add comment to explain the fields
COMMENT ON COLUMN settings.finale_consumption_14day_url IS 'Finale report URL for 14-day consumption data';
COMMENT ON COLUMN settings.finale_consumption_30day_url IS 'Finale report URL for 30-day consumption data';  
COMMENT ON COLUMN settings.finale_purchase_orders_url IS 'Finale report URL for purchase orders data';