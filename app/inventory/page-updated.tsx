'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Toaster, toast } from 'react-hot-toast'
import CompactExportButtons from '@/app/components/inventory/CompactExportButtons'
import CriticalItemsMonitor from '@/app/components/CriticalItemsMonitor'
import EnhancedInventoryTable from '@/app/components/inventory/EnhancedInventoryTable'
import PaginationControls from '@/app/components/inventory/PaginationControls'
import InventoryTableSkeleton from '@/app/components/inventory/InventoryTableSkeleton'
import { InventoryItem } from '@/app/types'
import ErrorBoundary, { PageErrorFallback } from '@/app/components/common/ErrorBoundary'
import { InventoryLoadingFallback } from '@/app/components/common/LoadingFallback'
import PageHeader from '@/app/components/common/PageHeader'
import UniversalQuickFilters from '@/app/components/common/UniversalQuickFilters'
import { useUniversalPageData } from '@/app/hooks/useUniversalPageData'
import { inventoryQuickFilters } from '@/lib/quickFilters'

interface InventorySummary {
  total_items: number
  total_inventory_value: number
  out_of_stock_count: number
  low_stock_count: number
  critical_reorder_count?: number
  overstocked_count?: number
}

export default function InventoryPage() {
  return (
    <ErrorBoundary fallback={PageErrorFallback}>
      <Suspense fallback={<InventoryLoadingFallback />}>
        <InventoryPageContent />
      </Suspense>
    </ErrorBoundary>
  )
}

function InventoryPageContent() {
  const searchParams = useSearchParams()
  const [summary, setSummary] = useState<InventorySummary | null>(null)
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>('')
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  
  // Use universal data management
  const {
    data: allItems,
    loading,
    refreshing,
    error,
    currentPage,
    totalPages,
    itemsPerPage,
    paginatedData,
    totalCount,
    startIndex,
    endIndex,
    searchTerm,
    filteredData,
    isSearching,
    sortField,
    sortDirection,
    sortedData,
    refresh,
    setSearchTerm,
    handleSort,
    setCurrentPage,
    setItemsPerPage,
    clearSearch
  } = useUniversalPageData<InventoryItem>({
    endpoint: '/api/inventory?limit=10000',
    searchFields: ['product_name', 'sku', 'vendor', 'location'],
    defaultItemsPerPage: 100,
    defaultSort: { field: 'product_name', direction: 'asc' },
    transform: (data) => {
      // Handle paginated response structure
      if (data.data?.inventory) {
        return data.data.inventory
      }
      return data.data || data || []
    }
  })

  // Apply quick filter to filtered data
  const quickFilteredData = activeQuickFilter 
    ? filteredData.filter(item => {
        const filter = inventoryQuickFilters.find(f => f.id === activeQuickFilter)
        return filter ? filter.filter(item) : true
      })
    : filteredData

  // Calculate final pagination on quick filtered data
  const finalTotalPages = Math.ceil(quickFilteredData.length / itemsPerPage)
  const finalStartIndex = (currentPage - 1) * itemsPerPage
  const finalEndIndex = finalStartIndex + itemsPerPage
  const finalPaginatedItems = quickFilteredData.slice(finalStartIndex, finalEndIndex)

  // Data quality metrics
  const dataQualityMetrics = {
    itemsWithSalesData: allItems.filter(item => 
      (item.sales_last_30_days && item.sales_last_30_days > 0) || 
      (item.sales_last_90_days && item.sales_last_90_days > 0)
    ).length,
    itemsWithCost: allItems.filter(item => item.cost && item.cost > 0).length,
    itemsWithVendor: allItems.filter(item => item.vendor && item.vendor.trim() !== '').length,
    lastSyncDate: allItems.length > 0 ? (allItems[0].last_updated || null) : null
  }

  // Load summary data
  const loadSummary = async () => {
    try {
      const response = await fetch('/api/inventory/summary')
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setSummary(data.data)
    } catch (error) {
      logError('Error loading summary:', error)
    }
  }

  // Initial summary load
  useEffect(() => {
    loadSummary()
  }, [])

  // Handle URL parameter for vendor filtering
  useEffect(() => {
    const vendorParam = searchParams.get('vendor')
    if (vendorParam && allItems.length > 0) {
      const decodedVendor = decodeURIComponent(vendorParam)
      setSearchTerm(decodedVendor)
      toast.success(`Filtering inventory by vendor: ${decodedVendor}`)
    }
  }, [searchParams, allItems, setSearchTerm])

  // Handle refresh
  const handleRefresh = async () => {
    await refresh()
    await loadSummary()
  }

  // Handle quick filter changes
  const handleQuickFilterChange = (filterId: string) => {
    setActiveQuickFilter(activeQuickFilter === filterId ? '' : filterId)
    setCurrentPage(1) // Reset to first page
  }

  const clearQuickFilters = () => {
    setActiveQuickFilter('')
    setCurrentPage(1)
  }

  // Cost editing handlers
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [showCostEdit, setShowCostEdit] = useState(false)
  const [editCost, setEditCost] = useState(0)

  const handleCostUpdate = async (itemId: string, newCost: number) => {
    try {
      const response = await fetch(`/api/inventory/${itemId}/cost`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cost: newCost })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update cost')
      }
      
      setEditingItem(null)
      setShowCostEdit(false)
      toast.success('Cost updated successfully')
      
      // Refresh data
      await refresh()
    } catch (error) {
      logError('Error updating cost:', error)
      toast.error('Failed to update cost')
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <Toaster />
        <InventoryTableSkeleton />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Toaster />
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Inventory</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-3 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const subtitle = `${quickFilteredData.length} of ${totalCount} items${searchTerm ? ` matching "${searchTerm}"` : ''}${activeQuickFilter ? ' (filtered)' : ''}`

  return (
    <div className="space-y-6">
      <Toaster />
      
      {/* Page Header */}
      <PageHeader
        title="Inventory"
        subtitle={subtitle}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search products, SKUs, vendors..."
        showRefresh={true}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showViewToggle={true}
        viewMode={viewMode}
        viewModeOptions={['table', 'card']}
        onViewModeChange={(mode) => setViewMode(mode as 'table' | 'card')}
        customActions={
          <CompactExportButtons items={quickFilteredData} />
        }
        syncStatus={{
          lastSync: dataQualityMetrics.lastSyncDate,
          isRecent: dataQualityMetrics.lastSyncDate ? 
            (Date.now() - new Date(dataQualityMetrics.lastSyncDate).getTime()) < 24 * 60 * 60 * 1000 : 
            false
        }}
      />

      {/* Critical Items Monitor */}
      <CriticalItemsMonitor items={allItems} summary={summary} />

      {/* Quick Filters */}
      <UniversalQuickFilters
        items={filteredData}
        filters={inventoryQuickFilters}
        activeFilter={activeQuickFilter}
        onFilterChange={handleQuickFilterChange}
        onClearFilters={clearQuickFilters}
        showCounts={true}
      />

      {/* Main Content */}
      {viewMode === 'table' ? (
        <EnhancedInventoryTable
          items={finalPaginatedItems}
          onCostEdit={(item, cost) => {
            setEditingItem(item.id)
            setEditCost(cost)
            setShowCostEdit(true)
          }}
          sortField={sortField as string}
          sortDirection={sortDirection}
          onSort={(field) => handleSort(field as keyof InventoryItem)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {finalPaginatedItems.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium text-gray-900 truncate">{item.product_name || item.name}</h3>
              <p className="text-sm text-gray-500 mt-1">SKU: {item.sku}</p>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Stock:</span>
                  <span className={`font-medium ${
                    (item.current_stock || 0) === 0 ? 'text-red-600' :
                    (item.current_stock || 0) <= (item.reorder_point || 0) ? 'text-orange-600' :
                    'text-green-600'
                  }`}>
                    {item.current_stock || 0}
                  </span>
                </div>
                {item.cost && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cost:</span>
                    <span className="font-medium">${item.cost.toFixed(2)}</span>
                  </div>
                )}
                {item.vendor && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Vendor:</span>
                    <span className="font-medium truncate ml-2">{item.vendor}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {quickFilteredData.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={finalTotalPages}
          totalItems={totalCount}
          filteredCount={quickFilteredData.length}
          itemsPerPage={itemsPerPage}
          startIndex={finalStartIndex}
          endIndex={Math.min(finalEndIndex, quickFilteredData.length)}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(value) => {
            setItemsPerPage(value)
            setCurrentPage(1)
          }}
          className="mt-6"
        />
      )}

      {/* No items message */}
      {quickFilteredData.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          {searchTerm || activeQuickFilter ? (
            <div>
              <p className="text-lg font-medium">No items found</p>
              <p className="mt-2">
                No items match your current search or filters
              </p>
              <div className="mt-4 space-x-2">
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Clear search
                  </button>
                )}
                {activeQuickFilter && (
                  <button
                    onClick={clearQuickFilters}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium">No inventory found</p>
              <p className="mt-2">Run inventory sync to import items from Finale.</p>
            </div>
          )}
        </div>
      )}

      {/* Cost Edit Modal - if needed */}
      {showCostEdit && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">Update Cost</h3>
            <input
              type="number"
              value={editCost}
              onChange={(e) => setEditCost(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              step="0.01"
              min="0"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowCostEdit(false)}
                className="px-3 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCostUpdate(editingItem, editCost)}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
