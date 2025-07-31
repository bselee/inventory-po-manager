'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Loader2 } from 'lucide-react'
import CompactExportButtons from '@/app/components/inventory/CompactExportButtons'
import CriticalItemsMonitor from '@/app/components/CriticalItemsMonitor'
import useInventoryTableManager from '@/app/hooks/useInventoryTableManager'
import AdvancedFilterPanel from '@/app/components/inventory/AdvancedFilterPanel'
import ColumnSelector from '@/app/components/inventory/ColumnSelector'
import EnhancedInventoryTable from '@/app/components/inventory/EnhancedInventoryTable'
import { InventoryItem } from '@/app/types'

// Helper functions for sync status
const isRecentSync = (lastSyncDate: string) => {
  const now = new Date()
  const syncDate = new Date(lastSyncDate)
  const hoursDiff = (now.getTime() - syncDate.getTime()) / (1000 * 60 * 60)
  return hoursDiff <= 24
}

const formatSyncTime = (lastSyncDate: string) => {
  const now = new Date()
  const syncDate = new Date(lastSyncDate)
  const hoursDiff = (now.getTime() - syncDate.getTime()) / (1000 * 60 * 60)
  
  if (hoursDiff < 1) {
    const minutes = Math.floor(hoursDiff * 60)
    return `${minutes}m ago`
  } else if (hoursDiff < 24) {
    return `${Math.floor(hoursDiff)}h ago`
  } else {
    const days = Math.floor(hoursDiff / 24)
    return `${days}d ago`
  }
}

interface InventorySummary {
  total_items: number
  total_inventory_value: number
  out_of_stock_count: number
  low_stock_count: number
  critical_reorder_count?: number
  overstocked_count?: number
}

export default function InventoryPage() {
  const [allItems, setAllItems] = useState<InventoryItem[]>([])
  const [summary, setSummary] = useState<InventorySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Use the comprehensive table manager
  const {
    filteredItems,
    totalItems,
    filteredCount,
    columns,
    visibleColumns,
    toggleColumn,
    reorderColumns,
    resetColumns,
    filterConfig,
    updateFilter,
    clearFilters,
    activePresetFilter,
    applyPresetFilter,
    presetFilters,
    filterCounts,
    uniqueVendors,
    uniqueLocations,
    sortConfig,
    handleSort
  } = useInventoryTableManager(allItems)

  // Cost editing state
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [showCostEdit, setShowCostEdit] = useState(false)
  const [editCost, setEditCost] = useState(0)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(100)

  // Data quality metrics state
  const [dataQualityMetrics, setDataQualityMetrics] = useState({
    itemsWithSalesData: 0,
    itemsWithCost: 0,
    itemsWithVendor: 0,
    lastSyncDate: null as string | null
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredCount / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedItems = filteredItems.slice(startIndex, endIndex)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterConfig])

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const loadInventory = async () => {
    try {
      // Fetch ALL inventory items using pagination
      // Supabase has a 1000 item limit per query
      let allInventoryItems: any[] = []
      let page = 1
      let hasMore = true
      
      console.log('🔄 Loading all inventory items with pagination...')
      
      while (hasMore) {
        const response = await fetch(`/api/inventory?limit=1000&page=${page}`)
        const data = await response.json()
        
        if (data.error) {
          throw new Error(data.error)
        }
        
        const items = data.data?.inventory || []
        const pagination = data.data?.pagination || {}
        
        allInventoryItems = allInventoryItems.concat(items)
        
        console.log(`📄 Page ${page}: ${items.length} items (Total: ${allInventoryItems.length}/${pagination.total || 'unknown'})`)
        
        // Check if there are more items
        hasMore = items.length === 1000 && page < (pagination.totalPages || 0)
        page++
        
        // Safety break to prevent infinite loops
        if (page > 20) {
          console.warn('⚠️ Stopped at page 20 to prevent infinite loop')
          break
        }
      }
      
      const result = {
        items: allInventoryItems,
        total: allInventoryItems.length
      }
      
      console.log(`✅ Successfully loaded ${result.items.length} total inventory items`)
      setAllItems(result.items as InventoryItem[])
      
      // Calculate data quality metrics
      const metrics = {
        itemsWithSalesData: result.items.filter((item: any) => 
          (item.sales_last_30_days && item.sales_last_30_days > 0) || 
          (item.sales_last_90_days && item.sales_last_90_days > 0)
        ).length,
        itemsWithCost: result.items.filter((item: any) => 
          item.cost && item.cost > 0
        ).length,
        itemsWithVendor: result.items.filter((item: any) => 
          item.vendor && item.vendor.trim() !== ''
        ).length,
        lastSyncDate: result.items.length > 0 && result.items[0].last_updated 
          ? result.items[0].last_updated 
          : null
      }
      setDataQualityMetrics(metrics)
      
      // Log data quality warnings
      if (result.items.length === 0) {
        console.warn('⚠️ No inventory data found - sync may be needed')
      } else if (result.items.length < 10) {
        console.warn(`⚠️ Only ${result.items.length} items in inventory - this seems low`)
      }
      
      const salesDataPercent = result.items.length > 0 
        ? (metrics.itemsWithSalesData / result.items.length * 100).toFixed(1)
        : 0
      if (Number(salesDataPercent) < 20) {
        console.warn(`⚠️ Only ${salesDataPercent}% of items have sales data`)
      }
      
    } catch (error) {
      console.error('Error loading inventory:', error)
      // Show more detailed error information
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        })
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const loadSummary = async () => {
    try {
      const response = await fetch('/api/inventory/summary')
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setSummary(data.data)
    } catch (error) {
      console.error('Error loading summary:', error)
    }
  }

  // Initial load
  useEffect(() => {
    loadInventory()
    loadSummary()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadInventory()
    await loadSummary()
  }

  const handleStockUpdate = async (itemId: string, newStock: number) => {
    try {
      const response = await fetch(`/api/inventory/${itemId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update stock')
      }
      
      // Refresh data
      await loadInventory()
      await loadSummary()
    } catch (error) {
      console.error('Error updating stock:', error)
      alert('Failed to update stock. Please try again.')
    }
  }

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
      
      // Refresh data
      await loadInventory()
    } catch (error) {
      console.error('Error updating cost:', error)
      alert('Failed to update cost. Please try again.')
    }
  }

  const handleStartCostEdit = (itemId: string, currentCost: number) => {
    setEditingItem(itemId)
    setEditCost(currentCost)
    setShowCostEdit(true)
  }

  const handleCancelCostEdit = () => {
    setEditingItem(null)
    setShowCostEdit(false)
  }

  const handleToggleItemVisibility = async (itemId: string, hidden: boolean) => {
    try {
      const response = await fetch(`/api/inventory/${itemId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update item visibility')
      }
      
      // Refresh data to reflect the change
      await loadInventory()
    } catch (error) {
      console.error('Error updating item visibility:', error)
      alert('Failed to update item visibility. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-end gap-3">
        {/* Sync Status */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className={`h-2 w-2 rounded-full ${
            dataQualityMetrics.lastSyncDate && isRecentSync(dataQualityMetrics.lastSyncDate)
              ? 'bg-green-500' 
              : 'bg-yellow-500'
          }`} />
          <span>
            Last sync: {dataQualityMetrics.lastSyncDate 
              ? formatSyncTime(dataQualityMetrics.lastSyncDate)
              : 'Unknown'
            }
          </span>
        </div>

        {/* Export Buttons */}
        <CompactExportButtons items={filteredItems} />

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Filter Panel */}
      <AdvancedFilterPanel
        filterConfig={filterConfig}
        onFilterChange={updateFilter}
        onClearFilters={clearFilters}
        presetFilters={presetFilters}
        activePresetFilter={activePresetFilter}
        onApplyPresetFilter={applyPresetFilter}
        filterCounts={filterCounts}
        uniqueVendors={uniqueVendors}
        uniqueLocations={uniqueLocations}
        columns={columns}
        onToggleColumn={toggleColumn}
        onReorderColumns={reorderColumns}
        onResetColumns={resetColumns}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={(value) => {
          setItemsPerPage(value)
          setCurrentPage(1)
        }}
      />

      {/* Critical Items Monitor - Only show when Critical Stock filter is active */}
      {activePresetFilter === 'critical' && <CriticalItemsMonitor />}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>
          Showing {startIndex + 1}-{Math.min(endIndex, filteredCount)} of {filteredCount} items
          {filteredCount !== totalItems && (
            <span> (filtered from {totalItems.toLocaleString()} total)</span>
          )}
        </div>
      </div>

      {/* Enhanced Inventory Table */}
      <EnhancedInventoryTable
        items={paginatedItems}
        columns={columns}
        sortConfig={sortConfig}
        onSort={handleSort}
        onStockUpdate={handleStockUpdate}
        onCostEdit={handleCostUpdate}
        editingItem={editingItem}
        showCostEdit={showCostEdit}
        editCost={editCost}
        onStartCostEdit={handleStartCostEdit}
        onCancelCostEdit={handleCancelCostEdit}
        onToggleVisibility={handleToggleItemVisibility}
      />

      {/* Pagination */}
      {filteredCount > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(currentPage - 2 + i, totalPages - 4 + i))
                if (pageNum > totalPages) return null
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`px-3 py-2 text-sm border rounded-md ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
