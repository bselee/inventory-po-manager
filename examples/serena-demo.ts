/**
 * Demo: Using Serena MCP Server for Semantic Code Analysis
 * 
 * This file demonstrates how Serena can analyze our inventory system code
 * and provide intelligent insights and refactoring suggestions.
 */

// Example function that could benefit from Serena's analysis
export function getFilteredAndSortedItems(items: any[], filters: any, sortConfig: any) {
  // This function could be analyzed by Serena for:
  // 1. Performance optimization opportunities
  // 2. Type safety improvements  
  // 3. Code complexity reduction
  // 4. Better error handling patterns
  
  let filtered = items.filter(item => {
    // Complex filtering logic that Serena could optimize
    const matchesSearch = 
      (item.product_name || item.name || '').toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      (item.vendor && item.vendor.toLowerCase().includes(filters.searchTerm.toLowerCase()))

    const statusLevel = item.stock_status_level || 'adequate'
    const matchesStatus = 
      filters.status === 'all' ||
      (filters.status === 'out-of-stock' && item.current_stock === 0) ||
      (filters.status === 'critical' && statusLevel === 'critical') ||
      (filters.status === 'low-stock' && statusLevel === 'low') ||
      (filters.status === 'adequate' && statusLevel === 'adequate') ||
      (filters.status === 'overstocked' && statusLevel === 'overstocked') ||
      (filters.status === 'in-stock' && item.current_stock > 0)

    return matchesSearch && matchesStatus
  })

  // Sorting logic that Serena could help optimize
  if (sortConfig.key) {
    filtered.sort((a, b) => {
      let aValue = a[sortConfig.key]
      let bValue = b[sortConfig.key]

      if (aValue == null) aValue = 0
      if (bValue == null) bValue = 0

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
      }

      const aStr = String(aValue).toLowerCase()
      const bStr = String(bValue).toLowerCase()
      
      if (sortConfig.direction === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0
      }
    })
  }

  return filtered
}

// Example React component that Serena could analyze
export function InventoryRow({ item, onEdit }: { item: any, onEdit: (id: string) => void }) {
  // Serena could suggest:
  // 1. Proper TypeScript interfaces instead of 'any'
  // 2. Memoization opportunities with React.memo
  // 3. Event handler optimization
  // 4. Accessibility improvements
  
  // Example JSX structure (commented out for TypeScript compilation):
  /*
  return (
    <tr onClick={() => onEdit(item.id)}>
      <td>{item.sku}</td>
      <td>{item.product_name}</td>
      <td>{item.current_stock}</td>
      <td>{item.vendor}</td>
    </tr>
  )
  */
  
  // For demo purposes, return a simple object
  return {
    sku: item.sku,
    productName: item.product_name,
    stock: item.current_stock,
    vendor: item.vendor
  }
}

// Example API route that Serena could enhance
export async function updateInventoryItem(id: string, data: any) {
  // Serena could suggest:
  // 1. Better error handling patterns
  // 2. Input validation improvements
  // 3. Type safety enhancements
  // 4. Database transaction patterns
  
  try {
    // Simplified database update logic
    const result = await fetch(`/api/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
    return result.json()
  } catch (error) {
    console.error('Error updating item:', error)
    throw error
  }
}

/**
 * Expected Serena Analysis Results:
 * 
 * 1. Performance Optimizations:
 *    - Suggest useMemo for expensive filtering operations
 *    - Recommend virtual scrolling for large lists
 *    - Identify unnecessary re-renders
 * 
 * 2. Type Safety Improvements:
 *    - Replace 'any' types with proper interfaces
 *    - Add generic type constraints
 *    - Suggest better error type definitions
 * 
 * 3. Code Quality Enhancements:
 *    - Reduce complexity in filtering logic
 *    - Extract reusable utility functions
 *    - Improve readability and maintainability
 * 
 * 4. Best Practices:
 *    - Suggest React patterns for state management
 *    - Recommend error boundary implementations
 *    - Propose better component composition
 */
