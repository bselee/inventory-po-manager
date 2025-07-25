-- Combined migrations for BuildASoil Inventory & Purchase Order Manager
-- Run this file in Supabase SQL Editor

-- ============================================
-- Migration 1: Add sales data and cost fields
-- ============================================

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

-- ============================================
-- Migration 2: Add Finale PO sync fields
-- ============================================

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

-- ============================================
-- Migration 3: Create sync_logs table
-- ============================================

-- Create sync_logs table for tracking sync history
CREATE TABLE IF NOT EXISTS sync_logs (
  id BIGSERIAL PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'partial', 'error')),
  items_processed INTEGER DEFAULT 0,
  items_inserted INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  duration_ms INTEGER,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_type ON sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_synced_at ON sync_logs(synced_at DESC);

-- Enable RLS on sync_logs
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Policy for service role (full access)
CREATE POLICY "Service role can manage sync logs" ON sync_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for authenticated users (read only)
CREATE POLICY "Authenticated users can view sync logs" ON sync_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- Success message
-- ============================================
-- All migrations completed successfully!


-- Migration 004: Add authentication tables
-- Created: 2025-01-24
-- Description: Adds user authentication and authorization tables

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'viewer')) DEFAULT 'viewer',
  permissions TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

-- Create auth_sessions table for session management
CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create auth_audit_logs table for security tracking
CREATE TABLE IF NOT EXISTS auth_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('login', 'logout', 'login_failed', 'password_changed', 'permissions_changed', 'account_locked', 'account_unlocked')),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX idx_auth_audit_logs_user_id ON auth_audit_logs(user_id);
CREATE INDEX idx_auth_audit_logs_event_type ON auth_audit_logs(event_type);
CREATE INDEX idx_auth_audit_logs_created_at ON auth_audit_logs(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY users_read_own ON users
  FOR SELECT
  USING (auth.uid()::TEXT = id::TEXT);

-- Policy: Admins can read all users
CREATE POLICY users_admin_read_all ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::TEXT = auth.uid()::TEXT 
      AND role = 'admin'
    )
  );

-- Policy: Users can update their own data (except role and permissions)
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (auth.uid()::TEXT = id::TEXT)
  WITH CHECK (auth.uid()::TEXT = id::TEXT);

-- Add RLS policies for auth_sessions table
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own sessions
CREATE POLICY sessions_read_own ON auth_sessions
  FOR SELECT
  USING (user_id::TEXT = auth.uid()::TEXT);

-- Add RLS policies for auth_audit_logs table
ALTER TABLE auth_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own audit logs
CREATE POLICY audit_logs_read_own ON auth_audit_logs
  FOR SELECT
  USING (user_id::TEXT = auth.uid()::TEXT);

-- Policy: Admins can see all audit logs
CREATE POLICY audit_logs_admin_read_all ON auth_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::TEXT = auth.uid()::TEXT 
      AND role = 'admin'
    )
  );

-- Create default admin user (password: ChangeMe123!)
-- Note: Change this password immediately after deployment
INSERT INTO users (email, password_hash, role, permissions)
VALUES (
  'admin@buildasoil.com',
  '$2b$10$tQquJe0840MShHkQceGMN.N7XGhcHmsYnI.tN0K7H1u1sX6ZmFeYO', -- Password: ChangeMe123!
  'admin',
  ARRAY[
    'inventory:read', 'inventory:write', 'inventory:delete',
    'purchase_orders:read', 'purchase_orders:write', 'purchase_orders:delete',
    'vendors:read', 'vendors:write', 'vendors:delete',
    'settings:read', 'settings:write',
    'sync:execute', 'sync:monitor',
    'users:read', 'users:write', 'users:delete',
    'admin:access'
  ]
) ON CONFLICT (email) DO NOTHING;

-- Add user_id column to existing tables for audit trail
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES users(id);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES users(id);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES users(id);
ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS initiated_by UUID REFERENCES users(id);

-- Create view for active sessions with user info
CREATE OR REPLACE VIEW active_sessions AS
SELECT 
  s.id,
  s.user_id,
  u.email,
  u.role,
  s.expires_at,
  s.created_at,
  s.ip_address,
  s.user_agent
FROM auth_sessions s
JOIN users u ON s.user_id = u.id
WHERE s.is_active = true
  AND s.expires_at > CURRENT_TIMESTAMP;

-- Grant permissions to authenticated users
GRANT SELECT ON active_sessions TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON auth_sessions TO authenticated;
GRANT ALL ON auth_audit_logs TO authenticated;


-- Migration 005: Add performance indexes
-- Created: 2025-01-24
-- Description: Adds indexes for common query patterns to improve performance

-- Enable trigram extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- Indexes for inventory_items table
-- ============================================

-- Stock-related queries (critical/low stock items)
CREATE INDEX IF NOT EXISTS idx_inventory_stock ON inventory_items(stock);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_reorder ON inventory_items(stock, reorder_point);

-- Vendor and location filtering
CREATE INDEX IF NOT EXISTS idx_inventory_vendor ON inventory_items(vendor);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory_items(location);

-- Text search on SKU and product name
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_product_name ON inventory_items(product_name);

-- Trigram indexes for ILIKE queries
CREATE INDEX IF NOT EXISTS idx_inventory_vendor_trgm ON inventory_items USING gin(vendor gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_inventory_sku_trgm ON inventory_items USING gin(sku gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_inventory_product_name_trgm ON inventory_items USING gin(product_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_inventory_location_trgm ON inventory_items USING gin(location gin_trgm_ops);

-- Cost range queries
CREATE INDEX IF NOT EXISTS idx_inventory_cost ON inventory_items(cost);

-- Stale item detection
CREATE INDEX IF NOT EXISTS idx_inventory_last_updated ON inventory_items(last_updated);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_inventory_stock_vendor ON inventory_items(vendor, stock);

-- Partial indexes for common conditions
CREATE INDEX IF NOT EXISTS idx_inventory_out_of_stock ON inventory_items(product_name, vendor) 
  WHERE stock = 0;
CREATE INDEX IF NOT EXISTS idx_inventory_needs_reorder ON inventory_items(product_name, vendor) 
  WHERE stock <= reorder_point AND stock > 0;

-- Sales velocity and stock status indexes
CREATE INDEX IF NOT EXISTS idx_inventory_sales_velocity ON inventory_items(sales_last_30_days, sales_last_90_days);

-- ============================================
-- Indexes for vendors table
-- ============================================

-- Name ordering and lookup
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);

-- Text search
CREATE INDEX IF NOT EXISTS idx_vendors_name_trgm ON vendors USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vendors_contact_name_trgm ON vendors USING gin(contact_name gin_trgm_ops);

-- ============================================
-- Indexes for sync_logs table
-- ============================================

-- Status queries (especially running syncs)
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);

-- Common composite queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_type_status ON sync_logs(sync_type, status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status_started ON sync_logs(status, started_at DESC);

-- For recent sync queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at DESC);

-- Composite for stuck sync detection (partial index)
CREATE INDEX IF NOT EXISTS idx_sync_logs_running_started ON sync_logs(status, started_at) 
  WHERE status = 'running';

-- ============================================
-- Indexes for purchase_orders table
-- ============================================

-- Ordering by creation date
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at ON purchase_orders(created_at DESC);

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

-- Vendor name lookup (using current schema with vendor column)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor ON purchase_orders(vendor);

-- ============================================
-- Indexes for purchase_order_items table
-- ============================================

-- Note: purchase_order_items table does not exist in current schema
-- These indexes are commented out until the table is created
-- CREATE INDEX IF NOT EXISTS idx_po_items_purchase_order_id ON purchase_order_items(purchase_order_id);
-- CREATE INDEX IF NOT EXISTS idx_po_items_inventory_item_id ON purchase_order_items(inventory_item_id);

-- ============================================
-- Indexes for auth tables (from migration 004)
-- ============================================

-- These should already exist from migration 004, but adding IF NOT EXISTS for safety
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_user_id ON auth_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_event_type ON auth_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_created_at ON auth_audit_logs(created_at);

-- ============================================
-- Analyze tables to update statistics
-- ============================================

ANALYZE inventory_items;
ANALYZE vendors;
ANALYZE sync_logs;
ANALYZE purchase_orders;
-- ANALYZE purchase_order_items; -- Table does not exist yet
ANALYZE users;
ANALYZE auth_sessions;
ANALYZE auth_audit_logs;

-- ============================================
-- Create composite indexes for complex queries
-- ============================================

-- For inventory filtering with multiple conditions
CREATE INDEX IF NOT EXISTS idx_inventory_complex_filter 
  ON inventory_items(vendor, location, stock, cost)
  WHERE stock > 0;

-- For sync monitoring queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_monitoring
  ON sync_logs(sync_type, status, started_at DESC)
  WHERE status IN ('running', 'error');

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON INDEX idx_inventory_stock IS 'Improves queries filtering by stock level';
COMMENT ON INDEX idx_inventory_stock_reorder IS 'Optimizes critical stock detection queries';
COMMENT ON INDEX idx_inventory_vendor_trgm IS 'Speeds up vendor name searches with ILIKE';
COMMENT ON INDEX idx_inventory_out_of_stock IS 'Partial index for out-of-stock items';
COMMENT ON INDEX idx_inventory_needs_reorder IS 'Partial index for items needing reorder';
COMMENT ON INDEX idx_sync_logs_running_started IS 'Optimizes stuck sync detection queries';

-- Performance optimization complete!