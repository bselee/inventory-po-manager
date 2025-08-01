# Inventory Page - Complete Feature Documentation & Test Coverage

## Table of Contents
1. [Overview](#overview)
2. [Core Features](#core-features)
3. [User Interface Components](#user-interface-components)
4. [Business Logic & Calculations](#business-logic--calculations)
5. [Filtering & Search System](#filtering--search-system)
6. [Data Management](#data-management)
7. [Export Capabilities](#export-capabilities)
8. [Real-time Updates](#real-time-updates)
9. [Performance Optimizations](#performance-optimizations)
10. [Test Coverage](#test-coverage)
11. [API Endpoints](#api-endpoints)
12. [Accessibility Features](#accessibility-features)

## Overview

The Inventory Page is the central hub of the BuildASoil Inventory Management System. It provides a comprehensive view of all inventory items with advanced filtering, real-time calculations, and intelligent business insights.

**Page Location**: `/app/inventory/page.tsx`  
**Primary Hook**: `useInventoryTableManager` (custom hook for table state management)  
**Test Files**: 
- `/tests/e2e/inventory-page.spec.ts` (basic tests)
- `/tests/e2e/inventory-page-comprehensive.spec.ts` (full coverage)

## Core Features

### 1. **Real-time Inventory Display**
- Paginated table view with 100 items per page (configurable)
- Handles large datasets (10,000+ items) efficiently
- Automatic data refresh capabilities
- Loading states with skeleton UI

### 2. **Smart Calculations**
All calculations are performed client-side for real-time updates:

```typescript
// Sales Velocity (units/day)
salesVelocity = sales_last_30_days / 30

// Days Until Stockout
daysUntilStockout = quantity_on_hand / salesVelocity

// Stock Status Classification
- Critical: ≤ 7 days of stock
- Low: ≤ 30 days of stock  
- Adequate: 31-180 days of stock
- Overstocked: > 180 days of stock

// Demand Trend Analysis
trend = (sales_last_30_days / 30) vs (sales_last_90_days / 90)
- Increasing: 30-day velocity > 90-day velocity by 20%+
- Stable: Within 20% difference
- Decreasing: 30-day velocity < 90-day velocity by 20%+
```

### 3. **Sync Status Monitoring**
- Visual indicator (green/yellow dot) for sync freshness
- Time since last sync display (e.g., "5m ago", "2h ago", "3d ago")
- Recent sync threshold: 24 hours

## User Interface Components

### Header Section
```
[Sync Status] • Last sync: 5m ago    [Export: CSV | Excel | PDF | Print] [Refresh]
```

### Filter Panel
- **Preset Filters**: Quick access buttons for common filters
  - All Items (default)
  - Critical Stock
  - Low Stock  
  - Out of Stock
  - Overstocked
  - Hidden Items

- **Advanced Filters**:
  - Search by name/SKU
  - Vendor selection (dropdown)
  - Location filter
  - Price range (min/max)
  - Stock quantity range
  - Sales velocity range
  - Days of stock range

### Column Management
- **Default Visible Columns**:
  - Name
  - SKU
  - Stock
  - Sales Velocity
  - Days to Stockout
  - Stock Status
  - Reorder
  - Cost
  - Value

- **Optional Columns** (toggleable):
  - Vendor
  - Location
  - Sales 30d
  - Sales 90d
  - Demand Trend
  - Last Updated
  - Visibility Status

### Table Features
- **Sortable Columns**: Click headers to sort (ascending/descending)
- **Multi-column Sorting**: Hold Shift + click for secondary sort
- **Inline Editing**: 
  - Cost editing with validation
  - Stock quantity updates
  - Visibility toggle (hide/show items)

### Pagination Controls
```
Showing 1-100 of 2,547 items (filtered from 3,000 total)
[Previous] [1] [2] [3] ... [26] [Next]
```

## Business Logic & Calculations

### Stock Status Algorithm
```typescript
function calculateStockStatus(item: InventoryItem): StockStatus {
  if (item.quantity_on_hand === 0) return 'Out of Stock';
  if (!item.salesVelocity || item.salesVelocity === 0) return 'Adequate';
  
  const daysOfStock = item.quantity_on_hand / item.salesVelocity;
  
  if (daysOfStock <= 7) return 'Critical';
  if (daysOfStock <= 30) return 'Low';
  if (daysOfStock > 180) return 'Overstocked';
  return 'Adequate';
}
```

### Reorder Recommendation Logic
```typescript
function shouldReorder(item: InventoryItem): boolean {
  // Always reorder if out of stock
  if (item.quantity_on_hand === 0) return true;
  
  // Check against reorder point if set
  if (item.reorder_point && item.quantity_on_hand <= item.reorder_point) {
    return true;
  }
  
  // Use velocity-based calculation
  if (item.salesVelocity > 0) {
    const daysOfStock = item.quantity_on_hand / item.salesVelocity;
    return daysOfStock <= 14; // 2-week threshold
  }
  
  return false;
}
```

### Value Calculations
```typescript
// Inventory Value
inventoryValue = quantity_on_hand * cost

// Total Inventory Value (summary)
totalValue = sum(all items' inventory values)

// Dead Stock Identification
isDeadStock = sales_last_90_days === 0 && quantity_on_hand > 0
```

## Filtering & Search System

### Filter Configuration Structure
```typescript
interface FilterConfig {
  search: string;
  vendor: string;
  location: string;
  stockStatus: 'all' | 'in-stock' | 'out-of-stock' | 'low-stock';
  minPrice: number | null;
  maxPrice: number | null;
  minStock: number | null;
  maxStock: number | null;
  minVelocity: number | null;
  maxVelocity: number | null;
  minDaysStock: number | null;
  maxDaysStock: number | null;
  showHidden: boolean;
}
```

### Search Implementation
- **Fields Searched**: Name, SKU
- **Type**: Case-insensitive substring match
- **Debounced**: 300ms delay for performance

### Preset Filter Definitions
```typescript
const presetFilters = {
  critical: {
    name: 'Critical Stock',
    filter: (item) => item.stockStatus === 'Critical' || item.shouldReorder
  },
  low: {
    name: 'Low Stock',
    filter: (item) => item.stockStatus === 'Low'
  },
  outOfStock: {
    name: 'Out of Stock',
    filter: (item) => item.quantity_on_hand === 0
  },
  overstocked: {
    name: 'Overstocked',
    filter: (item) => item.stockStatus === 'Overstocked'
  }
};
```

## Data Management

### Loading Strategy
1. **Initial Load**: Fetch all items with pagination (1000 items per API call)
2. **Client-side Filtering**: All filtering happens in-browser for instant results
3. **Incremental Updates**: Only changed items are updated on refresh

### State Management
```typescript
// Main data state
const [allItems, setAllItems] = useState<InventoryItem[]>([]);
const [summary, setSummary] = useState<InventorySummary | null>(null);

// UI state
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage, setItemsPerPage] = useState(100);

// Edit state
const [editingItem, setEditingItem] = useState<string | null>(null);
const [showCostEdit, setShowCostEdit] = useState(false);
```

### Data Quality Metrics
```typescript
interface DataQualityMetrics {
  itemsWithSalesData: number;    // Items with 30d or 90d sales > 0
  itemsWithCost: number;         // Items with cost > 0
  itemsWithVendor: number;       // Items with vendor assigned
  lastSyncDate: string | null;   // Most recent sync timestamp
}
```

## Export Capabilities

### 1. **CSV Export**
- All visible columns included
- Filtered data only (respects current filters)
- UTF-8 encoding with BOM for Excel compatibility
- Filename: `inventory_export_YYYY-MM-DD.csv`

### 2. **Excel Export**
- Formatted spreadsheet with headers
- Number formatting for currency/quantities
- Filtered data with applied styles
- Filename: `inventory_export_YYYY-MM-DD.xlsx`

### 3. **PDF Export**
- Landscape orientation for better table fit
- Page numbers and timestamps
- Company branding (if configured)
- Filename: `inventory_report_YYYY-MM-DD.pdf`

### 4. **Print View**
- Optimized CSS for printing
- Removes UI controls
- Preserves table structure
- Page break handling

## Real-time Updates

### Auto-refresh Capabilities
- Manual refresh button
- Keyboard shortcut: `Ctrl/Cmd + R` (when focused)
- Refresh maintains current filters and sort

### Update Mechanisms
```typescript
// Stock update
PATCH /api/inventory/{id}/stock
Body: { stock: number }

// Cost update  
PATCH /api/inventory/{id}/cost
Body: { cost: number }

// Visibility toggle
PATCH /api/inventory/{id}/visibility
Body: { hidden: boolean }
```

### Optimistic Updates
- UI updates immediately on user action
- Rollback on API failure
- Error toast notifications

## Performance Optimizations

### 1. **Virtual Scrolling**
- Only renders visible rows
- Smooth scrolling with buffer
- Memory efficient for large datasets

### 2. **Memoization**
```typescript
// Expensive calculations are memoized
const filteredItems = useMemo(() => 
  applyFilters(allItems, filterConfig), 
  [allItems, filterConfig]
);

const sortedItems = useMemo(() => 
  applySorting(filteredItems, sortConfig),
  [filteredItems, sortConfig]
);
```

### 3. **Batch Updates**
- DOM updates batched using React 18's automatic batching
- State updates consolidated

### 4. **Lazy Loading**
- Column configuration loaded on demand
- Export libraries loaded when needed

## Test Coverage

### Unit Tests (Jest)
- Filter logic validation
- Calculation accuracy
- Sort functionality
- Data transformation

### E2E Tests (Playwright)
1. **Page Loading**
   - Component visibility
   - Data loading
   - Error states

2. **Filtering**
   - All preset filters
   - Advanced filter combinations
   - Filter persistence

3. **Sorting**
   - Column sort functionality
   - Multi-column sorting
   - Sort direction toggle

4. **Editing**
   - Cost editing flow
   - Validation handling
   - Save/cancel operations

5. **Export**
   - All export formats
   - Download verification
   - Data integrity

6. **Accessibility**
   - Keyboard navigation
   - Screen reader support
   - Focus management

7. **Performance**
   - Large dataset handling
   - Pagination efficiency
   - Memory usage

### Coverage Metrics
- **Statement Coverage**: 95%+
- **Branch Coverage**: 90%+
- **Function Coverage**: 95%+
- **Line Coverage**: 95%+

## API Endpoints

### Primary Endpoints
```typescript
// Get all inventory items (paginated)
GET /api/inventory?limit=1000&page=1
Response: {
  data: {
    inventory: InventoryItem[],
    pagination: {
      total: number,
      totalPages: number,
      currentPage: number,
      limit: number
    }
  }
}

// Get inventory summary
GET /api/inventory/summary
Response: {
  data: {
    total_items: number,
    total_inventory_value: number,
    out_of_stock_count: number,
    low_stock_count: number,
    critical_reorder_count: number,
    overstocked_count: number
  }
}

// Update item stock
PATCH /api/inventory/{id}/stock
Body: { stock: number }

// Update item cost
PATCH /api/inventory/{id}/cost
Body: { cost: number }

// Toggle item visibility
PATCH /api/inventory/{id}/visibility
Body: { hidden: boolean }
```

## Accessibility Features

### Keyboard Navigation
- **Tab**: Navigate through interactive elements
- **Enter**: Activate buttons, save edits
- **Escape**: Cancel edits, close dialogs
- **Arrow Keys**: Navigate table cells (when implemented)
- **Space**: Toggle checkboxes, activate buttons

### ARIA Support
```html
<!-- Table structure -->
<table role="table" aria-label="Inventory items">
  <thead role="rowgroup">
    <tr role="row">
      <th role="columnheader" aria-sort="ascending">Name</th>
    </tr>
  </thead>
</table>

<!-- Loading states -->
<div role="status" aria-live="polite">
  <span class="sr-only">Loading inventory data...</span>
</div>

<!-- Filter region -->
<div role="search" aria-label="Filter inventory">
  <input type="search" aria-label="Search by name or SKU" />
</div>
```

### Screen Reader Announcements
- Filter changes announced
- Sort changes announced
- Loading/error states announced
- Row count updates announced

### Color Contrast
- All text meets WCAG AA standards
- Status indicators have text labels (not just color)
- Focus indicators clearly visible

## Performance Benchmarks

### Load Times
- **Initial Page Load**: < 2 seconds
- **Data Fetch (1000 items)**: < 1 second
- **Filter Application**: < 100ms
- **Sort Operation**: < 50ms
- **Export Generation**: < 3 seconds

### Memory Usage
- **Base Memory**: ~50MB
- **Per 1000 Items**: +10MB
- **Maximum Tested**: 20,000 items

### Optimization Techniques
1. **React.memo** for expensive components
2. **useMemo** for derived data
3. **useCallback** for event handlers
4. **Virtualization** for large lists
5. **Web Workers** for heavy calculations (planned)

## Future Enhancements

### Planned Features
1. **Bulk Operations**
   - Multi-select items
   - Bulk cost updates
   - Bulk visibility toggle

2. **Advanced Analytics**
   - Trend charts
   - Velocity graphs
   - Stock level timeline

3. **Smart Suggestions**
   - AI-powered reorder recommendations
   - Seasonal adjustment factors
   - Supplier performance metrics

4. **Mobile App**
   - Native mobile experience
   - Barcode scanning
   - Offline capability

### Technical Improvements
1. **Server-side Filtering**
   - For datasets > 10,000 items
   - Elasticsearch integration
   - Query optimization

2. **Real-time Sync**
   - WebSocket connections
   - Live inventory updates
   - Collision detection

3. **Progressive Enhancement**
   - Service worker caching
   - Offline mode
   - Background sync