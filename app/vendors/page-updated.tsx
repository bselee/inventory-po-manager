'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Toaster, toast } from 'react-hot-toast'
import { Vendor } from '@/app/lib/data-access/vendors'
import EnhancedVendorCard from '@/app/components/vendors/EnhancedVendorCard'
import VendorListView from '@/app/components/vendors/VendorListView'
import ErrorBoundary, { PageErrorFallback } from '@/app/components/common/ErrorBoundary'
import { VendorsLoadingFallback } from '@/app/components/common/LoadingFallback'
import PaginationControls from '@/app/components/inventory/PaginationControls'
import PageHeader from '@/app/components/common/PageHeader'
import UniversalQuickFilters from '@/app/components/common/UniversalQuickFilters'
import { useUniversalPageData } from '@/app/hooks/useUniversalPageData'
import { vendorQuickFilters, VendorWithStats } from '@/app/lib/quickFilters'

interface VendorStats {
  vendor: Vendor
  totalItems: number
  totalPurchaseOrders: number
  totalSpend: number
  averageOrderValue: number
  lastOrderDate: string | null
  ordersByStatus: {
    draft: number
    submitted: number
    approved: number
  }
  inventoryStats: {
    totalValue: number
    lowStockItems: number
    outOfStockItems: number
    fastMovingItems: number
    inStockItems: number
  }
}

export default function VendorsPage() {
  return (
    <ErrorBoundary fallback={PageErrorFallback}>
      <Suspense fallback={<VendorsLoadingFallback />}>
        <VendorsPageContent />
      </Suspense>
    </ErrorBoundary>
  )
}

function VendorsPageContent() {
  const searchParams = useSearchParams()
  const [vendorStats, setVendorStats] = useState<Record<string, VendorStats>>({})
  const [loadingStats, setLoadingStats] = useState<Record<string, boolean>>({})
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>('')
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  
  // Use universal data management
  const {
    data: vendors,
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
  } = useUniversalPageData<Vendor>({
    endpoint: '/api/vendors',
    searchFields: ['name', 'contact_name', 'email'],
    defaultItemsPerPage: 50,
    defaultSort: { field: 'name', direction: 'asc' },
    transform: (data) => data.data || data || []
  })

  // Load saved view mode from localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem('vendor-view-mode')
    if (savedViewMode === 'list' || savedViewMode === 'card') {
      setViewMode(savedViewMode)
    }
  }, [])

  // Save view mode to localStorage
  const handleViewModeChange = (mode: 'card' | 'list') => {
    setViewMode(mode)
    localStorage.setItem('vendor-view-mode', mode)
  }

  // Load vendor statistics
  const loadVendorStatistics = async () => {
    if (vendors.length === 0) return

    // Load stats for visible vendors only
    const visibleVendors = filteredData.slice(
      (currentPage - 1) * itemsPerPage, 
      currentPage * itemsPerPage
    )

    for (const vendor of visibleVendors) {
      if (vendorStats[vendor.id] || loadingStats[vendor.id]) continue

      setLoadingStats(prev => ({ ...prev, [vendor.id]: true }))

      try {
        const response = await fetch(`/api/vendors/${vendor.id}/stats`)
        const data = await response.json()

        if (data.error) {
          console.error(`Error loading stats for vendor ${vendor.id}:`, data.error)
          continue
        }

        setVendorStats(prev => ({
          ...prev,
          [vendor.id]: data.data
        }))
      } catch (error) {
        console.error(`Error loading stats for vendor ${vendor.id}:`, error)
      } finally {
        setLoadingStats(prev => ({ ...prev, [vendor.id]: false }))
      }
    }
  }

  // Load stats when vendors or pagination changes
  useEffect(() => {
    if (vendors.length > 0) {
      loadVendorStatistics()
    }
  }, [vendors, currentPage, filteredData])

  // Handle URL parameter for vendor navigation
  useEffect(() => {
    const vendorParam = searchParams.get('vendor')
    if (vendorParam) {
      const decodedVendor = decodeURIComponent(vendorParam)
      setSearchTerm(decodedVendor)
      
      // Scroll to the vendor after a brief delay
      setTimeout(() => {
        const targetVendor = vendors.find(v => 
          v.name.toLowerCase() === decodedVendor.toLowerCase()
        )
        if (targetVendor) {
          const vendorElement = document.querySelector(`[data-vendor-id="${targetVendor.id}"]`)
          if (vendorElement) {
            vendorElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center'
            })
          }
        }
      }, 100)
    }
  }, [searchParams, vendors, setSearchTerm])

  // Convert vendors to VendorWithStats for filtering
  const vendorsWithStats: VendorWithStats[] = vendors.map(vendor => ({
    ...vendor,
    stats: vendorStats[vendor.id]
  }))

  // Apply quick filter to filtered data
  const quickFilteredData = activeQuickFilter 
    ? vendorsWithStats.filter(vendor => {
        const filter = vendorQuickFilters.find(f => f.id === activeQuickFilter)
        return filter ? filter.filter(vendor) : true
      })
    : vendorsWithStats

  // Calculate final pagination on quick filtered data
  const finalTotalPages = Math.ceil(quickFilteredData.length / itemsPerPage)
  const finalStartIndex = (currentPage - 1) * itemsPerPage
  const finalEndIndex = finalStartIndex + itemsPerPage
  const finalPaginatedVendors = quickFilteredData.slice(finalStartIndex, finalEndIndex)

  // Handle quick filter changes
  const handleQuickFilterChange = (filterId: string) => {
    setActiveQuickFilter(activeQuickFilter === filterId ? '' : filterId)
    setCurrentPage(1) // Reset to first page
  }

  const clearQuickFilters = () => {
    setActiveQuickFilter('')
    setCurrentPage(1)
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Toaster />
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Vendors</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={refresh}
            className="mt-3 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const subtitle = `${quickFilteredData.length} of ${totalCount} vendors${searchTerm ? ` matching "${searchTerm}"` : ''}${activeQuickFilter ? ' (filtered)' : ''}`

  return (
    <div className="space-y-6">
      <Toaster />
      
      {/* Page Header */}
      <PageHeader
        title="Vendors"
        subtitle={subtitle}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search vendors by name, contact, or email..."
        showRefresh={true}
        refreshing={refreshing}
        onRefresh={refresh}
        showViewToggle={true}
        viewMode={viewMode}
        viewModeOptions={['card', 'list']}
        onViewModeChange={(mode) => {
          if (mode === 'card' || mode === 'list') {
            handleViewModeChange(mode)
          }
        }}
      />

      {/* Quick Filters */}
      <UniversalQuickFilters
        items={vendorsWithStats}
        filters={vendorQuickFilters}
        activeFilter={activeQuickFilter}
        onFilterChange={handleQuickFilterChange}
        onClearFilters={clearQuickFilters}
        showCounts={true}
      />

      {/* Main Content */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {finalPaginatedVendors.map((vendor) => (
            <div key={vendor.id} data-vendor-id={vendor.id}>
              <EnhancedVendorCard
                vendor={vendor}
                stats={vendorStats[vendor.id]}
                isLoading={loadingStats[vendor.id]}
              />
            </div>
          ))}
        </div>
      ) : (
        <VendorListView
          vendors={finalPaginatedVendors}
          vendorStats={vendorStats}
          loadingStats={loadingStats}
          sortField={sortField as 'name' | 'totalItems' | 'totalSpend' | 'lastOrderDate'}
          sortDirection={sortDirection}
          onSort={(field) => handleSort(field as keyof Vendor)}
        />
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

      {/* No vendors message */}
      {quickFilteredData.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          {searchTerm || activeQuickFilter ? (
            <div>
              <p className="text-lg font-medium">No vendors found</p>
              <p className="mt-2">
                No vendors match your current search or filters
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
              <p className="text-lg font-medium">No vendors found</p>
              <p className="mt-2">Run vendor sync to import vendors from Finale.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
