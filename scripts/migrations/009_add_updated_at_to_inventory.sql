-- Migration: Add updated_at column to inventory_items
-- Date: 2025-07-28
-- Purpose: Fix update trigger errors

-- Add updated_at column if it doesn't exist
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create or replace trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON inventory_items;

-- Create the trigger
CREATE TRIGGER update_inventory_items_updated_at 
BEFORE UPDATE ON inventory_items 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Update existing rows to have updated_at value
UPDATE inventory_items 
SET updated_at = COALESCE(last_updated, created_at, NOW())
WHERE updated_at IS NULL;