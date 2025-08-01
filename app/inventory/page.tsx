'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Loader2 } from 'lucide-react'
import { Toaster, toast } from 'react-hot-toast'
import CompactExportButtons from '@/app/components/inventory/CompactExportButtons'
import CriticalItemsMonitor from '@/app/components/CriticalItemsMonitor'
import useInventoryTableManager from '@/app/hooks/useInventoryTableManager'
import { useEnhancedInventoryFiltering } from '@/app/hooks/useEnhancedInventoryFiltering'
import EnhancedQuickFilters from '@/app/components/inventory/EnhancedQuickFilters'
import AdvancedFilterPanel from '@/app/components/inventory/AdvancedFilterPanel'
import ColumnSelector from '@/app/components/inventory/ColumnSelector'
import EnhancedInventoryTable from '@/app/components/inventory/EnhancedInventoryTable'
import PaginationControls from '@/app/components/inventory/PaginationControls'
import InventoryTableSkeleton, { FilterPanelSkeleton } from '@/app/components/inventory/InventoryTableSkeleton'
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
  const [useEnhancedFilters, setUseEnhancedFilters] = useState(true) // Toggle between filter systems
  
  // Use the comprehensive table manager for legacy support
  const {
    filteredItems: legacyFilteredItems,
    totalItems,
    filteredCount: legacyFilteredCount,
    columns,
    visibleColumns,
    toggleColumn,
    reorderColumns,
    resetColumns,
    filterConfig,
    updateFilter,
    clearFilters: legacyClearFilters,
    activePresetFilter,
    applyPresetFilter,
    presetFilters,
    filterCounts: legacyFilterCounts,
    uniqueVendors,
    uniqueLocations,
    sortConfig,
    handleSort
  } = useInventoryTableManager(allItems)

  // Use the enhanced filtering system
  const {
    filteredItems: enhancedFilteredItems,
    filterCounts: enhancedFilterCounts,
    activeFilterConfig,
    setActiveFilterConfig,
    applyFilter,
    clearFilters: enhancedClearFilters,
    activeFilterId,
    isFilterActive
  } = useEnhancedInventoryFiltering(allItems)

  // Choose which filter system to use
  const filteredItems = useEnhancedFilters ? enhancedFilteredItems : legacyFilteredItems
  const filteredCount = filteredItems.length
  const filterCounts = useEnhancedFilters ? enhancedFilterCounts : legacyFilterCounts
  const clearFilters = useEnhancedFilters ? enhancedClearFilters : legacyClearFilters

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
      toast.success('Cost updated successfully!')
    } catch (error) {
      console.error('Error updating cost:', error)
      toast.error('Failed to update cost. Please try again.')
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
      const response = await fetch(`/api/inventory/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          hidden: !hidden 
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update item visibility')
      }

      // Refresh data
      await loadInventory()
      
      // Auto-disable "Show Hidden Items" filter when hiding items for better UX
      if (!hidden) {
        updateFilter({ showHidden: false })
      }
      
      toast.success(`Item ${!hidden ? 'hidden' : 'shown'} successfully`)
    } catch (error) {
      console.error('Error updating item visibility:', error)
      toast.error('Failed to update item visibility')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Toaster />
        
        {/* Header Skeleton */}
        <div className="flex items-center justify-end gap-3">
          <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>

        {/* Filter Panel Skeleton */}
        <FilterPanelSkeleton />

        {/* Table Skeleton */}
        <InventoryTableSkeleton />

        {/* Pagination Skeleton */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="flex items-center gap-2">
              <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-8 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-8 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Toaster />
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Filter System Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Filter System:</span>
            <button
              onClick={() => setUseEnhancedFilters(!useEnhancedFilters)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                useEnhancedFilters 
                  ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                  : 'bg-gray-100 text-gray-700 border border-gray-300'
              }`}
            >
              {useEnhancedFilters ? '✨ Enhanced' : '📊 Legacy'}
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
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
      </div>

      {/* Filter Panel - Choose between Enhanced and Legacy */}
      {useEnhancedFilters ? (
        <EnhancedQuickFilters
          activeFilter={activeFilterId}
          onFilterChange={applyFilter}
          onClearFilters={enhancedClearFilters}
          itemCounts={enhancedFilterCounts}
          className="bg-white rounded-lg shadow"
        />
      ) : (
        <AdvancedFilterPanel
          filterConfig={filterConfig}
          onFilterChange={updateFilter}
          onClearFilters={legacyClearFilters}
          presetFilters={presetFilters}
          activePresetFilter={activePresetFilter}
          onApplyPresetFilter={applyPresetFilter}
          filterCounts={legacyFilterCounts}
          uniqueVendors={uniqueVendors}
          uniqueLocations={uniqueLocations}
          columns={columns}
          onToggleColumn={toggleColumn}
          onReorderColumns={reorderColumns}
          onResetColumns={resetColumns}
        />
      )}

      {/* Critical Items Monitor - Show when critical filters are active */}
      {(activePresetFilter === 'critical' || (useEnhancedFilters && activeFilterId === 'critical-stock')) && <CriticalItemsMonitor />}

      {/* Enhanced Inventory Table */}
      <EnhancedInventoryTable
        items={paginatedItems}
        columns={columns}
        sortConfig={sortConfig}
        onSort={handleSort}
        onCostEdit={handleCostUpdate}
        editingItem={editingItem}
        showCostEdit={showCostEdit}
        editCost={editCost}
        onStartCostEdit={handleStartCostEdit}
        onCancelCostEdit={handleCancelCostEdit}
        onToggleVisibility={handleToggleItemVisibility}
      />

      {/* Enhanced Pagination Controls */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        filteredCount={filteredCount}
        itemsPerPage={itemsPerPage}
        startIndex={startIndex}
        endIndex={endIndex}
        onPageChange={goToPage}
        onItemsPerPageChange={(value) => {
          setItemsPerPage(value)
          setCurrentPage(1)
        }}
      />
    </div>
  )
}
