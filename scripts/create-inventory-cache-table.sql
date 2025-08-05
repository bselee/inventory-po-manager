-- Create inventory cache table for hybrid approach
-- This stores Finale reporting data for faster subsequent loads

CREATE TABLE IF NOT EXISTS inventory_cache (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  product_name TEXT,
  current_stock INTEGER DEFAULT 0,
  cost DECIMAL(10, 2),
  vendor TEXT,
  location TEXT,
  reorder_point INTEGER,
  max_stock INTEGER,
  last_updated TIMESTAMPTZ,
  data_source TEXT DEFAULT 'finale_report',
  finale_data JSONB, -- Store original report data for flexibility
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_cache_sku ON inventory_cache(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_cache_vendor ON inventory_cache(vendor);
CREATE INDEX IF NOT EXISTS idx_inventory_cache_cached_at ON inventory_cache(cached_at);
CREATE INDEX IF NOT EXISTS idx_inventory_cache_current_stock ON inventory_cache(current_stock);

-- Enable RLS (Row Level Security)
ALTER TABLE inventory_cache ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON inventory_cache
FOR ALL USING (auth.role() = 'authenticated');

-- Add comment
COMMENT ON TABLE inventory_cache IS 'Cache table for Finale inventory data fetched via Reporting API. Provides fast fallback when direct API calls are slow or fail.';
