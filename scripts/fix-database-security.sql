-- Fix Supabase Database Security Issues
-- This script addresses SECURITY DEFINER views and RLS issues identified by database linter

-- =====================================================
-- FIX 1: Remove SECURITY DEFINER from Views
-- =====================================================

-- Fix inventory_summary view
DROP VIEW IF EXISTS public.inventory_summary;
CREATE VIEW public.inventory_summary AS
SELECT 
    COUNT(*) as total_items,
    COALESCE(SUM(current_stock * COALESCE(unit_price, cost, 0)), 0) as total_inventory_value,
    COUNT(*) FILTER (WHERE current_stock = 0) as out_of_stock_count,
    COUNT(*) FILTER (WHERE stock_status_level = 'low-stock') as low_stock_count,
    COUNT(*) FILTER (WHERE stock_status_level = 'critical') as critical_reorder_count,
    COUNT(*) FILTER (WHERE stock_status_level = 'overstocked') as overstocked_count
FROM inventory_items;

-- Fix active_sessions view
DROP VIEW IF EXISTS public.active_sessions;
CREATE VIEW public.active_sessions AS
SELECT 
    id,
    user_id,
    session_token,
    created_at,
    last_activity,
    ip_address,
    user_agent
FROM user_sessions 
WHERE expires_at > NOW() 
    AND active = true;

-- Fix critical_inventory_items view
DROP VIEW IF EXISTS public.critical_inventory_items;
CREATE VIEW public.critical_inventory_items AS
SELECT 
    id,
    sku,
    product_name,
    current_stock,
    stock_status_level,
    days_until_stockout,
    sales_velocity,
    reorder_point,
    vendor,
    location,
    cost,
    unit_price
FROM inventory_items 
WHERE stock_status_level IN ('critical', 'out-of-stock') 
    OR current_stock = 0 
    OR (days_until_stockout IS NOT NULL AND days_until_stockout <= 7);

-- Fix low_stock_items view
DROP VIEW IF EXISTS public.low_stock_items;
CREATE VIEW public.low_stock_items AS
SELECT 
    id,
    sku,
    product_name,
    current_stock,
    stock_status_level,
    reorder_point,
    reorder_quantity,
    vendor,
    location,
    cost,
    unit_price,
    sales_velocity,
    days_until_stockout
FROM inventory_items 
WHERE stock_status_level = 'low-stock' 
    OR (reorder_point IS NOT NULL AND current_stock <= reorder_point);

-- Fix purchase_order_summary view
DROP VIEW IF EXISTS public.purchase_order_summary;
CREATE VIEW public.purchase_order_summary AS
SELECT 
    po.id,
    po.po_number,
    po.vendor_id,
    v.name as vendor_name,
    po.status,
    po.order_date,
    po.expected_date,
    po.total_amount,
    COUNT(poi.id) as total_items,
    SUM(poi.quantity) as total_quantity,
    SUM(CASE WHEN poi.received_quantity >= poi.quantity THEN 1 ELSE 0 END) as items_received,
    po.created_at,
    po.updated_at
FROM purchase_orders po
LEFT JOIN vendors v ON po.vendor_id = v.id
LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
GROUP BY po.id, v.name;

-- Fix out_of_stock_items view
DROP VIEW IF EXISTS public.out_of_stock_items;
CREATE VIEW public.out_of_stock_items AS
SELECT 
    id,
    sku,
    product_name,
    current_stock,
    stock_status_level,
    vendor,
    location,
    cost,
    unit_price,
    sales_last_30_days,
    sales_last_90_days,
    sales_velocity,
    last_sale_date,
    reorder_point,
    reorder_quantity
FROM inventory_items 
WHERE current_stock = 0 
    OR stock_status_level = 'out-of-stock';

-- =====================================================
-- FIX 2: Enable RLS on failed_items table
-- =====================================================

-- Enable Row Level Security on failed_items table
ALTER TABLE public.failed_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for failed_items table
-- Policy 1: Users can only see their own failed items (if user_id column exists)
-- If no user_id column exists, create a more restrictive policy

-- Check if user_id column exists and create appropriate policy
DO $$
BEGIN
    -- Check if user_id column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'failed_items' 
        AND column_name = 'user_id'
    ) THEN
        -- Create policy for user-specific access
        DROP POLICY IF EXISTS "Users can view their own failed items" ON public.failed_items;
        CREATE POLICY "Users can view their own failed items" 
        ON public.failed_items FOR SELECT 
        USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can insert their own failed items" ON public.failed_items;
        CREATE POLICY "Users can insert their own failed items" 
        ON public.failed_items FOR INSERT 
        WITH CHECK (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can update their own failed items" ON public.failed_items;
        CREATE POLICY "Users can update their own failed items" 
        ON public.failed_items FOR UPDATE 
        USING (auth.uid() = user_id) 
        WITH CHECK (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can delete their own failed items" ON public.failed_items;
        CREATE POLICY "Users can delete their own failed items" 
        ON public.failed_items FOR DELETE 
        USING (auth.uid() = user_id);
    ELSE
        -- Create restrictive policy for authenticated users only
        DROP POLICY IF EXISTS "Authenticated users can access failed items" ON public.failed_items;
        CREATE POLICY "Authenticated users can access failed items" 
        ON public.failed_items FOR ALL 
        USING (auth.role() = 'authenticated');
    END IF;
END
$$;

-- =====================================================
-- Additional Security Enhancements
-- =====================================================

-- Grant appropriate permissions to authenticated users for views
GRANT SELECT ON public.inventory_summary TO authenticated;
GRANT SELECT ON public.active_sessions TO authenticated;
GRANT SELECT ON public.critical_inventory_items TO authenticated;
GRANT SELECT ON public.low_stock_items TO authenticated;
GRANT SELECT ON public.purchase_order_summary TO authenticated;
GRANT SELECT ON public.out_of_stock_items TO authenticated;

-- Grant appropriate permissions for failed_items table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.failed_items TO authenticated;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Verify views are no longer SECURITY DEFINER
-- Run these queries to check the changes:

/*
-- Check view definitions (should not show SECURITY DEFINER)
SELECT schemaname, viewname, definition 
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN (
    'inventory_summary', 
    'active_sessions', 
    'critical_inventory_items', 
    'low_stock_items', 
    'purchase_order_summary', 
    'out_of_stock_items'
);

-- Check RLS status on failed_items table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'failed_items';

-- Check RLS policies on failed_items table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'failed_items';
*/
