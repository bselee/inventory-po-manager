-- Drop existing view if it exists and recreate with correct structure
DROP VIEW IF EXISTS inventory_summary;

-- Create inventory_summary view for the inventory page
CREATE VIEW inventory_summary AS
SELECT 
  COUNT(*) as total_items,
  COALESCE(SUM(stock * cost), 0) as total_inventory_value,
  COUNT(CASE WHEN stock = 0 THEN 1 END) as out_of_stock_count,
  COUNT(CASE WHEN stock > 0 AND stock <= reorder_point THEN 1 END) as low_stock_count
FROM inventory_items;