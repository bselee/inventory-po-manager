-- Migration: Fix purchase_orders vendor column
-- This migration renames the 'vendor' column to 'vendor_name' and adds a proper 'vendor_id' foreign key

-- Step 1: Rename existing vendor column to vendor_name to preserve data
ALTER TABLE purchase_orders
RENAME COLUMN vendor TO vendor_name;

-- Step 2: Add vendor_id column as UUID with foreign key to vendors table
ALTER TABLE purchase_orders
ADD COLUMN vendor_id UUID REFERENCES vendors(id);

-- Step 3: Create index on vendor_id for performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor_id ON purchase_orders(vendor_id);

-- Step 4: Update vendor_id based on vendor_name matches (optional - run manually if needed)
-- This will attempt to match vendor names to vendor records
/*
UPDATE purchase_orders po
SET vendor_id = v.id
FROM vendors v
WHERE LOWER(TRIM(po.vendor_name)) = LOWER(TRIM(v.name))
  AND po.vendor_id IS NULL;
*/

-- Step 5: Add po_number column if it doesn't exist (seems to be missing from current schema)
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS po_number TEXT;

-- Generate po_number for existing records if needed
UPDATE purchase_orders
SET po_number = 'PO-' || EXTRACT(YEAR FROM created_at)::TEXT || '-' || LPAD(id::TEXT, 6, '0')
WHERE po_number IS NULL;

-- Make po_number NOT NULL and add unique constraint
ALTER TABLE purchase_orders
ALTER COLUMN po_number SET NOT NULL,
ADD CONSTRAINT unique_po_number UNIQUE (po_number);

-- Step 6: Add missing columns from the TypeScript interface
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS expected_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS received_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Step 7: Add check constraint on status if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_status_valid' 
    AND conrelid = 'purchase_orders'::regclass
  ) THEN
    ALTER TABLE purchase_orders
    ADD CONSTRAINT check_status_valid CHECK (status IN ('draft', 'submitted', 'approved', 'received', 'cancelled'));
  END IF;
END $$;

-- Step 8: Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON purchase_orders;
CREATE TRIGGER update_purchase_orders_updated_at 
BEFORE UPDATE ON purchase_orders 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON COLUMN purchase_orders.vendor_id IS 'Foreign key reference to vendors table';
COMMENT ON COLUMN purchase_orders.vendor_name IS 'Legacy vendor name field - migrate to vendor_id relationship';
COMMENT ON COLUMN purchase_orders.po_number IS 'Unique purchase order number';

-- Success message
-- Migration complete! The purchase_orders table now has:
-- - vendor_id: UUID foreign key to vendors table
-- - vendor_name: The original vendor column (preserved for data migration)
-- - po_number: Unique PO identifier
-- - All missing columns from TypeScript interface