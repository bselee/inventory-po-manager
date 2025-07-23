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
  // Calculated fields for planning
  sales_velocity?: number
  days_until_stockout?: number
  reorder_recommended?: boolean
  stock_status_level?: 'critical' | 'low' | 'adequate' | 'overstocked'
  trend?: 'increasing' | 'decreasing' | 'stable'
}

interface InventorySummary {
  total_items: number
  total_inventory_value: number
  out_of_stock_count: number
  low_stock_count: number
  critical_reorder_count?: number
  overstocked_count?: number
}

interface SortConfig {
  key: keyof InventoryItem
  direction: 'asc' | 'desc'
}

interface FilterConfig {
  status: 'all' | 'out-of-stock' | 'low-stock' | 'critical' | 'adequate' | 'overstocked'
  vendor: string
  location: string
  priceRange: { min: number; max: number }
  salesVelocity: 'all' | 'fast' | 'medium' | 'slow' | 'dead'
  stockDays: 'all' | '0-7' | '8-30' | '31-60' | '60+'
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [summary, setSummary] = useState<InventorySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'product_name', direction: 'asc' })
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    status: 'all',
    vendor: '',
    location: '',
    priceRange: { min: 0, max: 1000 },
    salesVelocity: 'all',
    stockDays: 'all'
  })
  const [viewMode, setViewMode] = useState<'table' | 'planning' | 'analytics'>('table')
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editStock, setEditStock] = useState(0)
  const [editCost, setEditCost] = useState(0)
  const [showCostEdit, setShowCostEdit] = useState(false)

  useEffect(() => {
    loadInventory()
    loadSummary()
  }, [])

  // Enhanced calculation functions for planning
  const calculateSalesVelocity = (item: InventoryItem): number => {
    const sales30 = item.sales_last_30_days || 0
    return sales30 / 30 // units per day
  }

  const calculateDaysUntilStockout = (item: InventoryItem): number => {
    const velocity = calculateSalesVelocity(item)
    if (velocity === 0) return Infinity
    return Math.floor(item.current_stock / velocity)
  }

  const determineStockStatus = (item: InventoryItem): 'critical' | 'low' | 'adequate' | 'overstocked' => {
    if (item.current_stock === 0) return 'critical'
    
    const velocity = calculateSalesVelocity(item)
    const daysLeft = calculateDaysUntilStockout(item)
    const minStock = item.minimum_stock || item.reorder_point || 0
    
    if (daysLeft <= 7) return 'critical'
    if (item.current_stock <= minStock || daysLeft <= 30) return 'low'
    if (item.maximum_stock && item.current_stock > item.maximum_stock * 0.8) return 'overstocked'
    return 'adequate'
  }

  const calculateTrend = (item: InventoryItem): 'increasing' | 'decreasing' | 'stable' => {
    const sales30 = item.sales_last_30_days || 0
    const sales90 = item.sales_last_90_days || 0
    const recent30DayAvg = sales30 / 30
    const previous60DayAvg = (sales90 - sales30) / 60
    
    const changeRatio = previous60DayAvg === 0 ? 0 : (recent30DayAvg - previous60DayAvg) / previous60DayAvg
    
    if (changeRatio > 0.1) return 'increasing'
    if (changeRatio < -0.1) return 'decreasing'
    return 'stable'
  }

  const enhanceItemsWithCalculations = (rawItems: InventoryItem[]): InventoryItem[] => {
    return rawItems.map(item => ({
      ...item,
      sales_velocity: calculateSalesVelocity(item),
      days_until_stockout: calculateDaysUntilStockout(item),
      stock_status_level: determineStockStatus(item),
      trend: calculateTrend(item),
      reorder_recommended: determineStockStatus(item) === 'critical' || 
                          (determineStockStatus(item) === 'low' && calculateDaysUntilStockout(item) <= 14)
    }))
  }

  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('product_name', { ascending: true })

      if (error) throw error
      const enhancedItems = enhanceItemsWithCalculations(data || [])
      setItems(enhancedItems)
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
    const status = item.stock_status_level || 'adequate'
    const statusMap = {
      critical: { text: 'Critical', color: 'red' },
      low: { text: 'Low Stock', color: 'yellow' },
      adequate: { text: 'In Stock', color: 'green' },
      overstocked: { text: 'Overstocked', color: 'blue' }
    }
    return statusMap[status] || statusMap.adequate
  }

  // Enhanced sorting function
  const handleSort = (key: keyof InventoryItem) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // Enhanced filtering function
  const getFilteredAndSortedItems = () => {
    let filtered = items.filter(item => {
      // Search filter
      const matchesSearch = 
        (item.product_name || item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.vendor && item.vendor.toLowerCase().includes(searchTerm.toLowerCase()))

      // Status filter
      const statusLevel = item.stock_status_level || 'adequate'
      const matchesStatus = 
        filterConfig.status === 'all' ||
        (filterConfig.status === 'out-of-stock' && item.current_stock === 0) ||
        (filterConfig.status === 'critical' && statusLevel === 'critical') ||
        (filterConfig.status === 'low-stock' && statusLevel === 'low') ||
        (filterConfig.status === 'adequate' && statusLevel === 'adequate') ||
        (filterConfig.status === 'overstocked' && statusLevel === 'overstocked')

      // Vendor filter
      const matchesVendor = !filterConfig.vendor || 
        (item.vendor && item.vendor.toLowerCase().includes(filterConfig.vendor.toLowerCase()))

      // Location filter
      const matchesLocation = !filterConfig.location || 
        (item.location && item.location.toLowerCase().includes(filterConfig.location.toLowerCase()))

      // Price range filter
      const price = item.unit_price || item.cost || 0
      const matchesPrice = price >= filterConfig.priceRange.min && price <= filterConfig.priceRange.max

      // Sales velocity filter
      const velocity = item.sales_velocity || 0
      const matchesVelocity = filterConfig.salesVelocity === 'all' ||
        (filterConfig.salesVelocity === 'fast' && velocity > 1) ||
        (filterConfig.salesVelocity === 'medium' && velocity > 0.1 && velocity <= 1) ||
        (filterConfig.salesVelocity === 'slow' && velocity > 0 && velocity <= 0.1) ||
        (filterConfig.salesVelocity === 'dead' && velocity === 0)

      return matchesSearch && matchesStatus && matchesVendor && matchesLocation && matchesPrice && matchesVelocity
    })

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key]
        let bValue = b[sortConfig.key]

        // Handle null/undefined values
        if (aValue == null) aValue = 0
        if (bValue == null) bValue = 0

        // Convert to numbers for numeric columns
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
        }

        // String comparison
        const aStr = String(aValue).toLowerCase()
        const bStr = String(bValue).toLowerCase()
        
        if (sortConfig.direction === 'asc') {
          return aStr < bStr ? -1 : aStr > bStr ? 1 : 0
        } else {
          return aStr > bStr ? -1 : aStr < bStr ? 1 : 0
        }
      })
    }

    return filtered
  }

  const filteredItems = getFilteredAndSortedItems()

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

      {/* Enhanced Filters & View Controls */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
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

          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-md p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('planning')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'planning' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Planning
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'analytics' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Analytics
            </button>
          </div>
        </div>

        {/* Advanced Filters Row */}
        <div className="flex flex-wrap gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-600" />
            <select
              value={filterConfig.status}
              onChange={(e) => setFilterConfig({...filterConfig, status: e.target.value as any})}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Filter by stock status"
            >
              <option value="all">All Stock Levels</option>
              <option value="critical">Critical (Out/Emergency)</option>
              <option value="low-stock">Low Stock</option>
              <option value="adequate">Adequate Stock</option>
              <option value="overstocked">Overstocked</option>
            </select>
          </div>

          <input
            type="text"
            placeholder="Filter by vendor"
            value={filterConfig.vendor}
            onChange={(e) => setFilterConfig({...filterConfig, vendor: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Filter by vendor"
          />

          <input
            type="text"
            placeholder="Filter by location"
            value={filterConfig.location}
            onChange={(e) => setFilterConfig({...filterConfig, location: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Filter by location"
          />

          <select
            value={filterConfig.salesVelocity}
            onChange={(e) => setFilterConfig({...filterConfig, salesVelocity: e.target.value as any})}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Filter by sales velocity"
          >
            <option value="all">All Velocities</option>
            <option value="fast">Fast Moving (&gt;1/day)</option>
            <option value="medium">Medium (0.1-1/day)</option>
            <option value="slow">Slow (&gt;0-0.1/day)</option>
            <option value="dead">Dead Stock (0/day)</option>
          </select>

          <button
            onClick={() => setFilterConfig({
              status: 'all',
              vendor: '',
              location: '',
              priceRange: { min: 0, max: 1000 },
              salesVelocity: 'all',
              stockDays: 'all'
            })}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Enhanced Inventory Table */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    { key: 'sku', label: 'SKU' },
                    { key: 'product_name', label: 'Product Name' },
                    { key: 'current_stock', label: 'Stock' },
                    { key: 'stock_status_level', label: 'Status' },
                    { key: 'sales_velocity', label: 'Velocity/Day' },
                    { key: 'days_until_stockout', label: 'Days Left' },
                    { key: 'location', label: 'Location' },
                    { key: 'vendor', label: 'Vendor' },
                    { key: 'unit_price', label: 'Cost' },
                    { key: 'sales_last_30_days', label: '30d Sales' },
                    { key: 'trend', label: 'Trend' },
                    { key: 'inventory_value', label: 'Value' },
                    { key: 'actions', label: 'Actions' }
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => key !== 'actions' && handleSort(key as keyof InventoryItem)}
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                        key !== 'actions' ? 'cursor-pointer hover:bg-gray-100' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {label}
                        {key !== 'actions' && sortConfig.key === key && (
                          <span className="text-blue-600">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => {
                  const status = getStockStatus(item)
                  const velocity = item.sales_velocity || 0
                  const daysLeft = item.days_until_stockout === Infinity ? '∞' : item.days_until_stockout
                  const trendIcon = {
                    increasing: '📈',
                    decreasing: '📉', 
                    stable: '➡️'
                  }[item.trend || 'stable']

                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.product_name || item.name}
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
                              aria-label="Edit stock quantity"
                            />
                            <button
                              onClick={() => handleStockUpdate(item.id)}
                              className="text-green-600 hover:text-green-800"
                              aria-label="Save stock update"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingItem(null)}
                              className="text-red-600 hover:text-red-800"
                              aria-label="Cancel stock edit"
                            >
                              ✗
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${
                              item.current_stock === 0 ? 'text-red-600' : 
                              (item.stock_status_level === 'low' || item.stock_status_level === 'critical') ? 'text-yellow-600' : 
                              'text-gray-900'
                            }`}>
                              {item.current_stock}
                            </span>
                            <button
                              onClick={() => startEditingStock(item)}
                              className="text-gray-400 hover:text-gray-600"
                              aria-label="Edit stock"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          status.color === 'red' ? 'bg-red-100 text-red-800' : ''
                        }${status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' : ''}${
                          status.color === 'green' ? 'bg-green-100 text-green-800' : ''
                        }${status.color === 'blue' ? 'bg-blue-100 text-blue-800' : ''}`}>
                          {status.text}
                        </span>
                        {item.reorder_recommended && (
                          <div className="mt-1">
                            <span className="inline-flex px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                              Reorder Now
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <span className={`font-medium ${
                            velocity > 1 ? 'text-green-600' : 
                            velocity > 0.1 ? 'text-yellow-600' : 
                            velocity > 0 ? 'text-orange-600' : 'text-red-600'
                          }`}>
                            {isNaN(velocity) || !isFinite(velocity) ? '0.00' : velocity.toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`font-medium ${
                          typeof daysLeft === 'number' && daysLeft <= 7 ? 'text-red-600' : 
                          typeof daysLeft === 'number' && daysLeft <= 30 ? 'text-yellow-600' : 
                          'text-gray-500'
                        }`}>
                          {daysLeft}
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
                              aria-label="Edit cost"
                            />
                            <button
                              onClick={() => handleCostUpdate(item.id)}
                              className="text-green-600 hover:text-green-800"
                              aria-label="Save cost update"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => {
                                setEditingItem(null)
                                setShowCostEdit(false)
                              }}
                              className="text-red-600 hover:text-red-800"
                              aria-label="Cancel cost edit"
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
                              aria-label="Edit cost"
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
                        <div className="flex items-center gap-1">
                          <span>{trendIcon}</span>
                          <span className="text-xs text-gray-400">{item.trend}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {(() => {
                          const stock = item.current_stock || 0
                          const price = item.unit_price || item.cost || 0
                          const value = stock * price
                          return isNaN(value) || !isFinite(value) ? '$0.00' : `$${value.toFixed(2)}`
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex gap-2">
                          {(item.current_stock === 0 || item.reorder_recommended) && (
                            <button className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 border border-blue-200 rounded">
                              Create PO
                            </button>
                          )}
                          {item.stock_status_level === 'overstocked' && (
                            <button className="text-purple-600 hover:text-purple-800 text-xs px-2 py-1 border border-purple-200 rounded">
                              Review
                            </button>
                          )}
                        </div>
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
      )}
      {/* Planning Dashboard */}
      {viewMode === 'planning' && (
        <div className="space-y-6">
          {/* Planning Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">Critical Action Needed</p>
                  <p className="text-2xl font-bold text-red-700">
                    {filteredItems.filter(item => item.stock_status_level === 'critical').length}
                  </p>
                  <p className="text-xs text-red-500">Out of stock or &lt;7 days</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Reorder Soon</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {filteredItems.filter(item => item.reorder_recommended).length}
                  </p>
                  <p className="text-xs text-yellow-500">Recommended reorders</p>
                </div>
                <TrendingDown className="h-8 w-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">30-Day Outlook</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {filteredItems.filter(item => {
                      const days = item.days_until_stockout
                      return typeof days === 'number' && days <= 30 && days > 7
                    }).length}
                  </p>
                  <p className="text-xs text-blue-500">Items may run out</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Overstocked</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {filteredItems.filter(item => item.stock_status_level === 'overstocked').length}
                  </p>
                  <p className="text-xs text-purple-500">Review for clearance</p>
                </div>
                <Package className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* 30/60/90 Day Planning Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              { days: 30, title: '30-Day Planning', color: 'red' },
              { days: 60, title: '60-Day Planning', color: 'yellow' },
              { days: 90, title: '90-Day Planning', color: 'blue' }
            ].map(({ days, title, color }) => {
              const planningItems = filteredItems.filter(item => {
                const daysLeft = item.days_until_stockout
                return typeof daysLeft === 'number' && daysLeft <= days && daysLeft > 0
              }).sort((a, b) => (a.days_until_stockout || 0) - (b.days_until_stockout || 0))

              return (
                <div key={days} className="bg-white rounded-lg shadow">
                  <div className={`px-4 py-3 border-b bg-${color}-50 border-${color}-200`}>
                    <h3 className={`font-semibold text-${color}-800`}>{title}</h3>
                    <p className={`text-sm text-${color}-600`}>
                      {planningItems.length} items need attention
                    </p>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {planningItems.length > 0 ? (
                      <div className="divide-y divide-gray-200">
                        {planningItems.slice(0, 10).map(item => {
                          const daysLeft = item.days_until_stockout
                          const urgency = typeof daysLeft === 'number' && daysLeft <= 7 ? 'urgent' : 
                                        typeof daysLeft === 'number' && daysLeft <= 14 ? 'warning' : 'normal'
                          
                          return (
                            <div key={item.id} className="p-3">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{item.product_name || item.name}</p>
                                  <p className="text-sm text-gray-500">{item.sku}</p>
                                  <div className="flex items-center gap-4 mt-1">
                                    <span className="text-sm">Stock: {item.current_stock}</span>
                                    <span className="text-sm">Velocity: {(item.sales_velocity || 0).toFixed(2)}/day</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    urgency === 'urgent' ? 'bg-red-100 text-red-800' :
                                    urgency === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {daysLeft} days
                                  </span>
                                  {item.reorder_recommended && (
                                    <div className="mt-1">
                                      <button className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                        Reorder
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        {planningItems.length > 10 && (
                          <div className="p-3 text-center text-sm text-gray-500">
                            +{planningItems.length - 10} more items
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p>No items expected to run out in {days} days</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Analytics Dashboard */}
      {viewMode === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Velocity Analysis */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Sales Velocity Distribution</h3>
              <div className="space-y-3">
                {[
                  { label: 'Fast Moving (&gt;1/day)', count: filteredItems.filter(i => (i.sales_velocity || 0) > 1).length, color: 'green' },
                  { label: 'Medium (0.1-1/day)', count: filteredItems.filter(i => (i.sales_velocity || 0) > 0.1 && (i.sales_velocity || 0) <= 1).length, color: 'yellow' },
                  { label: 'Slow (&gt;0-0.1/day)', count: filteredItems.filter(i => (i.sales_velocity || 0) > 0 && (i.sales_velocity || 0) <= 0.1).length, color: 'orange' },
                  { label: 'Dead Stock (0/day)', count: filteredItems.filter(i => (i.sales_velocity || 0) === 0).length, color: 'red' }
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{count}</span>
                      <div className={`h-3 w-16 bg-${color}-200 rounded-full`}>
                        <div className={`h-full bg-${color}-500 transition-all duration-300 rounded-full`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trend Analysis */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Demand Trends</h3>
              <div className="space-y-3">
                {[
                  { trend: 'increasing', label: 'Increasing Demand', icon: '📈', color: 'green' },
                  { trend: 'stable', label: 'Stable Demand', icon: '➡️', color: 'blue' },
                  { trend: 'decreasing', label: 'Decreasing Demand', icon: '📉', color: 'red' }
                ].map(({ trend, label, icon, color }) => {
                  const count = filteredItems.filter(i => i.trend === trend).length
                  return (
                    <div key={trend} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{icon}</span>
                        <span className="text-sm text-gray-600">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{count}</span>
                        <span className={`text-xs px-2 py-1 bg-${color}-100 text-${color}-800 rounded`}>
                          {((count / filteredItems.length) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Top Items by Category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Top Fast-Moving Items</h3>
              <div className="space-y-3">
                {filteredItems
                  .filter(item => (item.sales_velocity || 0) > 0)
                  .sort((a, b) => (b.sales_velocity || 0) - (a.sales_velocity || 0))
                  .slice(0, 5)
                  .map(item => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{item.product_name || item.name}</p>
                        <p className="text-sm text-gray-500">{item.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">{(item.sales_velocity || 0).toFixed(2)}/day</p>
                        <p className="text-sm text-gray-500">{item.sales_last_30_days || 0} sold</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Dead Stock Alert</h3>
              <div className="space-y-3">
                {filteredItems
                  .filter(item => (item.sales_velocity || 0) === 0 && item.current_stock > 0)
                  .sort((a, b) => (b.current_stock * (b.unit_price || b.cost || 0)) - (a.current_stock * (a.unit_price || a.cost || 0)))
                  .slice(0, 5)
                  .map(item => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{item.product_name || item.name}</p>
                        <p className="text-sm text-gray-500">{item.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-red-600">${(item.current_stock * (item.unit_price || item.cost || 0)).toFixed(2)}</p>
                        <p className="text-sm text-gray-500">{item.current_stock} units</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}


