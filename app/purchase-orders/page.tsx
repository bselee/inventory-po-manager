'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Plus, Send, FileText, Truck, RefreshCw, AlertCircle, Download, Eye, Filter, Search } from 'lucide-react'
import { Toaster, toast } from 'react-hot-toast'
import PODetailModal from '@/app/components/purchase-orders/PODetailModal'

interface PurchaseOrder {
  id: string
  orderNumber: string
  vendor: string
  vendor_email: string
  status: string
  total_amount: number
  created_at: string
  updated_at: string
  expected_date?: string
  items: any[]
  shipping_cost?: number
  tax_amount?: number
  notes?: string
}

export default function PurchaseOrdersPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [filteredPOs, setFilteredPOs] = useState<PurchaseOrder[]>([])
  const [dataSource, setDataSource] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [selectedPO, setSelectedPO] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    loadPurchaseOrders()
  }, [])

  useEffect(() => {
    filterPurchaseOrders()
  }, [purchaseOrders, filterStatus, searchTerm])

  const loadPurchaseOrders = async () => {
    try {
      const response = await fetch('/api/purchase-orders')
      const data = await response.json()
      
      if (response.ok) {
        setPurchaseOrders(data.purchaseOrders || [])
        setDataSource(data.source || 'unknown')
        if (data.error) {
          setError(data.error)
        }
      } else {
        throw new Error(data.error || 'Failed to load purchase orders')
      }
    } catch (error) {
      console.error('Error loading purchase orders:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load purchase orders'
      toast.error(errorMessage)
      setError(errorMessage)
      setPurchaseOrders([])
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadPurchaseOrders()
      toast.success('Purchase orders refreshed')
    } catch (error) {
      toast.error('Failed to refresh purchase orders')
    } finally {
      setRefreshing(false)
    }
  }

  // Sample PO data (removed, now using real data)
  const filterPurchaseOrders = () => {
    let filtered = [...purchaseOrders]
    
    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(po => po.status === filterStatus)
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(po => 
        po.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.vendor_email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    setFilteredPOs(filtered)
  }

  const createPurchaseOrder = async (type: 'critical' | 'out_of_stock' | 'reorder_point' | 'manual') => {
    setLoading(true)
    try {
      const response = await fetch('/api/purchase-orders/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        if (data.purchaseOrders.length > 0) {
          toast.success(`Generated ${data.purchaseOrders.length} purchase order(s)`)
          loadPurchaseOrders()
        } else {
          toast.info(data.message || 'No items need ordering at this time')
        }
      } else {
        toast.error(data.error || 'Failed to generate purchase orders')
      }
    } catch (error) {
      toast.error('Failed to generate purchase orders')
    } finally {
      setLoading(false)
    }
  }

  const handleViewPO = (poId: string) => {
    setSelectedPO(poId)
    setIsModalOpen(true)
  }

  const handleExportPO = async (poId: string, format: 'pdf' | 'csv' | 'json' = 'pdf') => {
    try {
      const response = await fetch(`/api/purchase-orders/${poId}/export?format=${format}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `PO-${poId}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast.success(`Purchase order exported as ${format.toUpperCase()}`)
      } else {
        toast.error('Failed to export purchase order')
      }
    } catch (error) {
      toast.error('Failed to export purchase order')
    }
  }

  const handleSendPO = async (poId: string) => {
    try {
      const response = await fetch(`/api/purchase-orders/${poId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        toast.success('Purchase order sent to vendor')
        loadPurchaseOrders()
      } else {
        toast.error('Failed to send purchase order')
      }
    } catch (error) {
      toast.error('Failed to send purchase order')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': 
        return 'bg-gray-100 text-gray-800'
      case 'sent': 
        return 'bg-blue-100 text-blue-800'
      case 'received': 
        return 'bg-green-100 text-green-800'
      case 'cancelled': 
        return 'bg-red-100 text-red-800'
      default: 
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <Toaster />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600 mt-1">
            Create, manage, and send purchase orders to vendors
            {dataSource && (
              <span className="text-sm text-gray-500 ml-2">
                (Source: {dataSource})
              </span>
            )}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <div className="relative">
            <button
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 group"
              disabled={loading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Generate PO
            </button>
            <div className="absolute right-0 mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 hidden group-hover:block z-10">
              <div className="py-1">
                <button
                  onClick={() => createPurchaseOrder('critical')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Critical Items (≤7 days)
                </button>
                <button
                  onClick={() => createPurchaseOrder('out_of_stock')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Out of Stock Items
                </button>
                <button
                  onClick={() => createPurchaseOrder('reorder_point')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Below Reorder Point
                </button>
                <button
                  onClick={() => createPurchaseOrder('manual')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Manual Selection
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <ShoppingCart className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total POs</p>
              <p className="text-2xl font-bold text-gray-900">{purchaseOrders.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-gray-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Draft</p>
              <p className="text-2xl font-bold text-gray-900">
                {purchaseOrders.filter(po => po.status === 'draft').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Send className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sent</p>
              <p className="text-2xl font-bold text-blue-600">
                {purchaseOrders.filter(po => po.status === 'sent').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Truck className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Received</p>
              <p className="text-2xl font-bold text-green-600">
                {purchaseOrders.filter(po => po.status === 'received').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="sent">Sent</option>
              <option value="partial">Partial</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="relative">
            <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search PO number, vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Showing {filteredPOs.length} of {purchaseOrders.length} orders
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{error}</p>
            {dataSource === 'sample-data' && (
              <p className="text-sm mt-1">
                To see real data, configure the Purchase Orders Report URL in the settings page.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PO ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mb-2" />
                      <p className="text-gray-500">Loading purchase orders...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <p className="text-lg font-medium">No purchase orders found</p>
                      <p className="mt-2">Create your first purchase order to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {po.orderNumber}
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{po.vendor}</div>
                      <div className="text-gray-500">{po.vendor_email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {po.items.length} items
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    ${po.total_amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(po.status)}`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(po.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button 
                      onClick={() => handleViewPO(po.id)}
                      className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </button>
                    {po.status === 'draft' && (
                      <button 
                        onClick={() => handleSendPO(po.id)}
                        className="text-green-600 hover:text-green-900 inline-flex items-center"
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Send
                      </button>
                    )}
                    <button 
                      onClick={() => handleExportPO(po.id, 'pdf')}
                      className="text-purple-600 hover:text-purple-900 inline-flex items-center"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </button>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* PO Detail Modal */}
      {selectedPO && (
        <PODetailModal
          poId={selectedPO}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedPO(null)
          }}
          onUpdate={loadPurchaseOrders}
        />
      )}
    </div>
  )
}