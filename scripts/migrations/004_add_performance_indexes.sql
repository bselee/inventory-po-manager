-- Migration: Add Performance Indexes
-- Description: Add missing indexes to improve query performance
-- Date: 2024

-- Inventory Items Indexes
-- Index for filtering by vendor (frequently used in queries)
CREATE INDEX IF NOT EXISTS idx_inventory_vendor_name 
ON inventory_items(vendor_name);

-- Index for filtering by location
CREATE INDEX IF NOT EXISTS idx_inventory_location 
ON inventory_items(location);

-- Index for filtering by active status
CREATE INDEX IF NOT EXISTS idx_inventory_active 
ON inventory_items(active);

-- Composite index for common filtering pattern (active + vendor)
CREATE INDEX IF NOT EXISTS idx_inventory_active_vendor 
ON inventory_items(active, vendor_name);

-- Index for stock status queries (quantity_on_hand, reorder_point)
CREATE INDEX IF NOT EXISTS idx_inventory_stock_status 
ON inventory_items(quantity_on_hand, reorder_point);

-- Index for sales velocity analysis
CREATE INDEX IF NOT EXISTS idx_inventory_sales_30 
ON inventory_items(sales_last_30_days);

CREATE INDEX IF NOT EXISTS idx_inventory_sales_90 
ON inventory_items(sales_last_90_days);

-- Index for sorting by last modified
CREATE INDEX IF NOT EXISTS idx_inventory_last_modified 
ON inventory_items(last_modified_date DESC);

-- Purchase Orders Indexes
-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status 
ON purchase_orders(status);

-- Index for filtering by vendor
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor 
ON purchase_orders(vendor_id);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status_vendor 
ON purchase_orders(status, vendor_id);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created 
ON purchase_orders(created_at DESC);

-- Vendors Indexes
-- Index for vendor name searches
CREATE INDEX IF NOT EXISTS idx_vendors_name 
ON vendors(name);

-- Index for active vendors
CREATE INDEX IF NOT EXISTS idx_vendors_is_active 
ON vendors(is_active);

-- Sync Logs Indexes
-- Index for sync status monitoring
CREATE INDEX IF NOT EXISTS idx_sync_logs_status 
ON sync_logs(status);

-- Index for sync type filtering
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_type 
ON sync_logs(sync_type);

-- Composite index for monitoring queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_status_type_started 
ON sync_logs(status, sync_type, started_at DESC);

-- Settings Table Index (though it's single row, good practice)
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_singleton 
ON settings(id) WHERE id = 1;

-- Auth Tables Indexes (if authentication is enabled)
-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_role 
ON users(role);

CREATE INDEX IF NOT EXISTS idx_users_is_active 
ON users(is_active);

-- Auth sessions indexes
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token 
ON auth_sessions(session_token);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_expires 
ON auth_sessions(user_id, expires_at);

-- Auth audit log indexes
CREATE INDEX IF NOT EXISTS idx_auth_audit_user_created 
ON auth_audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_audit_action 
ON auth_audit_logs(action);

-- Performance: Partial indexes for common filtered queries
-- Index for low stock items (quantity < reorder point)
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock 
ON inventory_items(quantity_on_hand, reorder_point) 
WHERE quantity_on_hand < reorder_point;

-- Index for active items only (most queries filter by active=true)
CREATE INDEX IF NOT EXISTS idx_inventory_active_only 
ON inventory_items(sku, product_name, vendor_name) 
WHERE active = true;

-- Analyze tables to update statistics after creating indexes
ANALYZE inventory_items;
ANALYZE purchase_orders;
ANALYZE vendors;
ANALYZE sync_logs;
ANALYZE settings;
ANALYZE users;
ANALYZE auth_sessions;
ANALYZE auth_audit_logs;