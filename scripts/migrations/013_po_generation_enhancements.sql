-- Migration: Purchase Order Generation Enhancements
-- Adds fields needed for intelligent PO generation and tracking

-- Step 1: Add new fields to inventory_items for PO generation
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS order_increment INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_ordered_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_order_quantity INTEGER;

-- Step 2: Add new fields to purchase_orders for tracking
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS urgency_level TEXT CHECK (urgency_level IN ('critical', 'high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by TEXT,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejected_by TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS created_by TEXT,
ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT FALSE;

-- Step 3: Create audit_logs table for PO actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    user_id TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 4: Create index for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Step 5: Add indexes for PO generation queries
CREATE INDEX IF NOT EXISTS idx_inventory_reorder_needed 
ON inventory_items(active, discontinued, current_stock, reorder_point) 
WHERE active = true AND discontinued = false;

CREATE INDEX IF NOT EXISTS idx_inventory_vendor 
ON inventory_items(vendor_id, vendor_name);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_status_date 
ON purchase_orders(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_urgency 
ON purchase_orders(urgency_level, status);

-- Step 6: Create a view for items needing reorder
CREATE OR REPLACE VIEW items_needing_reorder AS
SELECT 
    ii.*,
    CASE 
        WHEN ii.sales_velocity_30d > 0 THEN 
            FLOOR(ii.current_stock::NUMERIC / ii.sales_velocity_30d)
        ELSE 999
    END as days_until_stockout,
    CASE 
        WHEN ii.sales_velocity_30d > 0 AND FLOOR(ii.current_stock::NUMERIC / ii.sales_velocity_30d) <= 7 THEN 'critical'
        WHEN ii.sales_velocity_30d > 0 AND FLOOR(ii.current_stock::NUMERIC / ii.sales_velocity_30d) <= 14 THEN 'high'
        WHEN ii.sales_velocity_30d > 0 AND FLOOR(ii.current_stock::NUMERIC / ii.sales_velocity_30d) <= 30 THEN 'medium'
        ELSE 'low'
    END as urgency_level,
    GREATEST(
        ii.reorder_quantity,
        CEIL(COALESCE(ii.sales_velocity_30d, 0) * COALESCE(ii.lead_time_days, 7) * 1.5),
        ii.min_order_quantity
    ) as suggested_order_quantity
FROM inventory_items ii
WHERE 
    ii.active = true 
    AND ii.discontinued = false
    AND (
        ii.current_stock <= ii.reorder_point
        OR (ii.current_stock < 50 AND ii.sales_velocity_30d > 0)
    )
ORDER BY 
    CASE 
        WHEN ii.sales_velocity_30d > 0 THEN 
            FLOOR(ii.current_stock::NUMERIC / ii.sales_velocity_30d)
        ELSE 999
    END ASC;

-- Step 7: Create function to calculate EOQ (Economic Order Quantity)
CREATE OR REPLACE FUNCTION calculate_eoq(
    annual_demand NUMERIC,
    order_cost NUMERIC DEFAULT 50,
    holding_cost_rate NUMERIC DEFAULT 0.25
) RETURNS INTEGER AS $$
BEGIN
    IF annual_demand <= 0 THEN
        RETURN 0;
    END IF;
    
    RETURN CEIL(SQRT((2 * annual_demand * order_cost) / holding_cost_rate));
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create function to generate PO number
CREATE OR REPLACE FUNCTION generate_po_number() RETURNS TEXT AS $$
DECLARE
    year_part TEXT;
    sequence_part TEXT;
    new_po_number TEXT;
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Get the next sequence number for this year
    SELECT LPAD((COALESCE(MAX(SUBSTRING(po_number FROM 8 FOR 6)::INTEGER), 0) + 1)::TEXT, 6, '0')
    INTO sequence_part
    FROM purchase_orders
    WHERE po_number LIKE 'PO-' || year_part || '-%';
    
    new_po_number := 'PO-' || year_part || '-' || sequence_part;
    
    RETURN new_po_number;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Add helpful comments
COMMENT ON COLUMN inventory_items.lead_time_days IS 'Expected days from order to delivery';
COMMENT ON COLUMN inventory_items.min_order_quantity IS 'Minimum quantity that can be ordered';
COMMENT ON COLUMN inventory_items.order_increment IS 'Order quantity must be multiple of this value';
COMMENT ON COLUMN purchase_orders.urgency_level IS 'Urgency based on days until stockout';
COMMENT ON COLUMN purchase_orders.auto_generated IS 'Whether PO was auto-generated from suggestions';
COMMENT ON TABLE audit_logs IS 'Audit trail for all system actions';
COMMENT ON VIEW items_needing_reorder IS 'Real-time view of items that need reordering';

-- Success message
-- Migration complete! The database now supports:
-- - Intelligent PO generation with EOQ calculations
-- - Lead time and order quantity tracking
-- - PO approval/rejection workflow
-- - Audit logging for compliance
-- - Optimized queries for reorder analysis