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