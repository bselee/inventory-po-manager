-- 🔧 Complete Vendors Table Setup and Data Seeding
-- This script will fix the schema and populate vendors data

-- Step 1: Add missing columns to vendors table
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS notes TEXT;

-- Step 2: Add unique constraint on name (required for ON CONFLICT)
ALTER TABLE vendors ADD CONSTRAINT IF NOT EXISTS unique_vendor_name UNIQUE (name);

-- Step 3: Insert sample vendors (now with proper conflict handling)
INSERT INTO vendors (name, contact_name, email, phone, active) VALUES 
('BuildASoil', 'Jeremy Silva', 'orders@buildasoil.com', '720-398-4042', true),
('Mountain Rose Herbs', 'Wholesale Department', 'wholesale@mountainroseherbs.com', '800-879-3337', true),
('Azure Standard', 'Ordering Department', 'info@azurestandard.com', '541-467-2230', true),
('Frontier Co-op', 'Customer Service', 'customercare@frontiercoop.com', '800-669-3275', true),
('Starwest Botanicals', 'Sales Team', 'sales@starwest-botanicals.com', '800-800-4372', true)
ON CONFLICT (name) DO NOTHING;

-- Step 4: Verify the data
SELECT name, contact_name, email, phone, active, created_at 
FROM vendors 
ORDER BY created_at DESC;
