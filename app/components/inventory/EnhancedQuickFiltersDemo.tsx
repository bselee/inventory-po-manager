import React from 'react'
import EnhancedQuickFilters from '@/app/components/inventory/EnhancedQuickFilters'
import { useEnhancedInventoryFilters } from '@/app/hooks/useEnhancedInventoryFilters'

// Mock data for demonstration
const mockInventoryItems = [
  {
    id: '1',
    sku: 'TEST-001',
    product_name: 'Test Product 1',
    current_stock: 0,
    minimum_stock: 10,
    vendor: 'Test Vendor A',
    unit_price: 25.99,
    sales_last_30_days: 15,
    stock_status_level: 'critical' as const,
    reorder_recommended: true,
    sales_velocity: 0.5,
    days_until_stockout: 0
  },
  {
    id: '2',
    sku: 'TEST-002', 
    product_name: 'Test Product 2',
    current_stock: 100,
    minimum_stock: 5,
    vendor: 'Test Vendor B',
    unit_price: 75.50,
    sales_last_30_days: 50,
    stock_status_level: 'adequate' as const,
    reorder_recommended: false,
    sales_velocity: 1.5,
    days_until_stockout: 60
  },
  {
    id: '3',
    sku: 'TEST-003',
    product_name: 'Test Product 3',
    current_stock: 500,
    minimum_stock: 20,
    vendor: 'Test Vendor C',
    unit_price: 15.25,
    sales_last_30_days: 2,
    stock_status_level: 'overstocked' as const,
    reorder_recommended: false,
    sales_velocity: 0.02,
    days_until_stockout: 200
  }
]

export default function EnhancedQuickFiltersDemo() {
  const {
    filteredItems,
    filterCounts,
    activeFilter,
    applyFilter,
    clearFilters
  } = useEnhancedInventoryFilters(mockInventoryItems)

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Enhanced Quick Filters Demo
          </h1>
          <p className="text-gray-600">
            This demonstrates the new enhanced quick filters with count badges, 
            saved filters, and advanced filtering options.
          </p>
        </div>

        {/* Enhanced Quick Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <EnhancedQuickFilters
            activeFilter={activeFilter}
            onFilterChange={applyFilter}
            onClearFilters={clearFilters}
            itemCounts={filterCounts}
          />
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Filter Results ({filteredItems.length} items)
          </h2>
          
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No items match the current filter criteria
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">{item.product_name}</h3>
                    <p className="text-sm text-gray-600">SKU: {item.sku} | Stock: {item.current_stock}</p>
                    <p className="text-sm text-gray-600">Vendor: {item.vendor} | Price: ${item.unit_price}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                      item.stock_status_level === 'critical' ? 'bg-red-100 text-red-800' :
                      item.stock_status_level === 'low' ? 'bg-yellow-100 text-yellow-800' :
                      item.stock_status_level === 'adequate' ? 'bg-green-100 text-green-800' :
                      item.stock_status_level === 'overstocked' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.stock_status_level}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filter Counts Debug */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Filter Counts (Debug Info)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(filterCounts).map(([filterId, count]) => (
              <div key={filterId} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-600">{filterId}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            New Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">✅ Enhanced Quick Filters</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Modern card-based layout with icons</li>
                <li>• Live count badges showing matching items</li>
                <li>• Detailed filter descriptions on hover</li>
                <li>• Visual feedback for active filters</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">✅ Advanced Features</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Save custom filter combinations</li>
                <li>• Advanced filter panel with multiple criteria</li>
                <li>• Persistent saved filters in localStorage</li>
                <li>• Quick clear and reset functionality</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
