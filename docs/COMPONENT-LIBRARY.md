# Component Library Documentation

## Overview
This document provides comprehensive documentation for all reusable components in the Inventory Management System. Each component is designed with accessibility, performance, and maintainability in mind.

## Table of Contents
1. [Core Components](#core-components)
2. [Accessible Components](#accessible-components)
3. [Inventory Components](#inventory-components)
4. [Settings Components](#settings-components)
5. [Common Components](#common-components)
6. [Hooks](#hooks)
7. [Utilities](#utilities)

---

## Core Components

### UnifiedFilterSystem
**Location:** `/app/components/inventory/UnifiedFilterSystem.tsx`

A comprehensive filtering system that consolidates all inventory filtering logic into a single, unified interface.

#### Props
```typescript
interface UnifiedFilterSystemProps {
  items: InventoryItem[]
  onFilteredItemsChange: (items: InventoryItem[]) => void
  onActiveFilterChange?: (filterId: string | null) => void
  className?: string
}
```

#### Usage
```tsx
<UnifiedFilterSystem
  items={inventoryItems}
  onFilteredItemsChange={setFilteredItems}
  onActiveFilterChange={setActiveFilter}
/>
```

#### Features
- Quick filter presets (Critical, Out of Stock, Fast Movers, etc.)
- Advanced filtering with multiple criteria
- Saved filter management
- Real-time filter counts
- Responsive design

---

### PerformanceDashboard
**Location:** `/app/components/PerformanceDashboard.tsx`

Real-time performance monitoring dashboard displaying key metrics.

#### Props
```typescript
interface PerformanceDashboardProps {
  autoRefresh?: boolean
  refreshInterval?: number
}
```

#### Usage
```tsx
<PerformanceDashboard autoRefresh={true} refreshInterval={10000} />
```

#### Metrics Displayed
- API response times (avg, p95)
- Database query performance
- Cache hit rates
- Web Vitals (LCP, FID, CLS, TTFB)
- Memory usage
- Overall performance score

---

## Accessible Components

### AccessibleButton
**Location:** `/app/components/accessible/AccessibleButton.tsx`

WCAG 2.1 AA compliant button component with full keyboard support.

#### Props
```typescript
interface AccessibleButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  ariaLabel?: string
  ariaPressed?: boolean
  ariaExpanded?: boolean
  ariaControls?: string
  ariaDescribedBy?: string
}
```

#### Usage
```tsx
<AccessibleButton
  variant="primary"
  size="md"
  loading={isLoading}
  ariaLabel="Save changes"
  onClick={handleSave}
>
  Save
</AccessibleButton>
```

#### Accessibility Features
- Proper ARIA attributes
- Focus management
- Loading state announcement
- Keyboard navigation support

---

### AccessibleTable
**Location:** `/app/components/accessible/AccessibleTable.tsx`

Fully accessible data table with sorting, selection, and keyboard navigation.

#### Props
```typescript
interface AccessibleTableProps<T> {
  data: T[]
  columns: Column<T>[]
  caption: string
  sortable?: boolean
  selectable?: boolean
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  onSelect?: (items: T[]) => void
  rowKey: (item: T) => string
  emptyMessage?: string
}
```

#### Usage
```tsx
<AccessibleTable
  data={inventoryItems}
  columns={tableColumns}
  caption="Inventory Items Table"
  sortable
  selectable
  onSort={handleSort}
  onSelect={handleSelect}
  rowKey={(item) => item.id}
/>
```

#### Keyboard Shortcuts
- **Arrow Keys**: Navigate cells
- **Ctrl+Home**: Jump to first cell
- **Ctrl+End**: Jump to last cell
- **Space/Enter**: Sort column or select row

---

## Inventory Components

### EnhancedInventoryTable
**Location:** `/app/components/inventory/EnhancedInventoryTable.tsx`

Advanced inventory table with inline editing and real-time updates.

#### Features
- Inline cost editing
- Stock status indicators
- Sales velocity visualization
- Demand trend indicators
- Reorder recommendations
- Item visibility toggle

---

### CriticalItemsMonitor
**Location:** `/app/components/CriticalItemsMonitor.tsx`

Real-time monitoring of critical inventory items requiring immediate attention.

#### Props
```typescript
interface CriticalItemsMonitorProps {
  items: InventoryItem[]
  className?: string
  maxItemsToShow?: number
}
```

#### Usage
```tsx
<CriticalItemsMonitor 
  items={inventoryItems}
  maxItemsToShow={10}
/>
```

---

### ColumnSelector
**Location:** `/app/components/inventory/ColumnSelector.tsx`

Dynamic column management for inventory tables.

#### Features
- Show/hide columns
- Drag-and-drop reordering
- Preset configurations
- Persistent preferences

---

### PaginationControls
**Location:** `/app/components/inventory/PaginationControls.tsx`

Accessible pagination component with customizable page sizes.

#### Props
```typescript
interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (count: number) => void
}
```

---

## Settings Components

### FinaleSettingsSection
**Location:** `/app/components/settings/FinaleSettingsSection.tsx`

Finale API configuration and testing interface.

#### Features
- API credential management
- Connection testing
- Report URL configuration
- Validation feedback

---

### NotificationSettingsSection
**Location:** `/app/components/settings/NotificationSettingsSection.tsx`

Email and notification preferences management.

#### Features
- SendGrid configuration
- Alert email settings
- Notification preferences
- Test email functionality

---

### SyncSettingsSection
**Location:** `/app/components/settings/SyncSettingsSection.tsx`

Sync configuration and monitoring.

#### Features
- Real-time sync status
- Manual sync triggers
- Sync strategy selection
- Error recovery options

---

## Common Components

### ErrorBoundary
**Location:** `/app/components/common/ErrorBoundary.tsx`

Error boundary wrapper for graceful error handling.

#### Usage
```tsx
<ErrorBoundary fallback={ErrorFallback}>
  <YourComponent />
</ErrorBoundary>
```

---

### LoadingFallback
**Location:** `/app/components/common/LoadingFallback.tsx`

Consistent loading states across the application.

#### Variants
- `InventoryLoadingFallback`
- `SettingsLoadingFallback`
- `TableLoadingFallback`

---

## Hooks

### useUnifiedFilters
**Location:** `/app/hooks/useUnifiedFilters.ts`

Comprehensive filtering hook for inventory management.

#### Returns
```typescript
{
  filteredItems: InventoryItem[]
  filterConfig: UnifiedFilterConfig
  updateFilter: (updates: Partial<UnifiedFilterConfig>) => void
  clearFilters: () => void
  activeFilterCount: number
  isFiltered: boolean
  uniqueVendors: string[]
  uniqueLocations: string[]
  statusCounts: Record<string, number>
  velocityCounts: Record<string, number>
  trendCounts: Record<string, number>
}
```

---

### useInventoryOptimized
**Location:** `/app/hooks/useInventoryOptimized.ts`

Optimized inventory data fetching with server-side pagination.

#### Features
- Server-side pagination
- Intelligent caching
- Prefetching
- Optimistic updates

---

### useInventoryTableManager
**Location:** `/app/hooks/useInventoryTableManager.ts`

Complete table state management including columns, sorting, and filtering.

---

## Utilities

### Performance Metrics
**Location:** `/app/lib/performance/metrics.ts`

```typescript
// Track API performance
await APIPerformanceTracker.trackRequest(
  '/api/inventory',
  'GET',
  () => fetch('/api/inventory')
)

// Track database queries
await DatabasePerformanceTracker.trackQuery(
  'inventory_items',
  'SELECT',
  () => supabase.from('inventory_items').select()
)

// Track web vitals
WebVitalsTracker.trackLCP(2500)
WebVitalsTracker.trackFID(100)
```

---

### Caching Strategy
**Location:** `/app/lib/cache/caching-strategy.ts`

```typescript
// Invalidate cache after updates
await CacheInvalidator.invalidateInventory(itemId)

// Warm cache proactively
await CacheWarmer.warmInventorySummary()

// Fetch with caching
const data = await CachedDataFetcher.getInventory(filters, page, limit)
```

---

### WCAG Compliance
**Location:** `/app/lib/accessibility/wcag-compliance.ts`

```typescript
// Check color contrast
const ratio = getContrastRatio('#000000', '#FFFFFF')
const meetsAA = meetsContrastRequirements('#000000', '#FFFFFF')

// Announce to screen readers
AriaAnnouncer.announce('Item saved successfully')

// Trap focus in modal
const cleanup = KeyboardNavigationHelper.trapFocus(modalElement)

// Audit accessibility
const issues = await auditAccessibility(document.body)
```

---

## Design Patterns

### Component Structure
```typescript
// 1. Imports
import React, { useState, useEffect } from 'react'
import { ComponentProps } from '@/app/types'

// 2. Types/Interfaces
interface Props extends ComponentProps {
  // Component-specific props
}

// 3. Component
export default function Component({ prop1, prop2 }: Props) {
  // 4. State and hooks
  const [state, setState] = useState()
  
  // 5. Effects
  useEffect(() => {}, [])
  
  // 6. Handlers
  const handleAction = () => {}
  
  // 7. Render
  return <div>{/* JSX */}</div>
}
```

### Error Handling Pattern
```typescript
try {
  const result = await operation()
  return { data: result }
} catch (error) {
  logError('Operation failed', error)
  return { error: 'User-friendly error message' }
}
```

### Accessibility Pattern
```tsx
<button
  aria-label="Descriptive label"
  aria-pressed={isPressed}
  aria-expanded={isExpanded}
  onClick={handleClick}
  onKeyDown={handleKeyDown}
>
  {children}
</button>
```

---

## Testing Guidelines

### Component Testing
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import Component from './Component'

test('component renders correctly', () => {
  render(<Component prop="value" />)
  expect(screen.getByText('Expected text')).toBeInTheDocument()
})

test('handles user interaction', () => {
  const handleClick = jest.fn()
  render(<Component onClick={handleClick} />)
  fireEvent.click(screen.getByRole('button'))
  expect(handleClick).toHaveBeenCalled()
})
```

### Accessibility Testing
```typescript
test('meets WCAG standards', () => {
  const { container } = render(<Component />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

---

## Performance Guidelines

1. **Use React.memo for expensive components**
```tsx
export default React.memo(ExpensiveComponent, (prevProps, nextProps) => {
  return prevProps.id === nextProps.id
})
```

2. **Implement virtual scrolling for large lists**
```tsx
import { FixedSizeList } from 'react-window'

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={50}
  width="100%"
>
  {Row}
</FixedSizeList>
```

3. **Lazy load heavy components**
```tsx
const HeavyComponent = lazy(() => import('./HeavyComponent'))

<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

---

## Contributing

When creating new components:

1. **Follow the established patterns**
2. **Include TypeScript types**
3. **Add comprehensive JSDoc comments**
4. **Ensure WCAG 2.1 AA compliance**
5. **Write unit tests**
6. **Update this documentation**

### Component Checklist
- [ ] TypeScript interfaces defined
- [ ] Props documented with JSDoc
- [ ] ARIA attributes included
- [ ] Keyboard navigation supported
- [ ] Error boundaries implemented
- [ ] Loading states handled
- [ ] Tests written
- [ ] Documentation updated

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Testing Library Docs](https://testing-library.com/docs/)
- [Next.js Documentation](https://nextjs.org/docs)