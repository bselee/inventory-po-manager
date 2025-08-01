# TODO - Inventory PO Manager

## High Priority Fixes

### 1. Fix API Method Mismatch
**Issue**: Frontend uses PATCH method but API only implements PUT for stock updates

**Files to Update**:
- `/app/api/inventory/[id]/stock/route.ts` - Add PATCH method handler
- `/app/api/inventory/[id]/cost/route.ts` - Add PATCH method handler  
- `/app/api/inventory/[id]/visibility/route.ts` - Add PATCH method handler

**Solution**:
```typescript
// Add to each route file:
export const PATCH = createApiHandler(async ({ params, body }) => {
  // Same implementation as PUT
  return PUT({ params, body })
})
```

### 2. ~~Implement Empty Component Files~~ ✓ COMPLETED
**Update**: All component files have been implemented and are no longer empty.

**Implemented Components**:
- ✓ `/app/components/inventory/AdvancedFilterPanel.tsx` - Advanced filtering UI
- ✓ `/app/components/inventory/ColumnSelector.tsx` - Column visibility management
- ✓ `/app/components/inventory/CompactExportButtons.tsx` - Export functionality
- ✓ `/app/components/inventory/EnhancedInventoryTable.tsx` - Enhanced table with inline editing

**Additional Components Found**:
- `PaginationControls.tsx` - New pagination component added
- `InventoryTable.tsx` - Basic table implementation
- `EnhancedQuickFilters.tsx` - Filter functionality
- `ConsolidatedExportDropdown.tsx` - Export functionality
- `VirtualInventoryTable.tsx` - Virtual scrolling table

## Medium Priority

### 3. Update Documentation
- Add toast notification documentation to inventory page docs
- Update API endpoint documentation to reflect PATCH support

### 4. Add Playwright Browser Dependencies
- Document the requirement to run `sudo npx playwright install-deps` before running tests
- Add to CI/CD setup instructions

## Low Priority

### 5. Create Test Data Fixtures
- Create `/tests/fixtures/inventory-data.ts` with mock data
- Use consistent test data across all tests

### 6. Performance Optimization
- Implement proper memoization for expensive calculations
- Consider implementing the empty `EnhancedInventoryTable.tsx` with virtual scrolling from `VirtualInventoryTable.tsx`

## Notes

- The `useInventoryTableManager` hook has been properly implemented and is working
- The inventory page now includes `PaginationControls` component which also needs to be verified
- Toast notifications have been added using `react-hot-toast` library