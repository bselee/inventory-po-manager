-- Database Hardening Script
-- Adds comprehensive constraints, indexes, and security measures

-- =============================================================================
-- CONSTRAINT HARDENING
-- =============================================================================

-- Inventory Items Table Hardening
ALTER TABLE inventory_items 
  -- Add NOT NULL constraints where critical
  ALTER COLUMN sku SET NOT NULL,
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN current_stock SET NOT NULL,
  ALTER COLUMN minimum_stock SET NOT NULL,
  ALTER COLUMN unit_price SET NOT NULL,
  
  -- Add CHECK constraints for data validation
  ADD CONSTRAINT check_current_stock_non_negative CHECK (current_stock >= 0),
  ADD CONSTRAINT check_minimum_stock_non_negative CHECK (minimum_stock >= 0),
  ADD CONSTRAINT check_maximum_stock_reasonable CHECK (maximum_stock IS NULL OR maximum_stock >= minimum_stock),
  ADD CONSTRAINT check_unit_price_positive CHECK (unit_price > 0),
  ADD CONSTRAINT check_sku_format CHECK (sku ~ '^[A-Z0-9-_]{2,50}$'),
  ADD CONSTRAINT check_name_length CHECK (char_length(name) BETWEEN 1 AND 255);

-- Create unique constraint on SKU if not exists
ALTER TABLE inventory_items 
  ADD CONSTRAINT unique_inventory_sku UNIQUE (sku);

-- Purchase Orders Table Hardening
ALTER TABLE purchase_orders
  ALTER COLUMN vendor_id SET NOT NULL,
  ALTER COLUMN po_number SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN order_date SET NOT NULL,
  ADD CONSTRAINT check_po_number_format CHECK (po_number ~ '^PO-[0-9]{4,10}$'),
  ADD CONSTRAINT check_status_valid CHECK (status IN ('draft', 'submitted', 'approved', 'received', 'cancelled')),
  ADD CONSTRAINT check_total_amount_non_negative CHECK (total_amount >= 0);

-- Sync Logs Table Hardening
ALTER TABLE sync_logs
  ALTER COLUMN sync_type SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN synced_at SET NOT NULL,
  ADD CONSTRAINT check_sync_type_valid CHECK (sync_type IN ('finale_inventory', 'manual_inventory', 'purchase_order')),
  ADD CONSTRAINT check_sync_status_valid CHECK (status IN ('success', 'error', 'partial', 'running')),
  ADD CONSTRAINT check_items_processed_non_negative CHECK (items_processed >= 0),
  ADD CONSTRAINT check_items_updated_reasonable CHECK (items_updated <= items_processed OR items_updated IS NULL),
  ADD CONSTRAINT check_duration_reasonable CHECK (duration_ms > 0 OR duration_ms IS NULL);

-- Failed Items Table Hardening
ALTER TABLE failed_items
  ALTER COLUMN sku SET NOT NULL,
  ALTER COLUMN sync_id SET NOT NULL,
  ALTER COLUMN retry_count SET NOT NULL,
  ADD CONSTRAINT check_retry_count_reasonable CHECK (retry_count >= 0 AND retry_count <= 10),
  ADD CONSTRAINT check_resolved_after_created CHECK (resolved_at IS NULL OR resolved_at >= created_at),
  ADD CONSTRAINT check_last_retry_after_created CHECK (last_retry_at IS NULL OR last_retry_at >= created_at);

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Inventory Items Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_category ON inventory_items(category) WHERE category IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_supplier ON inventory_items(supplier) WHERE supplier IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_low_stock ON inventory_items(current_stock, minimum_stock) WHERE current_stock <= minimum_stock;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_active ON inventory_items(active) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_last_restocked ON inventory_items(last_restocked) WHERE last_restocked IS NOT NULL;

-- Purchase Orders Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_orders_vendor_date ON purchase_orders(vendor_id, order_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_orders_status_date ON purchase_orders(status, order_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_orders_po_number ON purchase_orders(po_number);

-- Sync Logs Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_logs_type_date ON sync_logs(sync_type, synced_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_logs_status_date ON sync_logs(status, synced_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_logs_recent ON sync_logs(synced_at DESC) WHERE synced_at >= NOW() - INTERVAL '30 days';

-- =============================================================================
-- SECURITY ENHANCEMENTS
-- =============================================================================

-- Row Level Security Policies (if using RLS)
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_items ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY inventory_items_policy ON inventory_items
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY purchase_orders_policy ON purchase_orders
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY sync_logs_policy ON sync_logs
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY failed_items_policy ON failed_items
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- AUDIT TRIGGERS
-- =============================================================================

-- Create audit table for tracking changes
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  changed_by TEXT DEFAULT current_user
);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, operation, old_data)
    VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, operation, old_data, new_data)
    VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, operation, new_data)
    VALUES (TG_TABLE_NAME, TG_OP, row_to_json(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add audit triggers to critical tables
DROP TRIGGER IF EXISTS audit_inventory_items ON inventory_items;
CREATE TRIGGER audit_inventory_items
  AFTER INSERT OR UPDATE OR DELETE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_purchase_orders ON purchase_orders;
CREATE TRIGGER audit_purchase_orders
  AFTER INSERT OR UPDATE OR DELETE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =============================================================================
-- DATA VALIDATION FUNCTIONS
-- =============================================================================

-- Function to validate inventory data integrity
CREATE OR REPLACE FUNCTION validate_inventory_integrity()
RETURNS TABLE(
  issue_type TEXT,
  issue_count BIGINT,
  sample_records JSONB
) LANGUAGE plpgsql AS $$
BEGIN
  -- Check for duplicate SKUs
  RETURN QUERY
  SELECT 
    'duplicate_skus'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_agg(jsonb_build_object('sku', sku, 'count', cnt, 'ids', ids))
  FROM (
    SELECT sku, COUNT(*) as cnt, array_agg(id) as ids
    FROM inventory_items
    GROUP BY sku
    HAVING COUNT(*) > 1
  ) duplicates;

  -- Check for negative stock
  RETURN QUERY
  SELECT 
    'negative_stock'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_agg(jsonb_build_object('id', id, 'sku', sku, 'current_stock', current_stock))
  FROM inventory_items
  WHERE current_stock < 0;

  -- Check for missing critical data
  RETURN QUERY
  SELECT 
    'missing_critical_data'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_agg(jsonb_build_object('id', id, 'sku', sku, 'missing_fields', 
      CASE 
        WHEN name IS NULL THEN 'name'
        WHEN unit_price IS NULL THEN 'unit_price'
        WHEN current_stock IS NULL THEN 'current_stock'
        ELSE 'unknown'
      END))
  FROM inventory_items
  WHERE name IS NULL OR unit_price IS NULL OR current_stock IS NULL;
END;
$$;

-- =============================================================================
-- COMPREHENSIVE COMMENTS
-- =============================================================================

-- Table comments
COMMENT ON TABLE inventory_items IS 'Core inventory management table with stock tracking and supplier information';
COMMENT ON TABLE purchase_orders IS 'Purchase order management with vendor relationships and status tracking';
COMMENT ON TABLE sync_logs IS 'Comprehensive logging of all synchronization operations with performance metrics';
COMMENT ON TABLE failed_items IS 'Tracks inventory items that consistently fail to sync with retry logic';
COMMENT ON TABLE audit_log IS 'Comprehensive audit trail for all data changes across critical tables';

-- Column comments for inventory_items
COMMENT ON COLUMN inventory_items.sku IS 'Unique stock keeping unit identifier, alphanumeric with hyphens/underscores';
COMMENT ON COLUMN inventory_items.current_stock IS 'Current available quantity on hand, must be non-negative';
COMMENT ON COLUMN inventory_items.minimum_stock IS 'Reorder threshold level, must be non-negative';
COMMENT ON COLUMN inventory_items.maximum_stock IS 'Maximum recommended stock level, must be >= minimum_stock if set';
COMMENT ON COLUMN inventory_items.unit_price IS 'Base unit price for costing calculations, must be positive';
COMMENT ON COLUMN inventory_items.last_restocked IS 'Timestamp of most recent stock replenishment';

-- Column comments for failed_items
COMMENT ON COLUMN failed_items.retry_count IS 'Number of automatic retry attempts made, capped at 10';
COMMENT ON COLUMN failed_items.metadata IS 'Additional context about the failure including error details and sync context';
COMMENT ON COLUMN failed_items.resolved_at IS 'Timestamp when the item successfully synced after failures';

-- Column comments for settings
COMMENT ON COLUMN settings.alert_email IS 'Primary email address for receiving sync failure and critical system alerts';
COMMENT ON COLUMN settings.sendgrid_from_email IS 'Sender email address for outbound system notifications via SendGrid';
