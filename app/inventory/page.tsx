'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Package, AlertTriangle, TrendingDown, Search, Filter, RefreshCw, Plus, Edit2, Loader2 } from 'lucide-react'

interface InventoryItem {
  id: string
  sku: string
  product_name?: string
  name?: string
  current_stock: number
  location?: string
  minimum_stock: number
  maximum_stock?: number
  reorder_point?: number
  reorder_quantity?: number
  vendor?: string
  cost?: number
  unit_price?: number
  sales_last_30_days?: number
  sales_last_90_days?: number
  last_sales_update?: string
  last_updated: string
}

interface InventorySummary {
  total_items: number
  total_inventory_value: number
  out_of_stock_count: number
  low_stock_count: number
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [summary, setSummary] = useState<InventorySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'out-of-stock' | 'low-stock'>('all')
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editStock, setEditStock] = useState(0)
  const [editCost, setEditCost] = useState(0)
  const [showCostEdit, setShowCostEdit] = useState(false)

  useEffect(() => {
    loadInventory()
    loadSummary()
  }, [])

  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('product_name', { ascending: true })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error loading inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSummary = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_summary')
        .select('*')
        .single()

      if (error) throw error
      setSummary(data)
    } catch (error) {
      console.error('Error loading summary:', error)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([loadInventory(), loadSummary()])
    setRefreshing(false)
  }

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock === 0) {
      return { text: 'Out of Stock', color: 'red' }
    } else if (item.current_stock <= (item.minimum_stock || item.reorder_point || 0)) {
      return { text: 'Low Stock', color: 'yellow' }
    }
    return { text: 'In Stock', color: 'green' }
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      (item.product_name || item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.vendor && item.vendor.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'out-of-stock' && item.current_stock === 0) ||
      (filterStatus === 'low-stock' && item.current_stock > 0 && item.current_stock <= (item.minimum_stock || item.reorder_point || 0))

    return matchesSearch && matchesFilter
  })

  const startEditingStock = (item: InventoryItem) => {
    setEditingItem(item.id)
    setEditStock(item.current_stock)
  }

  const startEditingCost = (item: InventoryItem) => {
    setEditingItem(item.id)
    setEditCost(item.unit_price || item.cost || 0)
    setShowCostEdit(true)
  }

  const handleStockUpdate = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ 
          current_stock: editStock,
          last_updated: new Date().toISOString()
        })
        .eq('id', itemId)

      if (error) throw error

      // Update local state
      setItems(items.map(item =>
        item.id === itemId
          ? { ...item, current_stock: editStock, last_updated: new Date().toISOString() }
          : item
      ))
      setEditingItem(null)
      loadSummary() // Refresh summary
    } catch (error) {
      console.error('Error updating stock:', error)
    }
  }

  const handleCostUpdate = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ 
          unit_price: editCost,
          last_updated: new Date().toISOString()
        })
        .eq('id', itemId)

      if (error) throw error

      // Update local state
      setItems(items.map(item => 
        item.id === itemId 
          ? { ...item, unit_price: editCost, cost: editCost, last_updated: new Date().toISOString() }
          : item
      ))
      setEditingItem(null)
      setShowCostEdit(false)
      loadSummary() // Refresh summary
    } catch (error) {
      console.error('Error updating stock:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold">{summary.total_items}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{summary.out_of_stock_count}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.low_stock_count}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-bold">${summary.total_inventory_value.toFixed(2)}</p>
              </div>
              <Package className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, SKU, or vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-600" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Items</option>
              <option value="out-of-stock">Out of Stock</option>
              <option value="low-stock">Low Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  30d Sales
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  90d Sales
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => {
                const status = getStockStatus(item)
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.product_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editingItem === item.id && !showCostEdit ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editStock}
                            onChange={(e) => setEditStock(parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded"
                            autoFocus
                          />
                          <button
                            onClick={() => handleStockUpdate(item.id)}
                            className="text-green-600 hover:text-green-800"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingItem(null)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {item.current_stock}
                          <button
                            onClick={() => startEditingStock(item)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full
                        ${status.color === 'red' ? 'bg-red-100 text-red-800' : ''}
                        ${status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${status.color === 'green' ? 'bg-green-100 text-green-800' : ''}
                      `}>
                        {status.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.location || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.vendor || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingItem === item.id && showCostEdit ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editCost}
                            onChange={(e) => setEditCost(parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded"
                            step="0.01"
                            autoFocus
                          />
                          <button
                            onClick={() => handleCostUpdate(item.id)}
                            className="text-green-600 hover:text-green-800"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => {
                              setEditingItem(null)
                              setShowCostEdit(false)
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          ${(item.unit_price || item.cost || 0).toFixed(2)}
                          <button
                            onClick={() => startEditingCost(item)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.sales_last_30_days || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.sales_last_90_days || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      ${(item.current_stock * (item.unit_price || item.cost || 0)).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.current_stock === 0 && (
                        <button className="text-blue-600 hover:text-blue-800">
                          Create PO
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No items found matching your criteria
            </div>
          )}
        </div>
      </div>
    </div>
  )
}