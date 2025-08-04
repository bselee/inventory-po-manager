# 🎯 Quick Filters Guide: Parameters, Customization & Saved Settings

## 📊 Current Quick Filter Parameters

### **Default Preset Filters Available**

The quick filters on your inventory page are defined in two main locations with different levels of complexity:

#### **Current Simple Implementation** (`useInventoryTableManager.ts`)
```typescript
export const PRESET_FILTERS: PresetFilter[] = [
  {
    id: 'critical',
    name: 'Critical Stock',
    color: 'red',
    config: { status: 'out_of_stock', reorderNeeded: true }
  },
  {
    id: 'low',
    name: 'Low Stock', 
    color: 'orange',
    config: { status: 'low_stock' }
  },
  {
    id: 'reorder',
    name: 'Reorder Needed',
    color: 'yellow',
    config: { reorderNeeded: true }
  }
]
```

#### **Enhanced Implementation Available** (`page-backup.tsx`)
```typescript
const presetFilters: PresetFilter[] = [
  {
    id: 'out-of-stock',
    label: 'Out of Stock',
    icon: AlertCircle,
    color: 'text-red-600',
    config: { status: 'out-of-stock', ... }
  },
  {
    id: 'reorder-needed',
    label: 'Reorder Needed', 
    icon: Zap,
    config: { reorderNeeded: true, ... }
  },
  {
    id: 'dead-stock',
    label: 'Dead Stock',
    icon: Archive,
    config: { salesVelocity: 'slow', stockDays: 'over-180', hasValue: true }
  },
  {
    id: 'overstocked',
    label: 'Overstocked',
    icon: BarChart3,
    config: { stockDays: 'over-90', hasValue: true }
  },
  {
    id: 'fast-moving',
    label: 'Fast Moving',
    icon: TrendingUp,
    config: { status: 'in-stock', salesVelocity: 'fast' }
  },
  {
    id: 'low-value',
    label: 'Low Value',
    icon: DollarSign,
    config: { priceRange: { min: 0, max: 50 } }
  },
  {
    id: 'critical-stock',
    label: 'Critical Stock',
    icon: Clock,
    config: { status: 'low-stock', stockDays: 'under-30' }
  }
]
```

## 🎛️ Filter Configuration Parameters

Each quick filter can be configured with these parameters:

### **Stock Status Options**
- `'all'` - Show all items regardless of stock level
- `'out-of-stock'` - Items with zero stock
- `'low-stock'` - Items below minimum stock level
- `'critical'` - Items critically low (custom threshold)
- `'adequate'` - Items with adequate stock
- `'overstocked'` - Items with excess stock
- `'in-stock'` - Items with any stock available

### **Sales Velocity Options**
- `'all'` - All velocity categories
- `'fast'` - High-velocity items (sales_velocity > 1.0)
- `'medium'` - Medium-velocity items (0.1 < sales_velocity ≤ 1.0)
- `'slow'` - Slow-moving items (0 < sales_velocity ≤ 0.1)
- `'dead'` - No recent sales (sales_velocity = 0)

### **Stock Days Options**
- `'all'` - All stock duration ranges
- `'under-30'` - Less than 30 days of stock
- `'30-60'` - 30-60 days of stock
- `'60-90'` - 60-90 days of stock  
- `'over-90'` - More than 90 days of stock
- `'over-180'` - More than 180 days of stock

### **Additional Parameters**
- `vendor: string` - Filter by specific vendor
- `location: string` - Filter by warehouse location
- `priceRange: { min: number; max: number }` - Filter by price range
- `reorderNeeded: boolean` - Items that need reordering
- `hasValue: boolean` - Items with monetary value (cost > 0)
- `showManufactured: boolean` - Show BuildASoil manufactured items
- `showPurchased: boolean` - Show externally purchased items
- `showHidden: boolean` - Include hidden items in results

## ⚙️ How to Apply User Adjustments

### **1. Modify Existing Preset Filters**

To customize the current preset filters, edit `app/hooks/useInventoryTableManager.ts`:

```typescript
export const PRESET_FILTERS: PresetFilter[] = [
  {
    id: 'critical',
    name: 'Critical Stock',
    color: 'red',
    config: { 
      status: 'low_stock', 
      stockDays: 'under-30',     // Add stock days filter
      reorderNeeded: true 
    }
  },
  {
    id: 'low',
    name: 'Low Stock',
    color: 'orange', 
    config: { 
      status: 'low_stock',
      vendor: 'BuildASoil'       // Add vendor filter
    }
  },
  // Add new custom filter
  {
    id: 'high-value',
    name: 'High Value Items',
    color: 'green',
    config: { 
      priceRange: { min: 100, max: 999999 },
      hasValue: true
    }
  }
]
```

### **2. Enable Enhanced Filter System**

Replace the current simple system with the enhanced version:

```typescript
// In inventory/page.tsx, replace current preset filters with:
const presetFilters = [
  // Copy filters from page-backup.tsx lines 138-200
  // These include more sophisticated filtering options
]
```

### **3. Create Industry-Specific Filters**

For BuildASoil's business needs:

```typescript
const buildASoilPresetFilters = [
  {
    id: 'manufacturing-inputs',
    label: 'Manufacturing Inputs',
    config: { 
      vendor: 'External Suppliers',
      status: 'low-stock',
      reorderNeeded: true
    }
  },
  {
    id: 'seasonal-products',
    label: 'Seasonal Items',
    config: {
      salesVelocity: 'fast',
      stockDays: 'under-60'
    }
  },
  {
    id: 'custom-blends',
    label: 'Custom Blends',
    config: {
      vendor: 'BuildASoil',
      showManufactured: true
    }
  }
]
```

## 💾 Implementing Saved Filter Settings

### **Option 1: localStorage Implementation (Available Now)**

The enhanced filter system already includes localStorage support:

```typescript
// Automatically saves user filter preferences
const saveFilters = (filters: SavedFilter[]) => {
  localStorage.setItem('inventory-saved-filters', JSON.stringify(filters))
  setSavedFilters(filters)
}

// Users can create custom filters
const saveCustomFilter = () => {
  const newFilter: SavedFilter = {
    id: `custom-${Date.now()}`,
    name: customFilterName.trim(),
    config: currentConfig,
    createdAt: new Date()
  }
  saveFilters([...savedFilters, newFilter])
}
```

### **Option 2: User Profile Storage (Future Enhancement)**

For persistent cross-device settings:

```typescript
// Save to user profile
const saveFilterToProfile = async (filter: SavedFilter) => {
  await fetch('/api/user/filters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filter)
  })
}

// Load user's saved filters
const loadUserFilters = async () => {
  const response = await fetch('/api/user/filters')
  return response.json()
}
```

### **Option 3: Advanced Filter Panel Settings**

The system already includes filter panel state persistence:

```typescript
// In AdvancedFilterPanel.tsx
const [isExpanded, setIsExpanded] = useState(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('inventory-filter-panel-expanded')
    return saved !== null ? JSON.parse(saved) : false
  }
  return false
})

// Auto-saves panel state
useEffect(() => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('inventory-filter-panel-expanded', JSON.stringify(isExpanded))
  }
}, [isExpanded])
```

## 🚀 Quick Implementation Steps

### **Step 1: Enable Enhanced Filters (Immediate)**

1. Copy the enhanced preset filters from `page-backup.tsx`
2. Replace the simple PRESET_FILTERS in `useInventoryTableManager.ts`
3. Test the new filters with your inventory data

### **Step 2: Add Business-Specific Filters**

```typescript
// Add to the preset filters array
{
  id: 'buildasoil-manufactured',
  name: 'BuildASoil Products',
  color: 'green',
  config: { 
    showManufactured: true,
    vendor: 'BuildASoil'
  }
},
{
  id: 'supplier-materials',
  name: 'Supplier Materials',
  color: 'blue',
  config: {
    showPurchased: true,
    reorderNeeded: true
  }
}
```

### **Step 3: Enable Saved Filters (Requires Enhanced Component)**

1. Import the `EnhancedQuickFilters` component
2. Replace the current filter panel in `inventory/page.tsx`
3. This automatically enables localStorage-based saved filters

## 📊 Filter Count Display

The enhanced system shows real-time counts for each filter:

```typescript
// Filter counts are automatically calculated
const filterCounts = useMemo(() => {
  const counts: Record<string, number> = {}
  
  PRESET_FILTERS.forEach(preset => {
    const filtered = items.filter(item => {
      // Apply preset configuration logic
      return itemMatchesFilter(item, preset.config)
    })
    counts[preset.id] = filtered.length
  })
  
  return counts
}, [items])
```

## 🎨 Visual Customization

### **Color Schemes Available**
- **Red**: Critical/urgent items (`text-red-600`, `bg-red-50`)
- **Orange**: Warning/attention items (`text-orange-600`, `bg-orange-50`) 
- **Yellow**: Caution items (`text-yellow-600`, `bg-yellow-50`)
- **Green**: Positive/manufactured items (`text-green-600`, `bg-green-50`)
- **Blue**: Information/purchased items (`text-blue-600`, `bg-blue-50`)
- **Purple**: Special categories (`text-purple-600`, `bg-purple-50`)
- **Gray**: Inactive/dead stock (`text-gray-600`, `bg-gray-50`)

### **Icon Options** (from Lucide React)
- `AlertTriangle` - Critical alerts
- `Zap` - Reorder needed
- `Archive` - Dead stock
- `BarChart3` - Overstocked
- `TrendingUp` - Fast moving
- `DollarSign` - Value-based
- `Clock` - Time-sensitive
- `Package` - Inventory items
- `Factory` - Manufactured
- `ShoppingCart` - Purchased

## 💡 Recommended Filter Strategy

### **For BuildASoil Operations:**

1. **Manufacturing Focus Filters**
   - BuildASoil Products (manufactured items)
   - Input Materials (purchased supplies)
   - Custom Blends (high-value manufactured)

2. **Operational Efficiency Filters** 
   - Reorder Urgency (critical + fast-moving)
   - Dead Stock Analysis (slow + overstocked)
   - Cash Flow Impact (high-value + overstocked)

3. **Seasonal Management Filters**
   - Peak Season Ready (fast-moving + adequate stock)
   - Off-Season Items (slow-moving + overstocked)
   - Seasonal Preparation (upcoming products)

The system is highly flexible and can be customized to match your specific inventory management workflows and business priorities!
