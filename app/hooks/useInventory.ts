/**
 * Custom hooks for inventory management
 * Extracts complex state logic from components
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  getInventoryItems, 
  getInventorySummary,
  updateInventoryStock,
  updateInventoryCost
} from '@/app/lib/data-access'
import {
  InventoryItem,
  InventorySummary,
  InventoryFilters,
  SortConfig
} from '@/app/types'

/**
 * Main inventory data hook
 * Handles loading, filtering, sorting, and pagination
 */
export function useInventory(
  initialFilters: InventoryFilters = {},
  initialSort: SortConfig = { key: 'product_name', direction: 'asc' }
) {
  // Core state
  const [allItems, setAllItems] = useState<InventoryItem[]>([])
  const [displayedItems, setDisplayedItems] = useState<InventoryItem[]>([])
  const [summary, setSummary] = useState<InventorySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Filter and sort state
  const [filters, setFilters] = useState<InventoryFilters>(initialFilters)
  const [sortConfig, setSortConfig] = useState<SortConfig>(initialSort)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(100)

  // Load inventory data
  const loadInventory = useCallback(async () => {
    try {
      const result = await getInventoryItems({}, { limit: 5000 })
      setAllItems(result.items)
      return result.items
    } catch (error) {
      console.error('Error loading inventory:', error)
      return []
    }
  }, [])

  // Load summary data
  const loadSummary = useCallback(async () => {
    try {
      const summaryData = await getInventorySummary()
      setSummary(summaryData)
    } catch (error) {
      console.error('Error loading summary:', error)
    }
  }, [])

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([loadInventory(), loadSummary()])
      setLoading(false)
    }
    load()
  }, [loadInventory, loadSummary])

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = allItems.filter(item => {
      // Search filter
      const matchesSearch = !searchTerm || 
        item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.vendor?.toLowerCase().includes(searchTerm.toLowerCase())

      // Status filter
      const statusLevel = item.stock_status_level || 'adequate'
      const matchesStatus = !filters.status || filters.status === 'all' ||
        (filters.status === 'out-of-stock' && item.current_stock === 0) ||
        (filters.status === 'critical' && statusLevel === 'critical') ||
        (filters.status === 'low-stock' && statusLevel === 'low') ||
        (filters.status === 'adequate' && statusLevel === 'adequate') ||
        (filters.status === 'overstocked' && statusLevel === 'overstocked') ||
        (filters.status === 'in-stock' && item.current_stock > 0)

      // Other filters
      const matchesVendor = !filters.vendor || 
        item.vendor?.toLowerCase().includes(filters.vendor.toLowerCase())
      
      const matchesLocation = !filters.location || 
        item.location?.toLowerCase().includes(filters.location.toLowerCase())

      // Price range filter
      const price = item.unit_price || item.cost || 0
      const matchesPrice = !filters.priceRange || 
        (price >= filters.priceRange.min && price <= filters.priceRange.max)

      // Sales velocity filter
      const velocity = item.sales_velocity || 0
      const matchesVelocity = !filters.salesVelocity || filters.salesVelocity === 'all' ||
        (filters.salesVelocity === 'fast' && velocity > 1) ||
        (filters.salesVelocity === 'medium' && velocity > 0.1 && velocity <= 1) ||
        (filters.salesVelocity === 'slow' && velocity > 0 && velocity <= 0.1) ||
        (filters.salesVelocity === 'dead' && velocity === 0)

      // Stock days filter
      const stockDays = item.days_until_stockout || 0
      const matchesStockDays = !filters.stockDays || filters.stockDays === 'all' ||
        (filters.stockDays === 'under-30' && stockDays > 0 && stockDays <= 30) ||
        (filters.stockDays === '30-60' && stockDays > 30 && stockDays <= 60) ||
        (filters.stockDays === '60-90' && stockDays > 60 && stockDays <= 90) ||
        (filters.stockDays === 'over-90' && stockDays > 90) ||
        (filters.stockDays === 'over-180' && stockDays > 180)

      // Boolean filters
      const matchesReorder = !filters.reorderNeeded || item.reorder_recommended === true
      const hasValue = (item.unit_price || item.cost || 0) > 0
      const matchesHasValue = !filters.hasValue || hasValue

      return matchesSearch && matchesStatus && matchesVendor && matchesLocation && 
             matchesPrice && matchesVelocity && matchesStockDays && 
             matchesReorder && matchesHasValue
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
  }, [allItems, searchTerm, filters, sortConfig])

  // Update displayed items based on pagination
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    setDisplayedItems(filteredAndSortedItems.slice(startIndex, endIndex))
  }, [filteredAndSortedItems, currentPage, itemsPerPage])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filters])

  // Refresh data
  const refresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([loadInventory(), loadSummary()])
    setRefreshing(false)
  }, [loadInventory, loadSummary])

  // Update stock
  const updateStock = useCallback(async (itemId: string, newStock: number) => {
    const updatedItem = await updateInventoryStock(itemId, newStock)
    
    // Update local state
    setAllItems(prev => prev.map(item => 
      item.id === itemId ? updatedItem : item
    ))
    
    // Refresh summary
    await loadSummary()
    
    return updatedItem
  }, [loadSummary])

  // Update cost
  const updateCost = useCallback(async (itemId: string, newCost: number) => {
    const updatedItem = await updateInventoryCost(itemId, newCost)
    
    // Update local state
    setAllItems(prev => prev.map(item => 
      item.id === itemId ? updatedItem : item
    ))
    
    // Refresh summary
    await loadSummary()
    
    return updatedItem
  }, [loadSummary])

  // Pagination helpers
  const totalItems = filteredAndSortedItems.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }, [totalPages])

  return {
    // Data
    items: displayedItems,
    allItems: filteredAndSortedItems,
    summary,
    loading,
    refreshing,
    
    // Filters and search
    filters,
    setFilters,
    searchTerm,
    setSearchTerm,
    
    // Sorting
    sortConfig,
    setSortConfig,
    
    // Pagination
    currentPage,
    itemsPerPage,
    setItemsPerPage,
    totalItems,
    totalPages,
    goToPage,
    
    // Actions
    refresh,
    updateStock,
    updateCost
  }
}

/**
 * Hook for managing inventory item editing state
 */
export function useInventoryEdit() {
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editStock, setEditStock] = useState(0)
  const [editCost, setEditCost] = useState(0)
  const [showCostEdit, setShowCostEdit] = useState(false)

  const startEditingStock = useCallback((item: InventoryItem) => {
    setEditingItem(item.id)
    setEditStock(item.current_stock)
    setShowCostEdit(false)
  }, [])

  const startEditingCost = useCallback((item: InventoryItem) => {
    setEditingItem(item.id)
    setEditCost(item.unit_price || item.cost || 0)
    setShowCostEdit(true)
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingItem(null)
    setShowCostEdit(false)
  }, [])

  return {
    editingItem,
    editStock,
    setEditStock,
    editCost,
    setEditCost,
    showCostEdit,
    startEditingStock,
    startEditingCost,
    cancelEdit
  }
}

/**
 * Hook for managing view mode
 */
export function useViewMode(initialMode: 'table' | 'planning' | 'analytics' = 'table') {
  const [viewMode, setViewMode] = useState(initialMode)
  
  return { viewMode, setViewMode }
}

/**
 * Hook for managing preset filters
 */
export function usePresetFilters(
  presetFilters: any[],
  onFilterChange: (filters: InventoryFilters) => void
) {
  const [activePresetFilter, setActivePresetFilter] = useState<string | null>(null)

  const applyPresetFilter = useCallback((presetId: string) => {
    const preset = presetFilters.find(p => p.id === presetId)
    if (preset) {
      onFilterChange(preset.config)
      setActivePresetFilter(presetId)
    }
  }, [presetFilters, onFilterChange])

  const clearPresetFilter = useCallback(() => {
    setActivePresetFilter(null)
  }, [])

  return {
    activePresetFilter,
    applyPresetFilter,
    clearPresetFilter
  }
}