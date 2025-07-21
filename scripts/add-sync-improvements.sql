-- Add failed_items table for tracking persistently failing items
CREATE TABLE IF NOT EXISTS failed_items (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(255) NOT NULL,
  sync_id UUID REFERENCES sync_logs(id),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_failed_items_sku ON failed_items(sku);
CREATE INDEX IF NOT EXISTS idx_failed_items_unresolved ON failed_items(resolved_at) WHERE resolved_at IS NULL;

-- Add alert_email and sendgrid_from_email to settings if not exists
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS alert_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS sendgrid_from_email VARCHAR(255);

-- Create RPC function to find duplicate SKUs
CREATE OR REPLACE FUNCTION find_duplicate_skus()
RETURNS TABLE(sku text, count bigint, ids uuid[])
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.sku,
    COUNT(*)::bigint as count,
    ARRAY_AGG(i.id) as ids
  FROM inventory_items i
  WHERE i.sku IS NOT NULL
  GROUP BY i.sku
  HAVING COUNT(*) > 1;
END;
$$;

-- Create function to get sync metrics
CREATE OR REPLACE FUNCTION get_sync_metrics(days_back integer DEFAULT 7)
RETURNS TABLE(
  metric_name text,
  metric_value numeric,
  metric_detail jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Success rate
  RETURN QUERY
  SELECT 
    'success_rate'::text,
    ROUND((COUNT(*) FILTER (WHERE status = 'success')::numeric / NULLIF(COUNT(*), 0)) * 100, 2),
    jsonb_build_object(
      'total_syncs', COUNT(*),
      'successful', COUNT(*) FILTER (WHERE status = 'success'),
      'failed', COUNT(*) FILTER (WHERE status = 'error'),
      'partial', COUNT(*) FILTER (WHERE status = 'partial')
    )
  FROM sync_logs
  WHERE sync_type = 'finale_inventory'
    AND synced_at >= NOW() - INTERVAL '1 day' * days_back;

  -- Average duration
  RETURN QUERY
  SELECT 
    'avg_duration_seconds'::text,
    ROUND(AVG(duration_ms) / 1000.0, 2),
    jsonb_build_object(
      'min_duration_ms', MIN(duration_ms),
      'max_duration_ms', MAX(duration_ms),
      'total_syncs', COUNT(*)
    )
  FROM sync_logs
  WHERE sync_type = 'finale_inventory'
    AND synced_at >= NOW() - INTERVAL '1 day' * days_back
    AND duration_ms IS NOT NULL;

  -- Items per sync
  RETURN QUERY
  SELECT 
    'avg_items_per_sync'::text,
    ROUND(AVG(items_processed), 0),
    jsonb_build_object(
      'total_items_processed', SUM(items_processed),
      'total_items_updated', SUM(items_updated)
    )
  FROM sync_logs
  WHERE sync_type = 'finale_inventory'
    AND synced_at >= NOW() - INTERVAL '1 day' * days_back
    AND items_processed IS NOT NULL;
END;
$$;

-- Add comment to tables
COMMENT ON TABLE failed_items IS 'Tracks inventory items that consistently fail to sync';
COMMENT ON COLUMN failed_items.resolved_at IS 'Set when the item successfully syncs after failures';