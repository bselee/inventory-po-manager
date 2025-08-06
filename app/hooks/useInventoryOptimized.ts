/**
 * Optimized inventory hook with server-side pagination
 * Improves performance by fetching only needed data
 */

import { useState, useEffect, useCallback, useRef } from 'react'
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
import { trackMetric } from '@/app/lib/monitoring'

interface UseInventoryResult {
  items: InventoryItem[]
  summary: InventorySummary | null
  loading: boolean
  error: Error | null
  
  // Pagination
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
  
  // Filters
  filters: InventoryFilters
  setFilters: (filters: InventoryFilters) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  
  // Sorting
  sortConfig: SortConfig
  setSortConfig: (config: SortConfig) => void
  
  // Actions
  goToPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  setItemsPerPage: (count: number) => void
  refresh: () => Promise<void>
  updateStock: (itemId: string, newStock: number) => Promise<InventoryItem>
  updateCost: (itemId: string, newCost: number) => Promise<InventoryItem>
}

/**
 * Optimized inventory hook with server-side pagination
 */
export function useInventoryOptimized(
  initialFilters: InventoryFilters = {},
  initialSort: SortConfig = { key: 'sku', direction: 'asc' }
): UseInventoryResult {
  // Core state
  const [items, setItems] = useState<InventoryItem[]>([])
  const [summary, setSummary] = useState<InventorySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage, setItemsPerPageState] = useState(50) // Default to 50 for better performance
  
  // Filter and sort state
  const [filters, setFilters] = useState<InventoryFilters>(initialFilters)
  const [sortConfig, setSortConfig] = useState<SortConfig>(initialSort)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Debounce timer for search
  const searchDebounceRef = useRef<NodeJS.Timeout>()
  
  // Track last fetch params to avoid duplicate requests
  const lastFetchParams = useRef<string>('')

  /**
   * Load inventory with server-side pagination
   */
  const loadInventory = useCallback(async (
    page: number = currentPage,
    forceRefresh: boolean = false
  ) => {
    // Create a unique key for the current request params
    const fetchKey = JSON.stringify({
      page,
      itemsPerPage,
      filters,
      searchTerm,
      sortConfig
    })
    
    // Skip if same request and not forcing refresh
    if (!forceRefresh && fetchKey === lastFetchParams.current) {
      return
    }
    
    lastFetchParams.current = fetchKey
    
    const startTime = Date.now()
    setLoading(true)
    setError(null)
    
    try {
      const result = await getInventoryItems(
        {
          ...filters,
          search: searchTerm
        },
        {
          page,
          limit: itemsPerPage,
          sortBy: sortConfig.key,
          sortDirection: sortConfig.direction
        }
      )
      
      setItems(result.items)
      setCurrentPage(result.page)
      setTotalPages(result.totalPages)
      setTotalItems(result.total)
      
      // Track performance metrics
      const loadTime = Date.now() - startTime
      trackMetric('inventory.load_time', loadTime)
      trackMetric('inventory.items_loaded', result.items.length)
      
    } catch (err) {
      logError('Error loading inventory:', err)
      setError(err as Error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, itemsPerPage, filters, searchTerm, sortConfig])

  /**
   * Load summary data
   */
  const loadSummary = useCallback(async () => {
    try {
      const summaryData = await getInventorySummary()
      setSummary(summaryData)
    } catch (err) {
      logError('Error loading summary:', err)
    }
  }, [])

  /**
   * Debounced search handler
   */
  const debouncedSearch = useCallback((term: string) => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }
    
    searchDebounceRef.current = setTimeout(() => {
      setSearchTerm(term)
      setCurrentPage(1) // Reset to first page on search
    }, 300) // 300ms debounce
  }, [])

  /**
   * Initial load and reload on param changes
   */
  useEffect(() => {
    loadInventory(currentPage)
  }, [currentPage, itemsPerPage, filters, searchTerm, sortConfig])

  /**
   * Load summary on mount
   */
  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  /**
   * Reset to page 1 when filters change
   */
  useEffect(() => {
    setCurrentPage(1)
  }, [filters, searchTerm, sortConfig])

  /**
   * Navigation helpers
   */
  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages))
    if (validPage !== currentPage) {
      setCurrentPage(validPage)
    }
  }, [currentPage, totalPages])

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1)
    }
  }, [currentPage, totalPages])

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }, [currentPage])

  /**
   * Update items per page
   */
  const updateItemsPerPage = useCallback((count: number) => {
    const validCount = Math.max(10, Math.min(count, 500))
    setItemsPerPageState(validCount)
    setCurrentPage(1) // Reset to first page
  }, [])

  /**
   * Refresh data
   */
  const refresh = useCallback(async () => {
    lastFetchParams.current = '' // Clear cache to force refresh
    await Promise.all([
      loadInventory(currentPage, true),
      loadSummary()
    ])
  }, [currentPage, loadInventory, loadSummary])

  /**
   * Update stock
   */
  const updateStock = useCallback(async (itemId: string, newStock: number) => {
    const updatedItem = await updateInventoryStock(itemId, newStock)
    
    // Update local state optimistically
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, current_stock: newStock } : item
    ))
    
    // Refresh summary
    await loadSummary()
    
    return updatedItem
  }, [loadSummary])

  /**
   * Update cost
   */
  const updateCost = useCallback(async (itemId: string, newCost: number) => {
    const updatedItem = await updateInventoryCost(itemId, newCost)
    
    // Update local state optimistically
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, unit_cost: newCost, unit_price: newCost } : item
    ))
    
    // Refresh summary
    await loadSummary()
    
    return updatedItem
  }, [loadSummary])

  return {
    // Data
    items,
    summary,
    loading,
    error,
    
    // Pagination
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    
    // Filters
    filters,
    setFilters,
    searchTerm,
    setSearchTerm: debouncedSearch,
    
    // Sorting
    sortConfig,
    setSortConfig,
    
    // Actions
    goToPage,
    nextPage,
    prevPage,
    setItemsPerPage: updateItemsPerPage,
    refresh,
    updateStock,
    updateCost
  }
}

/**
 * Hook for prefetching next page
 */
export function usePrefetchInventory(
  currentPage: number,
  totalPages: number,
  filters: InventoryFilters,
  sortConfig: SortConfig,
  itemsPerPage: number
) {
  const [prefetchedData, setPrefetchedData] = useState<Map<number, InventoryItem[]>>(new Map())
  
  useEffect(() => {
    // Prefetch next page if not at the end
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1
      
      // Check if already prefetched
      if (!prefetchedData.has(nextPage)) {
        getInventoryItems(filters, {
          page: nextPage,
          limit: itemsPerPage,
          sortBy: sortConfig.key,
          sortDirection: sortConfig.direction
        }).then(result => {
          setPrefetchedData(prev => new Map(prev).set(nextPage, result.items))
        }).catch(err => {
          logError('Prefetch failed:', err)
        })
      }
    }
    
    // Clean up old prefetched data (keep only adjacent pages)
    setPrefetchedData(prev => {
      const newMap = new Map<number, InventoryItem[]>()
      for (const [page, data] of prev) {
        if (Math.abs(page - currentPage) <= 1) {
          newMap.set(page, data)
        }
      }
      return newMap
    })
  }, [currentPage, totalPages, filters, sortConfig, itemsPerPage])
  
  return prefetchedData
}

/**
 * Hook for infinite scroll
 */
export function useInfiniteInventory(
  filters: InventoryFilters = {},
  sortConfig: SortConfig = { key: 'sku', direction: 'asc' }
) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const itemsPerPage = 50
  
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    
    setLoading(true)
    
    try {
      const result = await getInventoryItems(filters, {
        page,
        limit: itemsPerPage,
        sortBy: sortConfig.key,
        sortDirection: sortConfig.direction
      })
      
      if (result.items.length === 0) {
        setHasMore(false)
      } else {
        setItems(prev => [...prev, ...result.items])
        setPage(prev => prev + 1)
        setHasMore(page < result.totalPages)
      }
    } catch (error) {
      logError('Error loading more items:', error)
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [page, filters, sortConfig, loading, hasMore])
  
  // Reset on filter change
  useEffect(() => {
    setItems([])
    setPage(1)
    setHasMore(true)
  }, [filters, sortConfig])
  
  // Initial load
  useEffect(() => {
    if (items.length === 0 && hasMore) {
      loadMore()
    }
  }, [])
  
  return {
    items,
    hasMore,
    loading,
    loadMore
  }
}