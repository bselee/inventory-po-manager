-- Migration: Ensure vendors table exists and fix all vendor references
-- This migration creates the vendors table if missing and updates all foreign key relationships

-- Step 1: Create vendors table if it doesn't exist
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  payment_terms TEXT,
  lead_time_days INTEGER,
  minimum_order DECIMAL(10, 2),
  notes TEXT,
  active BOOLEAN DEFAULT true,
  finale_vendor_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create unique constraint on name if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_vendor_name' 
    AND conrelid = 'vendors'::regclass
  ) THEN
    ALTER TABLE vendors ADD CONSTRAINT unique_vendor_name UNIQUE (name);
  END IF;
END $$;

-- Create index on finale_vendor_id if not exists
CREATE INDEX IF NOT EXISTS idx_vendors_finale_id ON vendors(finale_vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(active) WHERE active = true;

-- Enable RLS on vendors table
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Create policy for vendors table
DROP POLICY IF EXISTS "Enable all access for vendors" ON vendors;
CREATE POLICY "Enable all access for vendors" ON vendors
  FOR ALL USING (true) WITH CHECK (true);

-- Step 2: Create trigger for updated_at on vendors
DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
CREATE TRIGGER update_vendors_updated_at 
BEFORE UPDATE ON vendors 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Step 3: Populate vendors table from existing purchase_orders vendor names
INSERT INTO vendors (name, active)
SELECT DISTINCT 
  TRIM(vendor_name) as name,
  true as active
FROM purchase_orders
WHERE vendor_name IS NOT NULL 
  AND TRIM(vendor_name) != ''
  AND NOT EXISTS (
    SELECT 1 FROM vendors v 
    WHERE LOWER(TRIM(v.name)) = LOWER(TRIM(purchase_orders.vendor_name))
  );

-- Step 4: Update purchase_orders to set vendor_id based on vendor_name
UPDATE purchase_orders po
SET vendor_id = v.id
FROM vendors v
WHERE LOWER(TRIM(po.vendor_name)) = LOWER(TRIM(v.name))
  AND po.vendor_id IS NULL;

-- Step 5: Also check inventory_items table for vendor/supplier references
DO $$
BEGIN
  -- Check if inventory_items has a supplier or vendor column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' 
    AND column_name IN ('supplier', 'vendor')
  ) THEN
    -- Add any unique suppliers/vendors from inventory_items
    INSERT INTO vendors (name, active)
    SELECT DISTINCT 
      TRIM(COALESCE(supplier, vendor)) as name,
      true as active
    FROM inventory_items
    WHERE COALESCE(supplier, vendor) IS NOT NULL 
      AND TRIM(COALESCE(supplier, vendor)) != ''
      AND NOT EXISTS (
        SELECT 1 FROM vendors v 
        WHERE LOWER(TRIM(v.name)) = LOWER(TRIM(COALESCE(inventory_items.supplier, inventory_items.vendor)))
      );
  END IF;
END $$;

-- Step 6: Add vendor statistics view for useful queries
CREATE OR REPLACE VIEW vendor_statistics AS
SELECT 
  v.id,
  v.name,
  v.active,
  COUNT(DISTINCT po.id) as total_orders,
  COUNT(DISTINCT CASE WHEN po.status = 'draft' THEN po.id END) as draft_orders,
  COUNT(DISTINCT CASE WHEN po.status = 'submitted' THEN po.id END) as submitted_orders,
  COUNT(DISTINCT CASE WHEN po.status = 'approved' THEN po.id END) as approved_orders,
  SUM(po.total_amount) as total_spend,
  MAX(po.order_date) as last_order_date,
  COUNT(DISTINCT ii.sku) as unique_products
FROM vendors v
LEFT JOIN purchase_orders po ON v.id = po.vendor_id
LEFT JOIN inventory_items ii ON LOWER(TRIM(COALESCE(ii.supplier, ii.vendor))) = LOWER(TRIM(v.name))
GROUP BY v.id, v.name, v.active;

-- Add helpful comments
COMMENT ON TABLE vendors IS 'Vendor/supplier management with contact information and order statistics';
COMMENT ON VIEW vendor_statistics IS 'Aggregated statistics for vendor performance and activity';

-- Success message
-- Migration complete! 
-- - vendors table created/verified with proper constraints
-- - Vendor data populated from existing purchase_orders
-- - Foreign key relationships established
-- - vendor_statistics view created for reporting