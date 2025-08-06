'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, RefreshCw, Loader2, Plus, Grid3X3, List, X } from 'lucide-react'
import { Toaster, toast } from 'react-hot-toast'
import { Vendor } from '@/lib/data-access/vendors'
import EnhancedVendorCard from '@/app/components/vendors/EnhancedVendorCard'
import VendorListView from '@/app/components/vendors/VendorListView'
import ErrorBoundary, { PageErrorFallback } from '@/app/components/common/ErrorBoundary'
import { VendorsLoadingFallback } from '@/app/components/common/LoadingFallback'
import PaginationControls from '@/app/components/inventory/PaginationControls'
import { useDebounce } from '@/app/hooks/useDebounce'
import { VendorPageSkeleton, VendorCardSkeleton, VendorListSkeleton } from '@/app/components/vendors/VendorSkeletons'

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
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [vendorStats, setVendorStats] = useState<Record<string, VendorStats>>({})
  const [loadingStats, setLoadingStats] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  
  // Debounce search term to improve performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [isSearching, setIsSearching] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50) // Match inventory default
  const [totalVendors, setTotalVendors] = useState(0)
  
  // Sorting state
  const [sortField, setSortField] = useState<'name' | 'totalItems' | 'totalSpend' | 'lastOrderDate'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    loadVendors()
    // Load saved view mode from localStorage
    const savedViewMode = localStorage.getItem('vendor-view-mode')
    if (savedViewMode === 'list' || savedViewMode === 'card') {
      setViewMode(savedViewMode)
    }
  }, [])

  // Load vendor statistics when vendors are loaded
  useEffect(() => {
    if (vendors.length > 0) {
      loadVendorStatistics()
    }
  }, [vendors])

  // Handle URL parameter for vendor filtering
  useEffect(() => {
    const vendorParam = searchParams.get('vendor')
    if (vendorParam) {
      setSearchTerm(decodeURIComponent(vendorParam))
      
      // Scroll to the vendor card after a brief delay to allow rendering
      setTimeout(() => {
        const targetVendor = vendors.find(v => 
          v.name.toLowerCase() === vendorParam.toLowerCase()
        )
        if (targetVendor) {
          const vendorElement = document.querySelector(`[data-vendor-id="${targetVendor.id}"]`)
          if (vendorElement) {
            vendorElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            })
            // Add a subtle highlight effect
            vendorElement.classList.add('ring-2', 'ring-blue-400', 'ring-opacity-75')
            setTimeout(() => {
              vendorElement.classList.remove('ring-2', 'ring-blue-400', 'ring-opacity-75')
            }, 3000)
          }
        }
      }, 500)
    }
  }, [searchParams, vendors])

  const loadVendors = async () => {
    try {
      const response = await fetch('/api/vendors')
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load vendors')
      }
      
      setVendors(result.data || [])
      setTotalVendors(result.data?.length || 0)
    } catch (error) {
      logError('Error loading vendors:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load vendors'
      toast.error(errorMessage)
      setVendors([])
    } finally {
      setLoading(false)
    }
  }

  const loadVendorStatistics = async () => {
    // Load stats for all vendors in parallel
    const promises = vendors.map(async (vendor) => {
      if (vendorStats[vendor.id]) return // Already loaded
      
      setLoadingStats(prev => ({ ...prev, [vendor.id]: true }))
      
      try {
        const response = await fetch(`/api/vendors/${vendor.id}/stats`)
        if (response.ok) {
          const stats = await response.json()
          setVendorStats(prev => ({ ...prev, [vendor.id]: stats }))
        }
      } catch (error) {
        logError(`Error loading stats for vendor ${vendor.name}:`, error)
      } finally {
        setLoadingStats(prev => ({ ...prev, [vendor.id]: false }))
      }
    })

    await Promise.all(promises)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadVendors()
      // Clear stats to reload them
      setVendorStats({})
      toast.success('Vendors refreshed successfully')
    } catch (error) {
      logError('Error refreshing vendors:', error)
      toast.error('Failed to refresh vendors')
    } finally {
      setRefreshing(false)
    }
  }

  const handleViewModeChange = (mode: 'card' | 'list') => {
    setViewMode(mode)
    localStorage.setItem('vendor-view-mode', mode)
  }

  const clearSearch = () => {
    setSearchTerm('')
  }

  const filteredVendors = vendors.filter(vendor => 
    vendor.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    (vendor.contact_name && vendor.contact_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
    (vendor.email && vendor.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
  )
  
  // Sort vendors
  const sortedVendors = [...filteredVendors].sort((a, b) => {
    let aValue: any
    let bValue: any
    
    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'totalItems':
        aValue = vendorStats[a.id]?.totalItems || 0
        bValue = vendorStats[b.id]?.totalItems || 0
        break
      case 'totalSpend':
        aValue = vendorStats[a.id]?.totalSpend || 0
        bValue = vendorStats[b.id]?.totalSpend || 0
        break
      case 'lastOrderDate':
        aValue = vendorStats[a.id]?.lastOrderDate || ''
        bValue = vendorStats[b.id]?.lastOrderDate || ''
        break
      default:
        return 0
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })
  
  // Calculate pagination
  const totalPages = Math.ceil(sortedVendors.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedVendors = sortedVendors.slice(startIndex, endIndex)
  
  // Reset to first page when search or sort changes
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, sortField, sortDirection])
  
  // Update searching state when debounced term changes
  useEffect(() => {
    setIsSearching(false)
  }, [debouncedSearchTerm])
  
  // Handle sort change
  const handleSort = (field: typeof sortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  if (loading) {
    return (
      <>
        <Toaster />
        <VendorPageSkeleton />
      </>
    )
  }

  return (
    <div className="space-y-6">
      <Toaster />
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Page Title and Info */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
            <p className="text-sm text-gray-600 mt-1">
              {sortedVendors.length} of {vendors.length} vendors
              {searchTerm && ` matching "${searchTerm}"`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
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

      {/* Search and View Controls */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendors by name, contact, or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setIsSearching(true)
              }}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  clearSearch()
                  setIsSearching(false)
                }}
                title="Clear search"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {isSearching && searchTerm && (
              <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
            <button
              onClick={() => handleViewModeChange('card')}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'card'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
              Cards
            </button>
            <button
              onClick={() => handleViewModeChange('list')}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4" />
              List
            </button>
          </div>
        </div>
      </div>

      {/* Vendors Display */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedVendors.map((vendor) => (
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
          vendors={paginatedVendors}
          vendorStats={vendorStats}
          loadingStats={loadingStats}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      )}
      
      {/* Pagination */}
      {sortedVendors.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={vendors.length}
          filteredCount={sortedVendors.length}
          itemsPerPage={itemsPerPage}
          startIndex={startIndex}
          endIndex={Math.min(endIndex, sortedVendors.length)}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(value) => {
            setItemsPerPage(value)
            setCurrentPage(1)
          }}
          className="mt-6"
        />
      )}

      {sortedVendors.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          {searchTerm ? (
            <div>
              <p className="text-lg font-medium">No vendors found</p>
              <p className="mt-2">No vendors match your search for "{searchTerm}"</p>
              <button
                onClick={clearSearch}
                className="mt-4 text-blue-700 hover:text-blue-800 underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium">No vendors found</p>
              <p className="mt-2">Vendors are synced automatically from Finale daily.</p>
              <p className="mt-1 text-sm">If you just set up the system, the first sync will run at 4 AM UTC.</p>
            </div>
          )}
        </div>
      )}

    </div>
  )
}