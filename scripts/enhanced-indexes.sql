-- Enhanced Database Indexes for Optimal Performance
-- Run this script in Supabase SQL Editor

-- =====================================================
-- PERFORMANCE INDEXES FOR SYNC OPTIMIZATION
-- =====================================================

-- 1. Sync Priority Index (Critical Items First)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_sync_priority 
ON inventory_items(finale_last_sync, stock, sales_velocity) 
WHERE stock <= reorder_point OR stock = 0;

-- 2. Change Detection Index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_change_detection
ON inventory_items(finale_id, finale_last_sync, cost, stock);

-- 3. Active Sync Items Index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_active_sync
ON inventory_items(finale_id, stock, last_updated)
WHERE finale_id IS NOT NULL;

-- 4. Critical Items Monitoring Index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_critical_monitoring
ON inventory_items(stock, reorder_point, sales_velocity)
WHERE stock <= reorder_point * 1.5;

-- 5. Real-time Alert Index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_realtime_alerts
ON inventory_items(sku, stock, reorder_point, cost)
WHERE stock <= reorder_point OR stock = 0;

-- =====================================================
-- SYNC PERFORMANCE INDEXES
-- =====================================================

-- 6. Sync Logs Performance Index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_logs_performance
ON sync_logs(sync_type, status, synced_at DESC, duration_ms);

-- 7. Sync Strategy Analysis Index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_logs_strategy_analysis
ON sync_logs(sync_type, synced_at DESC, items_processed, items_updated)
WHERE status = 'success';

-- 8. Failed Items Retry Index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_failed_items_retry
ON failed_items(retry_count, last_retry_at, resolved_at)
WHERE resolved_at IS NULL;

-- =====================================================
-- BUSINESS INTELLIGENCE INDEXES
-- =====================================================

-- 9. Sales Velocity Analysis Index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_sales_velocity
ON inventory_items(sales_last_30_days, sales_last_90_days, stock)
WHERE sales_last_30_days > 0 OR sales_last_90_days > 0;

-- 10. Vendor Performance Index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_vendor_performance
ON inventory_items(vendor, cost, stock, reorder_point)
WHERE vendor IS NOT NULL;

-- 11. Location-based Stock Index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_location_stock
ON inventory_items(location, stock, reorder_point)
WHERE location IS NOT NULL;

-- =====================================================
-- CHANGE TRACKING COLUMNS
-- =====================================================

-- Add columns for enhanced change detection
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS finale_last_modified TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS content_hash TEXT,
ADD COLUMN IF NOT EXISTS last_change_detected TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_priority INTEGER DEFAULT 5;

-- Add index for change tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_change_tracking
ON inventory_items(content_hash, last_change_detected, sync_priority);

-- =====================================================
-- INVENTORY ALERTS TABLE
-- =====================================================

-- Create table for storing real-time alerts
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL,
  product_name TEXT,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('out-of-stock', 'low-stock', 'reorder-needed', 'price-change', 'vendor-change')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  current_value DECIMAL(10,2),
  threshold_value DECIMAL(10,2),
  previous_value DECIMAL(10,2),
  acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT
);

-- Indexes for alerts table
CREATE INDEX IF NOT EXISTS idx_alerts_sku_type ON inventory_alerts(sku, alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity_created ON inventory_alerts(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_unacknowledged ON inventory_alerts(acknowledged, created_at DESC) WHERE acknowledged = false;

-- =====================================================
-- SYNC ANALYSIS TABLE
-- =====================================================

-- Create table for sync analysis machine learning
CREATE TABLE IF NOT EXISTS sync_analysis_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommended_strategy TEXT NOT NULL,
  urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  reasoning TEXT[],
  estimated_duration INTEGER,
  actual_duration INTEGER,
  success BOOLEAN,
  items_synced INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  accuracy_score DECIMAL(5,4), -- How accurate was the estimate
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analysis
CREATE INDEX IF NOT EXISTS idx_sync_analysis_strategy_accuracy 
ON sync_analysis_logs(recommended_strategy, accuracy_score, created_at DESC);

-- =====================================================
-- ENHANCED SYNC FUNCTIONS
-- =====================================================

-- Function to get items needing sync based on strategy
CREATE OR REPLACE FUNCTION get_items_needing_sync(
  strategy TEXT DEFAULT 'smart',
  limit_count INTEGER DEFAULT 1000
)
RETURNS TABLE(id UUID, sku TEXT, priority INTEGER) AS $$
BEGIN
  CASE strategy
    WHEN 'critical' THEN
      RETURN QUERY
      SELECT i.id, i.sku, 
        CASE 
          WHEN i.stock = 0 THEN 100
          WHEN i.stock <= i.reorder_point THEN 90
          WHEN (i.sales_last_30_days > 0 AND i.sales_last_30_days / 30.0 * 7 > i.stock) THEN 80
          ELSE 50
        END as priority
      FROM inventory_items i
      WHERE i.stock <= i.reorder_point 
         OR i.stock = 0
         OR i.finale_last_sync < NOW() - INTERVAL '4 hours'
      ORDER BY priority DESC
      LIMIT limit_count;
      
    WHEN 'smart' THEN
      RETURN QUERY
      SELECT i.id, i.sku, 
        CASE
          WHEN i.finale_last_sync IS NULL THEN 80
          WHEN i.finale_last_sync < NOW() - INTERVAL '1 day' THEN 70
          WHEN i.content_hash IS NULL THEN 60
          ELSE 40
        END as priority
      FROM inventory_items i
      WHERE i.finale_last_sync IS NULL 
         OR i.finale_last_sync < NOW() - INTERVAL '1 day'
         OR i.content_hash IS NULL
      ORDER BY priority DESC, i.finale_last_sync ASC NULLS FIRST
      LIMIT limit_count;
      
    WHEN 'inventory' THEN
      RETURN QUERY
      SELECT i.id, i.sku, 30 as priority
      FROM inventory_items i
      WHERE i.finale_last_sync IS NULL 
         OR i.finale_last_sync < NOW() - INTERVAL '2 hours'
      ORDER BY i.sales_last_30_days DESC NULLS LAST
      LIMIT limit_count;
      
    ELSE -- 'full'
      RETURN QUERY
      SELECT i.id, i.sku, 10 as priority
      FROM inventory_items i
      ORDER BY i.sku
      LIMIT limit_count;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate sync statistics
CREATE OR REPLACE FUNCTION calculate_sync_efficiency()
RETURNS TABLE(
  avg_change_rate DECIMAL(5,2),
  avg_sync_duration INTEGER,
  success_rate DECIMAL(5,2),
  items_per_second DECIMAL(8,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    AVG(CASE WHEN items_processed > 0 THEN (items_updated::DECIMAL / items_processed) * 100 ELSE 0 END) as avg_change_rate,
    AVG(duration_ms) as avg_sync_duration,
    (COUNT(*) FILTER (WHERE status = 'success')::DECIMAL / COUNT(*)) * 100 as success_rate,
    AVG(CASE WHEN duration_ms > 0 THEN items_processed::DECIMAL / (duration_ms / 1000.0) ELSE 0 END) as items_per_second
  FROM sync_logs 
  WHERE synced_at >= NOW() - INTERVAL '30 days'
    AND sync_type = 'finale_inventory';
END;
$$ LANGUAGE plpgsql;

-- Function to get critical items summary
CREATE OR REPLACE FUNCTION get_critical_items_summary()
RETURNS TABLE(
  out_of_stock INTEGER,
  need_reorder INTEGER,
  low_stock INTEGER,
  total_critical INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE stock = 0)::INTEGER as out_of_stock,
    COUNT(*) FILTER (WHERE stock > 0 AND stock <= reorder_point)::INTEGER as need_reorder,
    COUNT(*) FILTER (WHERE stock > reorder_point AND stock <= reorder_point * 1.5)::INTEGER as low_stock,
    COUNT(*) FILTER (WHERE stock <= reorder_point)::INTEGER as total_critical
  FROM inventory_items;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PERFORMANCE OPTIMIZATION SETTINGS
-- =====================================================

-- Update table statistics for better query planning
ANALYZE inventory_items;
ANALYZE sync_logs;
ANALYZE failed_items;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON INDEX idx_inventory_sync_priority IS 'Optimizes sync priority queries for critical items';
COMMENT ON INDEX idx_inventory_change_detection IS 'Speeds up change detection algorithms';
COMMENT ON INDEX idx_inventory_critical_monitoring IS 'Enables fast real-time critical item monitoring';
COMMENT ON FUNCTION get_items_needing_sync IS 'Returns prioritized items for sync based on strategy';
COMMENT ON FUNCTION calculate_sync_efficiency IS 'Calculates sync performance metrics for optimization';
COMMENT ON TABLE inventory_alerts IS 'Stores real-time inventory alerts for monitoring';
COMMENT ON TABLE sync_analysis_logs IS 'Machine learning data for sync optimization';
