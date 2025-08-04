# Column Management System Documentation

## Overview

The inventory table now includes a comprehensive column management system that allows users to customize their view by controlling column visibility, order, and applying preset layouts for different use cases.

## Features

### 🎛️ Column Visibility Control
- **Toggle Individual Columns**: Click the eye icon to show/hide specific columns
- **Show/Hide All**: Quick toggle to show or hide all columns at once
- **Persistent Settings**: Column preferences are saved to localStorage and restored on page load

### 🔄 Column Reordering
- **Drag and Drop**: Drag columns by the grip handle to reorder them
- **Visual Feedback**: Clear visual indicators during drag operations
- **Live Updates**: Table updates immediately to reflect new column order

### 📋 Preset Layouts
Quick-apply column layouts optimized for different business scenarios:

#### **Essential** 
*Core inventory fields only*
- Actions, SKU, Product Name, Current Stock, Cost, Vendor
- Perfect for quick stock checks and basic inventory management

#### **Operations**
*Fields needed for daily operations*  
- Actions, SKU, Product Name, Current Stock, Min Stock, Stock Status, Vendor, Location
- Ideal for warehouse staff and inventory managers

#### **Analytics**
*Sales and performance data*
- Actions, SKU, Product Name, Current Stock, Sales Velocity, Sales (30d), Days Until Stockout, Trend
- Best for buyers and analysts tracking performance

#### **Purchasing**
*Purchase and reorder information*
- Actions, SKU, Product Name, Current Stock, Min Stock, Reorder Qty, Cost, Vendor
- Optimized for purchasing decisions and reorder management

#### **Comprehensive**
*All available fields*
- Shows every available column for complete data visibility
- Useful for detailed analysis and data exports

## Available Columns

### Always Visible
- **Actions**: Edit, view details, and other item actions

### Core Fields (Visible by Default)
- **SKU**: Stock Keeping Unit identifier
- **Product Name**: Full product name/description
- **Current Stock**: Current inventory quantity
- **Unit Cost**: Cost per unit
- **Vendor**: Primary supplier
- **Location**: Storage location

### Extended Fields (Hidden by Default)
- **Min Stock**: Minimum stock level/reorder point
- **Max Stock**: Maximum stock level
- **Reorder Qty**: Quantity to reorder when restocking
- **Sales Velocity**: Rate of sales movement
- **Days Until Stockout**: Predicted days until out of stock
- **Inventory Value**: Total value of current stock
- **Stock Status**: Current stock status level
- **Trend**: Sales trend direction
- **Sales (30d)**: Sales quantity in last 30 days
- **Sales (90d)**: Sales quantity in last 90 days  
- **Unit Price**: Selling price per unit
- **Finale ID**: External system identifier
- **Last Updated**: When record was last modified
- **Created**: When record was created
- **Active**: Whether item is active

## How to Use

### Accessing Column Management
1. Click the **"Columns (X/Y)"** button in the inventory toolbar
2. The dropdown shows current visible/total column count

### Managing Individual Columns
1. **Columns Tab**: Shows all available columns with drag handles
2. **Toggle Visibility**: Click the eye icon next to any column name
3. **Reorder**: Drag columns by the grip handle to reorder
4. **Visual Feedback**: 
   - Blue eye = visible column
   - Gray eye = hidden column
   - Sort badge = sortable column
   - Width indicator shows column width

### Using Presets
1. **Presets Tab**: Shows preset layout options
2. **Quick Apply**: Click any preset to instantly apply that column layout
3. **Use Cases**: Each preset is optimized for specific business scenarios

### Additional Actions
- **Show/Hide All**: Toggle all columns at once (keeps Actions visible)
- **Reset**: Restore default column configuration
- **Auto-Save**: All changes are automatically saved to browser storage

## Technical Implementation

### Local Storage Persistence
```javascript
// Column preferences are saved as:
localStorage.setItem('inventory-column-preferences', JSON.stringify(columns))
```

### Column Configuration Structure
```typescript
interface ColumnConfig {
  key: keyof InventoryItem | 'actions'
  label: string
  visible: boolean
  sortable: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
}
```

### Preset System
```typescript
const COLUMN_PRESETS = {
  essential: {
    name: 'Essential',
    description: 'Core inventory fields only',
    columns: ['actions', 'sku', 'product_name', 'current_stock', 'cost', 'vendor']
  }
  // ... more presets
}
```

## Best Practices

### For Different User Types

**Warehouse Staff**: Use "Operations" preset
- Shows stock levels, locations, and status for daily operations

**Buyers/Purchasers**: Use "Purchasing" preset  
- Focuses on reorder information and supplier details

**Analysts**: Use "Analytics" preset
- Emphasizes sales data and performance metrics

**Executives**: Use "Essential" preset
- Clean, focused view of key metrics

### Performance Considerations
- Only visible columns are rendered in the table
- Hidden columns don't impact table performance
- Column preferences are cached locally
- Preset switching is instantaneous

### Customization Tips
1. Start with a preset closest to your needs
2. Fine-tune by showing/hiding specific columns
3. Reorder columns based on your workflow priority
4. Use "Comprehensive view for data exports

## Troubleshooting

### Column Preferences Not Saving
- Check browser localStorage is enabled
- Clear browser cache if settings appear corrupted
- Use "Reset" button to restore defaults

### Drag and Drop Issues
- Ensure you're dragging by the grip handle (≡ icon)
- Wait for visual feedback before dropping
- Refresh page if drag states get stuck

### Missing Columns
- Use "Show All" to reveal all available columns
- Check if columns exist in your data source
- Some columns may be conditionally available

## Future Enhancements

Planned improvements include:
- Custom column width adjustment
- Column grouping and nested headers
- User-specific preset saving
- Export/import column configurations
- Conditional column visibility based on data availability
