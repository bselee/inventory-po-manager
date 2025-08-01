'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, RefreshCw, Loader2, Plus, Grid3X3, List, X } from 'lucide-react'
import { Toaster, toast } from '@/app/components/common/SimpleToast'
import { Vendor } from '@/app/lib/data-access/vendors'
import EnhancedVendorCard from '@/app/components/vendors/EnhancedVendorCard'
import VendorListView from '@/app/components/vendors/VendorListView'
import ErrorBoundary, { PageErrorFallback } from '@/app/components/common/ErrorBoundary'
import { VendorsLoadingFallback } from '@/app/components/common/LoadingFallback'

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
  const [editingVendor, setEditingVendor] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Vendor>>({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [newVendor, setNewVendor] = useState<Partial<Vendor>>({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  })

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
    } catch (error) {
      console.error('Error loading vendors:', error)
      toast.error('Failed to load vendors')
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
        console.error(`Error loading stats for vendor ${vendor.name}:`, error)
      } finally {
        setLoadingStats(prev => ({ ...prev, [vendor.id]: false }))
      }
    })

    await Promise.all(promises)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadVendors()
    // Clear stats to reload them
    setVendorStats({})
    setRefreshing(false)
  }

  const handleViewModeChange = (mode: 'card' | 'list') => {
    setViewMode(mode)
    localStorage.setItem('vendor-view-mode', mode)
  }

  const clearSearch = () => {
    setSearchTerm('')
  }

  const startEditing = (vendor: Vendor) => {
    setEditingVendor(vendor.id)
    setEditForm({
      contact_name: vendor.contact_name,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address,
      notes: vendor.notes
    })
  }

  const handleUpdate = async (vendorId: string) => {
    try {
      const vendorToUpdate = vendors.find(v => v.id === vendorId)
      if (!vendorToUpdate) return

      const response = await fetch(`/api/vendors/${vendorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...vendorToUpdate,
          ...editForm
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update vendor')
      }

      const updatedVendor = await response.json()
      
      // Update local state
      setVendors(vendors.map(vendor => 
        vendor.id === vendorId ? updatedVendor : vendor
      ))
      setEditingVendor(null)

      // Show sync warning if present
      if (updatedVendor.syncWarning) {
        alert(updatedVendor.syncWarning)
      }
    } catch (error) {
      console.error('Error updating vendor:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to update vendor'}`)
    }
  }

  const handleAdd = async () => {
    try {
      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVendor)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create vendor')
      }

      const data = await response.json()

      if (data) {
        setVendors([...vendors, data])
        setShowAddModal(false)
        setNewVendor({
          name: '',
          contact_name: '',
          email: '',
          phone: '',
          address: '',
          notes: ''
        })

        // Show sync status
        if (data.syncStatus === 'local-only') {
          alert('Vendor created locally but could not sync to Finale. Check your Finale settings.')
        }
      }
    } catch (error) {
      console.error('Error adding vendor:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to add vendor'}`)
    }
  }

  const filteredVendors = vendors.filter(vendor => 
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vendor.contact_name && vendor.contact_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (vendor.email && vendor.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div>
      <Toaster />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Vendors</h1>
          <p className="text-gray-600 text-sm mt-1">
            {filteredVendors.length} of {vendors.length} vendors
            {searchTerm && ` matching "${searchTerm}"`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Add Vendor
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search and View Controls */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendors by name, contact, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                title="Clear search"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
            <button
              onClick={() => handleViewModeChange('card')}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'card'
                  ? 'bg-white text-blue-600 shadow-sm'
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
                  ? 'bg-white text-blue-600 shadow-sm'
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
          {filteredVendors.map((vendor) => (
            <div key={vendor.id} data-vendor-id={vendor.id}>
              <EnhancedVendorCard
                vendor={vendor}
                stats={vendorStats[vendor.id]}
                isLoading={loadingStats[vendor.id]}
                onEdit={startEditing}
              />
            </div>
          ))}
        </div>
      ) : (
        <VendorListView
          vendors={filteredVendors}
          vendorStats={vendorStats}
          loadingStats={loadingStats}
          onEdit={startEditing}
        />
      )}

      {filteredVendors.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          {searchTerm ? (
            <div>
              <p className="text-lg font-medium">No vendors found</p>
              <p className="mt-2">No vendors match your search for "{searchTerm}"</p>
              <button
                onClick={clearSearch}
                className="mt-4 text-blue-600 hover:text-blue-800 underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium">No vendors found</p>
              <p className="mt-2">Run vendor sync to import from Finale or add vendors manually.</p>
            </div>
          )}
        </div>
      )}

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Add New Vendor</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Vendor Name *"
                value={newVendor.name || ''}
                onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
              <input
                type="text"
                placeholder="Contact Name"
                value={newVendor.contact_name || ''}
                onChange={(e) => setNewVendor({ ...newVendor, contact_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <input
                type="email"
                placeholder="Email"
                value={newVendor.email || ''}
                onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={newVendor.phone || ''}
                onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <textarea
                placeholder="Address"
                value={newVendor.address || ''}
                onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={2}
              />
              <textarea
                placeholder="Notes"
                value={newVendor.notes || ''}
                onChange={(e) => setNewVendor({ ...newVendor, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={2}
              />
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleAdd}
                disabled={!newVendor.name}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                Add Vendor
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewVendor({
                    name: '',
                    contact_name: '',
                    email: '',
                    phone: '',
                    address: '',
                    notes: ''
                  })
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}