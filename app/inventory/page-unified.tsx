'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { RefreshCw, Loader2 } from 'lucide-react'
import { Toaster, toast } from 'react-hot-toast'
import CompactExportButtons from '@/app/components/inventory/CompactExportButtons'
import CriticalItemsMonitor from '@/app/components/CriticalItemsMonitor'
import UnifiedFilterSystem from '@/app/components/inventory/UnifiedFilterSystem'
import { useUnifiedFilters } from '@/app/hooks/useUnifiedFilters'
import useInventoryTableManager from '@/app/hooks/useInventoryTableManager'
import { useInventoryDataSource, getInventoryEndpoint } from '@/app/hooks/useInventoryDataSource'
import ColumnSelector from '@/app/components/inventory/ColumnSelector'
import EnhancedInventoryTable from '@/app/components/inventory/EnhancedInventoryTable'
import PaginationControls from '@/app/components/inventory/PaginationControls'
import InventoryTableSkeleton from '@/app/components/inventory/InventoryTableSkeleton'
import CacheStatusIndicator from '@/app/components/inventory/CacheStatusIndicator'
import { InventoryItem } from '@/app/types'
import ErrorBoundary, { PageErrorFallback } from '@/app/components/common/ErrorBoundary'
import { InventoryLoadingFallback } from '@/app/components/common/LoadingFallback'
import { logError, logWarn } from '@/app/lib/monitoring'

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

export default function UnifiedInventoryPage() {
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
  const [allItems, setAllItems] = useState<InventoryItem[]>([])
  const [summary, setSummary] = useState<InventorySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cacheInfo, setCacheInfo] = useState<{ lastSync?: string; source?: string } | null>(null)
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null)
  
  // Get the data source configuration
  const { dataSource } = useInventoryDataSource()
  
  // Use the unified filter system
  const {
    filteredItems,
    filterConfig,
    updateFilter,
    clearFilters,
    activeFilterCount,
    isFiltered,
    uniqueVendors,
    uniqueLocations,
    statusCounts,
    velocityCounts,
    trendCounts
  } = useUnifiedFilters(allItems)
  
  // Use the table manager for columns and sorting
  const {
    columns,
    visibleColumns,
    toggleColumn,
    reorderColumns,
    resetColumns,
    applyColumnPreset,
    columnPresets,
    sortConfig,
    handleSort
  } = useInventoryTableManager(filteredItems)
  
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
  
  // Apply sorting to filtered items
  const sortedItems = [...filteredItems].sort((a, b) => {
    const aValue = a[sortConfig.key as keyof InventoryItem]
    const bValue = b[sortConfig.key as keyof InventoryItem]
    
    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortConfig.direction === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }
    
    return sortConfig.direction === 'asc'
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number)
  })
  
  // Pagination calculations
  const totalItems = allItems.length
  const filteredCount = filteredItems.length
  const totalPages = Math.ceil(filteredCount / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedItems = sortedItems.slice(startIndex, endIndex)
  
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
      let allInventoryItems: any[] = []
      let page = 1
      let hasMore = true
      
      while (hasMore) {
        const endpoint = getInventoryEndpoint(dataSource)
        const response = await fetch(`${endpoint}?limit=1000&page=${page}`)
        const data = await response.json()
        
        if (data.error) {
          throw new Error(data.error)
        }
        
        const items = data.data?.inventory || data.items || []
        const pagination = data.data?.pagination || data.pagination || {}
        
        // Capture cache info from the first response
        if (page === 1 && data.cacheInfo) {
          setCacheInfo(data.cacheInfo)
        }
        
        allInventoryItems = allInventoryItems.concat(items)
        
        // Check if there are more items
        hasMore = items.length === 1000 && page < (pagination.totalPages || 0)
        page++
        
        // Safety break to prevent infinite loops
        if (page > 20) {
          logWarn('⚠️ Stopped at page 20 to prevent infinite loop')
          break
        }
      }
      
      const result = {
        items: allInventoryItems,
        total: allInventoryItems.length
      }
      
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
        logWarn('⚠️ No inventory data found - sync may be needed')
      } else if (result.items.length < 10) {
        logWarn(`⚠️ Only ${result.items.length} items in inventory - this seems low`)
      }
      
      const salesDataPercent = result.items.length > 0 
        ? (metrics.itemsWithSalesData / result.items.length * 100).toFixed(1)
        : 0
      if (Number(salesDataPercent) < 20) {
        logWarn(`⚠️ Only ${salesDataPercent}% of items have sales data`)
      }
      
    } catch (error) {
      logError('Error loading inventory:', error)
      if (error instanceof Error) {
        logError('Error details:', {
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
      logError('Error loading summary:', error)
    }
  }
  
  // Initial load
  useEffect(() => {
    loadInventory()
    loadSummary()
  }, [])
  
  // Handle URL parameter for vendor filtering
  useEffect(() => {
    const vendorParam = searchParams.get('vendor')
    if (vendorParam && allItems.length > 0) {
      const decodedVendor = decodeURIComponent(vendorParam)
      updateFilter({ vendor: decodedVendor })
      toast.success(`Filtering inventory by vendor: ${decodedVendor}`)
    }
  }, [searchParams, allItems, updateFilter])
  
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
      logError('Error updating cost:', error)
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
      
      toast.success(hidden ? 'Item unhidden' : 'Item hidden')
    } catch (error) {
      logError('Error toggling item visibility:', error)
      toast.error('Failed to update item visibility')
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Toaster position="top-right" />
      
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                {totalItems.toLocaleString()} total items
                {isFiltered && ` • ${filteredCount.toLocaleString()} filtered`}
                {cacheInfo?.lastSync && (
                  <span className={isRecentSync(cacheInfo.lastSync) ? 'text-green-600' : 'text-yellow-600'}>
                    {' • '}{cacheInfo.source === 'cache' ? 'Cached' : 'Live'} data from {formatSyncTime(cacheInfo.lastSync)}
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <CacheStatusIndicator cacheInfo={cacheInfo} />
              
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </button>
              
              <CompactExportButtons items={filteredItems} />
            </div>
          </div>
          
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="text-sm font-medium text-gray-500">Total Value</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900">
                  ${summary.total_inventory_value.toLocaleString()}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="text-sm font-medium text-gray-500">Out of Stock</div>
                <div className="mt-1 text-2xl font-semibold text-red-600">
                  {summary.out_of_stock_count}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="text-sm font-medium text-gray-500">Low Stock</div>
                <div className="mt-1 text-2xl font-semibold text-yellow-600">
                  {summary.low_stock_count}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="text-sm font-medium text-gray-500">Critical Items</div>
                <div className="mt-1 text-2xl font-semibold text-orange-600">
                  {summary.critical_reorder_count || 0}
                </div>
              </div>
            </div>
          )}
          
          {/* Critical Items Monitor */}
          <CriticalItemsMonitor items={allItems} className="mb-6" />
        </div>
        
        {/* Unified Filter System */}
        <UnifiedFilterSystem
          items={allItems}
          onFilteredItemsChange={() => {}}
          onActiveFilterChange={setActiveFilterId}
          className="mb-6"
        />
        
        {/* Column Selector */}
        <div className="mb-4">
          <ColumnSelector
            columns={columns}
            onToggleColumn={toggleColumn}
            onReorderColumns={reorderColumns}
            onResetColumns={resetColumns}
            onApplyPreset={applyColumnPreset}
            presets={columnPresets}
          />
        </div>
        
        {/* Main Table */}
        {loading ? (
          <InventoryTableSkeleton />
        ) : (
          <>
            <EnhancedInventoryTable
              items={paginatedItems}
              columns={visibleColumns}
              sortConfig={sortConfig}
              onSort={handleSort}
              onStartCostEdit={handleStartCostEdit}
              onToggleVisibility={handleToggleItemVisibility}
              editingItem={editingItem}
              showCostEdit={showCostEdit}
              editCost={editCost}
              onCostUpdate={handleCostUpdate}
              onCancelCostEdit={handleCancelCostEdit}
              setEditCost={setEditCost}
            />
            
            {/* Pagination Controls */}
            {filteredCount > itemsPerPage && (
              <div className="mt-6">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredCount}
                  itemsPerPage={itemsPerPage}
                  onPageChange={goToPage}
                  onItemsPerPageChange={(value) => {
                    setItemsPerPage(value)
                    setCurrentPage(1)
                  }}
                />
              </div>
            )}
          </>
        )}
        
        {/* Data Quality Indicators */}
        {!loading && dataQualityMetrics.lastSyncDate && (
          <div className="mt-6 text-sm text-gray-500 text-center">
            <div>
              {dataQualityMetrics.itemsWithSalesData} items with sales data • 
              {dataQualityMetrics.itemsWithCost} items with cost data • 
              {dataQualityMetrics.itemsWithVendor} items with vendor info
            </div>
            {dataQualityMetrics.lastSyncDate && (
              <div className="mt-1">
                Last sync: {new Date(dataQualityMetrics.lastSyncDate).toLocaleString()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}