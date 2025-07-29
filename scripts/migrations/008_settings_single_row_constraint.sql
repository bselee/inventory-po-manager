-- Migration: Enforce single row constraint on settings table
-- Date: 2025-07-28
-- Purpose: Ensure only one settings row exists to prevent configuration conflicts

-- First, clean up any duplicate rows (keeping the most recently updated)
DELETE FROM settings
WHERE id NOT IN (
  SELECT id FROM (
    SELECT id FROM settings
    ORDER BY updated_at DESC
    LIMIT 1
  ) AS keep_row
);

-- Add a check constraint to ensure only one row exists
-- We'll use a dummy column that can only have one value
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS single_row_enforcer INTEGER DEFAULT 1 CHECK (single_row_enforcer = 1);

-- Create a unique index on the enforcer column to prevent multiple rows
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_single_row 
ON settings (single_row_enforcer);

-- Add a comment explaining the constraint
COMMENT ON COLUMN settings.single_row_enforcer IS 'Ensures only one settings row exists in the table';

-- Create a trigger to prevent insertions when a row already exists
CREATE OR REPLACE FUNCTION enforce_single_settings_row()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM settings) > 0 AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Only one settings row is allowed. Use UPDATE instead of INSERT.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS enforce_single_settings_trigger ON settings;

-- Create the trigger
CREATE TRIGGER enforce_single_settings_trigger
BEFORE INSERT ON settings
FOR EACH ROW
EXECUTE FUNCTION enforce_single_settings_row();

-- Add helpful comment to the table
COMMENT ON TABLE settings IS 'Application settings table - enforced to contain exactly one row. Use UPDATE operations only.';