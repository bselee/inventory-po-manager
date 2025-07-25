-- Migration 006: Create materialized view for inventory calculations
-- Created: 2025-01-24
-- Description: Creates a materialized view to perform inventory calculations at the database level

-- Drop existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS inventory_items_calculated CASCADE;

-- Create function to calculate sales velocity
CREATE OR REPLACE FUNCTION calculate_sales_velocity(sales_30 INTEGER, sales_90 INTEGER)
RETURNS NUMERIC AS $$
BEGIN
  IF sales_30 IS NULL OR sales_30 = 0 THEN
    IF sales_90 IS NULL OR sales_90 = 0 THEN
      RETURN 0;
    ELSE
      RETURN ROUND(sales_90::NUMERIC / 90, 2);
    END IF;
  ELSE
    RETURN ROUND(sales_30::NUMERIC / 30, 2);
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to calculate days until stockout
CREATE OR REPLACE FUNCTION calculate_days_until_stockout(stock INTEGER, velocity NUMERIC)
RETURNS INTEGER AS $$
BEGIN
  IF stock IS NULL OR stock = 0 OR velocity IS NULL OR velocity <= 0 THEN
    RETURN 0;
  ELSE
    RETURN GREATEST(0, ROUND(stock::NUMERIC / velocity));
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to determine stock status
CREATE OR REPLACE FUNCTION determine_stock_status(stock INTEGER, reorder_point INTEGER, days_until_stockout INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF stock = 0 THEN
    RETURN 'out-of-stock';
  ELSIF stock <= reorder_point OR days_until_stockout <= 7 THEN
    RETURN 'critical';
  ELSIF days_until_stockout <= 30 THEN
    RETURN 'low';
  ELSIF days_until_stockout > 180 THEN
    RETURN 'overstocked';
  ELSE
    RETURN 'adequate';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to calculate trend
CREATE OR REPLACE FUNCTION calculate_trend(sales_30 INTEGER, sales_90 INTEGER)
RETURNS TEXT AS $$
DECLARE
  avg_30 NUMERIC;
  avg_90 NUMERIC;
  ratio NUMERIC;
BEGIN
  IF sales_30 IS NULL OR sales_90 IS NULL THEN
    RETURN 'stable';
  END IF;
  
  avg_30 := sales_30::NUMERIC / 30;
  avg_90 := sales_90::NUMERIC / 90;
  
  IF avg_90 = 0 THEN
    IF avg_30 > 0 THEN
      RETURN 'increasing';
    ELSE
      RETURN 'stable';
    END IF;
  END IF;
  
  ratio := avg_30 / avg_90;
  
  IF ratio > 1.2 THEN
    RETURN 'increasing';
  ELSIF ratio < 0.8 THEN
    RETURN 'decreasing';
  ELSE
    RETURN 'stable';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create materialized view with calculations
CREATE MATERIALIZED VIEW inventory_items_calculated AS
SELECT 
  i.*,
  -- Calculated fields
  calculate_sales_velocity(i.sales_last_30_days, i.sales_last_90_days) AS sales_velocity,
  calculate_days_until_stockout(
    i.stock, 
    calculate_sales_velocity(i.sales_last_30_days, i.sales_last_90_days)
  ) AS days_until_stockout,
  determine_stock_status(
    i.stock, 
    i.reorder_point,
    calculate_days_until_stockout(
      i.stock, 
      calculate_sales_velocity(i.sales_last_30_days, i.sales_last_90_days)
    )
  ) AS stock_status_level,
  calculate_trend(i.sales_last_30_days, i.sales_last_90_days) AS trend,
  -- Reorder recommendation
  CASE 
    WHEN i.stock <= i.reorder_point OR 
         (i.stock > 0 AND calculate_days_until_stockout(
           i.stock, 
           calculate_sales_velocity(i.sales_last_30_days, i.sales_last_90_days)
         ) <= 14)
    THEN true
    ELSE false
  END AS reorder_recommended,
  -- Inventory value
  (i.stock * COALESCE(i.cost, 0)) AS inventory_value
FROM inventory_items i;

-- Create indexes on the materialized view
CREATE INDEX idx_mv_inventory_stock_status ON inventory_items_calculated(stock_status_level);
CREATE INDEX idx_mv_inventory_sales_velocity ON inventory_items_calculated(sales_velocity);
CREATE INDEX idx_mv_inventory_days_until_stockout ON inventory_items_calculated(days_until_stockout);
CREATE INDEX idx_mv_inventory_reorder_recommended ON inventory_items_calculated(reorder_recommended);
CREATE INDEX idx_mv_inventory_vendor ON inventory_items_calculated(vendor);
CREATE INDEX idx_mv_inventory_location ON inventory_items_calculated(location);

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_inventory_calculations()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY inventory_items_calculated;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to refresh the view when inventory_items changes
CREATE OR REPLACE FUNCTION trigger_refresh_inventory_calculations()
RETURNS trigger AS $$
BEGIN
  -- Use pg_notify to signal that a refresh is needed
  -- This avoids blocking the transaction
  PERFORM pg_notify('inventory_changed', 'refresh_needed');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for inventory changes
CREATE TRIGGER refresh_inventory_calculations_insert
AFTER INSERT ON inventory_items
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_inventory_calculations();

CREATE TRIGGER refresh_inventory_calculations_update
AFTER UPDATE ON inventory_items
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_inventory_calculations();

CREATE TRIGGER refresh_inventory_calculations_delete
AFTER DELETE ON inventory_items
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_inventory_calculations();

-- Initial refresh
REFRESH MATERIALIZED VIEW inventory_items_calculated;

-- Grant permissions
GRANT SELECT ON inventory_items_calculated TO authenticated;

-- Add comment
COMMENT ON MATERIALIZED VIEW inventory_items_calculated IS 'Pre-calculated inventory metrics for performance optimization. Automatically refreshed on inventory changes.';