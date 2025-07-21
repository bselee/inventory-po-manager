-- Verify Sync System Database Schema
-- Run this to check all required tables, columns, and functions exist

-- Check sync_logs table and columns
SELECT 
  'sync_logs table' as check_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'sync_logs'
  ) as exists,
  (
    SELECT array_agg(column_name ORDER BY ordinal_position)
    FROM information_schema.columns
    WHERE table_name = 'sync_logs'
  ) as columns;

-- Check failed_items table
SELECT 
  'failed_items table' as check_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'failed_items'
  ) as exists,
  (
    SELECT array_agg(column_name ORDER BY ordinal_position)
    FROM information_schema.columns
    WHERE table_name = 'failed_items'
  ) as columns;

-- Check settings table has new columns
SELECT 
  'settings alert columns' as check_name,
  EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'settings' 
    AND column_name IN ('alert_email', 'sendgrid_from_email')
  ) as exists,
  (
    SELECT array_agg(column_name)
    FROM information_schema.columns
    WHERE table_name = 'settings'
    AND column_name IN ('alert_email', 'sendgrid_from_email', 'sync_enabled', 'sync_frequency_minutes')
  ) as columns;

-- Check RPC functions exist
SELECT 
  'find_duplicate_skus function' as check_name,
  EXISTS (
    SELECT FROM pg_proc 
    WHERE proname = 'find_duplicate_skus'
  ) as exists;

SELECT 
  'get_sync_metrics function' as check_name,
  EXISTS (
    SELECT FROM pg_proc 
    WHERE proname = 'get_sync_metrics'
  ) as exists;

-- Check indexes
SELECT 
  'indexes' as check_name,
  array_agg(indexname) as index_list
FROM pg_indexes
WHERE tablename IN ('sync_logs', 'failed_items')
AND indexname LIKE 'idx_%';

-- Test RPC functions
SELECT 'Testing find_duplicate_skus' as test;
SELECT * FROM find_duplicate_skus() LIMIT 5;

SELECT 'Testing get_sync_metrics' as test;
SELECT * FROM get_sync_metrics(7);

-- Check sync_logs constraints
SELECT 
  'sync_logs status constraint' as check_name,
  conname,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'sync_logs_status_check';

-- Count records in key tables
SELECT 
  'sync_logs' as table_name, 
  COUNT(*) as record_count,
  COUNT(*) FILTER (WHERE status = 'running') as running_syncs,
  COUNT(*) FILTER (WHERE status = 'error') as failed_syncs,
  MAX(synced_at) as last_sync
FROM sync_logs
WHERE sync_type = 'finale_inventory';

SELECT 
  'inventory_items' as table_name,
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE stock < 0) as negative_stock,
  COUNT(*) FILTER (WHERE sku IS NULL) as missing_sku
FROM inventory_items;

-- Check for any stuck syncs
SELECT 
  'Stuck syncs check' as check_name,
  id,
  synced_at,
  EXTRACT(EPOCH FROM (NOW() - synced_at))/60 as minutes_running,
  metadata->>'progress' as progress
FROM sync_logs
WHERE status = 'running'
AND synced_at < NOW() - INTERVAL '30 minutes';