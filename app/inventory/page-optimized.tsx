'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Package, AlertTriangle, TrendingUp, Archive } from 'lucide-react'
import { useServerSideInventory, useInventoryFilterPresets } from '@/app/hooks/useServerSideInventory'
import { VirtualInventoryTable } from '@/app/components/inventory/VirtualInventoryTable'
import { InventoryPagination } from '@/app/components/inventory/InventoryPagination'
import { InventoryFiltersComponent } from '@/app/components/inventory/InventoryFilters'
import { formatInventoryValue } from '@/app/lib/inventory-calculations'
import { updateInventoryStock, updateInventoryCost } from '@/app/lib/data-access/inventory'

export default function OptimizedInventoryPage() {
  const {
    items,
    loading,
    error,
    pagination,
    filters,
    sortConfig,
    summary,
    setPage,
    setLimit,
    setFilters,
    setSortConfig,
    refresh,
    updateItem
  } = useServerSideInventory({
    initialLimit: 50
  })

  const presets = useInventoryFilterPresets()
  const [refreshing, setRefreshing] = useState(false)
  const [vendors, setVendors] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])

  // Extract unique vendors and locations from items
  useEffect(() => {
    if (items.length > 0) {
      const uniqueVendors = [...new Set(items.map(item => item.vendor).filter(Boolean))] as string[]
      const uniqueLocations = [...new Set(items.map(item => item.location).filter(Boolean))] as string[]
      setVendors(uniqueVendors.sort())
      setLocations(uniqueLocations.sort())
    }
  }, [items])

  const handleRefresh = async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  const handleSort = (key: keyof typeof sortConfig.key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    })
  }

  const handleUpdateStock = async (id: string, newStock: number) => {
    await updateInventoryStock(id, newStock)
    await updateItem(id, { current_stock: newStock, stock: newStock })
  }

  const handleUpdateCost = async (id: string, newCost: number) => {
    await updateInventoryCost(id, newCost)
    await updateItem(id, { unit_price: newCost, cost: newCost })
  }

  const applyPreset = (preset: typeof presets[0]) => {
    setFilters(preset.filter)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your inventory with real-time insights and analytics
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.total_items}</p>
              </div>
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                <p className="text-2xl font-semibold text-red-600">{summary.out_of_stock_count}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Reorder Needed</p>
                <p className="text-2xl font-semibold text-yellow-600">{summary.reorder_needed_count || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatInventoryValue(summary.total_inventory_value)}
                </p>
              </div>
              <Archive className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>
      )}

      {/* Filter Presets */}
      <div className="flex flex-wrap gap-2">
        {presets.map(preset => (
          <button
            key={preset.id}
            onClick={() => applyPreset(preset)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              JSON.stringify(filters) === JSON.stringify(preset.filter)
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Filters */}
      <InventoryFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        vendors={vendors}
        locations={locations}
      />

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">Error loading inventory: {error.message}</p>
        </div>
      )}

      {/* Inventory Table with Virtual Scrolling */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <VirtualInventoryTable
          items={items}
          onSort={handleSort}
          sortConfig={sortConfig}
          onUpdateStock={handleUpdateStock}
          onUpdateCost={handleUpdateCost}
          loading={loading}
          height={600}
        />
        
        {/* Pagination */}
        {!loading && items.length > 0 && (
          <InventoryPagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
            onPageChange={setPage}
            onItemsPerPageChange={setLimit}
          />
        )}
      </div>

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No inventory items</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filters.search || Object.keys(filters).length > 0
              ? 'Try adjusting your filters or search term.'
              : 'Get started by adding your first inventory item.'}
          </p>
        </div>
      )}
    </div>
  )
}