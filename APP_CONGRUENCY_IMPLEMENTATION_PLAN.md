# 🎯 App-Wide Congruency Implementation Plan

## Phase 1: Shared Components & Patterns (Priority 1)

### 1.1 Create Universal Page Header Component

**Location:** `app/components/common/PageHeader.tsx`

```tsx
interface PageHeaderProps {
  title: string
  subtitle?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  showSearch?: boolean
  showRefresh?: boolean
  refreshing?: boolean
  onRefresh?: () => void
  showViewToggle?: boolean
  viewMode?: 'card' | 'list' | 'table'
  onViewModeChange?: (mode: 'card' | 'list' | 'table') => void
  customActions?: React.ReactNode
  syncStatus?: {
    lastSync: string | null
    isRecent: boolean
  }
}

export default function PageHeader({
  title,
  subtitle,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  showSearch = true,
  showRefresh = true,
  refreshing = false,
  onRefresh,
  showViewToggle = false,
  viewMode,
  onViewModeChange,
  customActions,
  syncStatus
}: PageHeaderProps)
```

### 1.2 Create Universal Quick Filters Component

**Location:** `app/components/common/UniversalQuickFilters.tsx`

```tsx
interface UniversalQuickFiltersProps<T = any> {
  items: T[]
  filters: QuickFilter[]
  activeFilter?: string
  onFilterChange: (filterId: string) => void
  onClearFilters: () => void
  showCounts?: boolean
  className?: string
}

export default function UniversalQuickFilters<T>({
  items,
  filters,
  activeFilter,
  onFilterChange,
  onClearFilters,
  showCounts = true,
  className = ""
}: UniversalQuickFiltersProps<T>)
```

### 1.3 Create Universal Data Loading Hook

**Location:** `app/hooks/useUniversalPageData.ts`

```tsx
interface UseUniversalPageDataOptions<T> {
  endpoint: string
  dependencies?: any[]
  transform?: (data: any) => T[]
  enablePagination?: boolean
  defaultItemsPerPage?: number
  enableSearch?: boolean
  searchFields?: string[]
  enableSorting?: boolean
  defaultSort?: { field: string; direction: 'asc' | 'desc' }
}

export function useUniversalPageData<T>(options: UseUniversalPageDataOptions<T>) {
  // Returns standardized data management state
  return {
    data: T[],
    loading: boolean,
    refreshing: boolean,
    error: string | null,
    // Pagination
    currentPage: number,
    totalPages: number,
    itemsPerPage: number,
    paginatedData: T[],
    // Search
    searchTerm: string,
    filteredData: T[],
    // Sorting
    sortField: string,
    sortDirection: 'asc' | 'desc',
    sortedData: T[],
    // Actions
    refresh: () => Promise<void>,
    setSearchTerm: (term: string) => void,
    handleSort: (field: string) => void,
    setCurrentPage: (page: number) => void,
    setItemsPerPage: (items: number) => void
  }
}
```

## Phase 2: Standardize Current Pages (Priority 1)

### 2.1 Update Inventory Page Structure

**Key Changes:**
- Replace complex dual filter system with standardized approach
- Use UniversalQuickFilters component
- Implement PageHeader component
- Standardize view modes (add card view option)

### 2.2 Update Vendor Page Structure  

**Key Changes:**
- Replace custom search with standardized PageHeader
- Use UniversalQuickFilters for vendor filtering
- Align pagination and sorting patterns
- Maintain card/list view but standardize implementation

## Phase 3: Create Congruent UI Patterns (Priority 2)

### 3.1 Standardized Filter System

**Inventory Quick Filters:**
```tsx
const inventoryFilters: QuickFilter[] = [
  {
    id: 'out-of-stock',
    label: 'Out of Stock',
    icon: AlertCircle,
    color: 'red',
    count: 0,
    filter: (item: InventoryItem) => item.current_stock === 0
  },
  {
    id: 'low-stock',
    label: 'Low Stock',
    icon: AlertTriangle,
    color: 'orange',
    filter: (item: InventoryItem) => item.current_stock > 0 && item.current_stock <= (item.reorder_point || 0)
  },
  {
    id: 'reorder-needed',
    label: 'Reorder Needed',
    icon: Zap,
    color: 'yellow',
    filter: (item: InventoryItem) => item.reorder_needed === true
  }
]
```

**Vendor Quick Filters:**
```tsx
const vendorFilters: QuickFilter[] = [
  {
    id: 'active-orders',
    label: 'Active Orders',
    icon: ShoppingCart,
    color: 'blue',
    filter: (vendor: VendorWithStats) => (vendor.stats?.totalPurchaseOrders || 0) > 0
  },
  {
    id: 'high-spend',
    label: 'High Spend',
    icon: DollarSign,  
    color: 'green',
    filter: (vendor: VendorWithStats) => (vendor.stats?.totalSpend || 0) > 10000
  },
  {
    id: 'recent-orders',
    label: 'Recent Orders',
    icon: Clock,
    color: 'purple',
    filter: (vendor: VendorWithStats) => {
      if (!vendor.stats?.lastOrderDate) return false
      const daysSince = (Date.now() - new Date(vendor.stats.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
      return daysSince <= 30
    }
  }
]
```

### 3.2 Standardized View Modes

**Both pages should support:**
- **Card View**: Rich visual cards with key metrics
- **List View**: Compact table format with essential data
- **Table View** (inventory only): Full detailed table with all columns

### 3.3 Consistent Pagination & Controls

**Standardized Implementation:**
```tsx
// Same pagination component and settings
<PaginationControls
  currentPage={currentPage}
  totalPages={totalPages}
  totalItems={totalCount}
  filteredCount={filteredCount}
  itemsPerPage={itemsPerPage}
  startIndex={startIndex}
  endIndex={endIndex}
  onPageChange={setCurrentPage}
  onItemsPerPageChange={setItemsPerPage}
  itemsPerPageOptions={[25, 50, 100, 200]}
  className="mt-6"
/>
```

## Phase 4: Implementation Steps

### Step 1: Create Shared Components (Day 1)
1. ✅ Create `PageHeader.tsx`
2. ✅ Create `UniversalQuickFilters.tsx`  
3. ✅ Create `useUniversalPageData.ts` hook
4. ✅ Create shared filter types and interfaces

### Step 2: Update Inventory Page (Day 2)
1. Replace header section with `PageHeader`
2. Replace filter system with `UniversalQuickFilters`
3. Add card view mode option
4. Implement `useUniversalPageData` hook
5. Test all functionality

### Step 3: Update Vendor Page (Day 2-3)
1. Replace custom header with `PageHeader`
2. Add `UniversalQuickFilters` for vendor filtering
3. Standardize view mode implementation
4. Implement `useUniversalPageData` hook
5. Test all functionality

### Step 4: Polish & Testing (Day 3)
1. Verify visual consistency across pages
2. Test search, filtering, pagination on both pages
3. Ensure responsive design consistency
4. Update localStorage keys for consistency
5. Add any missing features for parity

## Phase 5: Expected Outcomes

### ✅ Functional Congruency
- **Search**: Same debounced search behavior across pages
- **Filtering**: Consistent quick filter system with counts
- **Pagination**: Identical pagination controls and behavior
- **Sorting**: Standardized sorting UI and logic
- **View Modes**: Consistent card/list/table view patterns

### ✅ UI/UX Congruency  
- **Headers**: Identical header layout and controls
- **Loading States**: Same skeleton components and patterns
- **Error Handling**: Consistent error boundaries and fallbacks
- **Responsive Design**: Same breakpoints and mobile behavior
- **Accessibility**: Consistent ARIA labels and keyboard navigation

### ✅ Developer Experience
- **Shared Components**: Reusable components reduce duplication
- **Consistent Patterns**: Same hooks and state management patterns
- **Type Safety**: Shared interfaces and types
- **Testing**: Similar test patterns and coverage

## 🎯 Success Metrics

1. **User Experience**: Users can navigate between pages intuitively
2. **Visual Consistency**: Pages look and feel like same application
3. **Functional Parity**: Same features available on both pages
4. **Performance**: No regression in load times or responsiveness
5. **Maintainability**: Reduced code duplication, easier to update

This plan will create a cohesive, professional application with consistent patterns throughout while maintaining the unique functionality each page requires.
