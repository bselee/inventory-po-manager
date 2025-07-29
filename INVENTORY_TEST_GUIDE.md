# Inventory Page Testing Guide

## Current Status

### ✅ Working Features:
1. **API Endpoints:**
   - `/api/inventory` - Returns 58 items
   - `/api/inventory/summary` - Returns statistics
   - `/api/inventory?search=xxx` - Search works
   - `/api/inventory?page=2` - Pagination works

2. **Backend Functionality:**
   - Data loading from database
   - Filtering and searching
   - Calculated fields (velocity, days until stockout)

### ❌ Known Issue:
- **Stock/Cost Updates** fail due to database trigger expecting `updated_at` column

## Manual Testing Steps

### 1. Test Basic Display
Open http://localhost:3001/inventory and verify:
- [ ] Page loads without errors
- [ ] Inventory table shows 58 items
- [ ] Summary stats appear at top
- [ ] Items show SKU, name, stock, status

### 2. Test Search
- [ ] Type "test" in search box
- [ ] Items filter as you type
- [ ] Clear search - all items return

### 3. Test Filters
Click each filter button and verify count changes:
- [ ] "All" - Shows all 58 items
- [ ] "Out of Stock" - Shows items with 0 stock
- [ ] "Low Stock" - Shows low stock items
- [ ] "Critical" - Shows critical items

### 4. Test Sorting
- [ ] Click "Product Name" header - sorts A-Z
- [ ] Click again - sorts Z-A
- [ ] Try other columns (SKU, Stock, etc.)

### 5. Test View Modes
- [ ] Click "Planning" - Shows velocity/days data
- [ ] Click "Analytics" - Shows charts/analytics
- [ ] Click "Table" - Returns to table view

### 6. Test Pagination
- [ ] Check page numbers at bottom
- [ ] Click page 2 - shows next items
- [ ] Use < > arrows to navigate

### 7. Test Inline Editing (Will Fail Until Fix Applied)
- [ ] Click edit icon next to stock number
- [ ] Inline editor should appear
- [ ] Try to save - will get error about `updated_at`

## Browser Console Tests

Open browser console (F12) and run:

```javascript
// Test API directly
fetch('/api/inventory')
  .then(r => r.json())
  .then(d => console.log('Items:', d.data.inventory.length))

// Test search
fetch('/api/inventory?search=test')
  .then(r => r.json())
  .then(d => console.log('Search results:', d.data.inventory.length))

// Test summary
fetch('/api/inventory/summary')
  .then(r => r.json())
  .then(d => console.log('Summary:', d.data))
```

## Fix for Update Issues

To fix stock/cost editing, run this SQL in Supabase:

```sql
-- Add missing column
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
```

Or remove the problematic trigger:

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON inventory_items;
```

## Test Pages Available

1. **http://localhost:3001/test-inline** - Basic button test
2. **http://localhost:3001/test-inventory-simple** - Simple API test
3. **http://localhost:3001/test-inventory** - Full API test (if buttons work)

## Common Issues

1. **Buttons don't work**: Check browser console for React hydration errors
2. **No data shows**: Check if API returns data using console tests
3. **Updates fail**: Apply the SQL fix above
4. **Page doesn't load**: Check if dev server is running on port 3001