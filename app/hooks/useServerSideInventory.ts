import { useState, useEffect, useCallback, useMemo } from 'react'
import { InventoryItem, InventoryFilters, PaginationOptions } from '@/app/types'
import { apiClient } from '@/app/lib/api-client'

interface UseServerSideInventoryOptions {
  initialPage?: number
  initialLimit?: number
  initialFilters?: InventoryFilters
  initialSort?: {
    key: keyof InventoryItem
    direction: 'asc' | 'desc'
  }
}

interface UseServerSideInventoryReturn {
  items: InventoryItem[]
  loading: boolean
  error: Error | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters: InventoryFilters
  sortConfig: {
    key: keyof InventoryItem
    direction: 'asc' | 'desc'
  }
  summary: any
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setFilters: (filters: InventoryFilters) => void
  setSortConfig: (config: { key: keyof InventoryItem; direction: 'asc' | 'desc' }) => void
  refresh: () => Promise<void>
  updateItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>
}

export function useServerSideInventory(
  options: UseServerSideInventoryOptions = {}
): UseServerSideInventoryReturn {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [summary, setSummary] = useState<any>(null)
  
  // Pagination state
  const [page, setPage] = useState(options.initialPage || 1)
  const [limit, setLimit] = useState(options.initialLimit || 50)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  
  // Filter state
  const [filters, setFilters] = useState<InventoryFilters>(
    options.initialFilters || {}
  )
  
  // Sort state
  const [sortConfig, setSortConfig] = useState({
    key: options.initialSort?.key || 'product_name' as keyof InventoryItem,
    direction: options.initialSort?.direction || 'asc' as 'asc' | 'desc'
  })
  
  // Fetch data from server
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: sortConfig.key,
        sortDirection: sortConfig.direction,
      })
      
      // Add filters to params
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status)
      }
      if (filters.vendor) {
        params.append('vendor', filters.vendor)
      }
      if (filters.location) {
        params.append('location', filters.location)
      }
      if (filters.search) {
        params.append('search', filters.search)
      }
      if (filters.minPrice !== undefined) {
        params.append('minPrice', filters.minPrice.toString())
      }
      if (filters.maxPrice !== undefined) {
        params.append('maxPrice', filters.maxPrice.toString())
      }
      if (filters.salesVelocity && filters.salesVelocity !== 'all') {
        params.append('salesVelocity', filters.salesVelocity)
      }
      if (filters.stockDays && filters.stockDays !== 'all') {
        params.append('stockDays', filters.stockDays)
      }
      
      // Fetch from API
      const response = await fetch(`/api/inventory?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch inventory')
      }
      
      const data = await response.json()
      
      setItems(data.inventory || [])
      setTotal(data.pagination?.total || 0)
      setTotalPages(data.pagination?.totalPages || 0)
      setSummary(data.summary || null)
      
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [page, limit, filters, sortConfig])
  
  // Fetch data when dependencies change
  useEffect(() => {
    fetchData()
  }, [fetchData])
  
  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [filters])
  
  // Update a single item (optimistic update)
  const updateItem = useCallback(async (id: string, updates: Partial<InventoryItem>) => {
    // Optimistically update the UI
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    )
    
    try {
      // Send update to server
      const response = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      if (!response.ok) {
        throw new Error('Failed to update item')
      }
      
      // Refresh data to ensure consistency
      await fetchData()
    } catch (err) {
      // Revert optimistic update on error
      await fetchData()
      throw err
    }
  }, [fetchData])
  
  const refresh = useCallback(async () => {
    await fetchData()
  }, [fetchData])
  
  return {
    items,
    loading,
    error,
    pagination: {
      page,
      limit,
      total,
      totalPages
    },
    filters,
    sortConfig,
    summary,
    setPage,
    setLimit,
    setFilters,
    setSortConfig,
    refresh,
    updateItem
  }
}

// Helper hook for managing filter presets
export function useInventoryFilterPresets() {
  const presets = useMemo(() => [
    {
      id: 'critical',
      name: 'Critical Stock',
      description: 'Items at or below reorder point',
      icon: 'AlertTriangle',
      color: 'red',
      filter: { status: 'critical' as const }
    },
    {
      id: 'out-of-stock',
      name: 'Out of Stock',
      description: 'Items with zero stock',
      icon: 'Package',
      color: 'gray',
      filter: { status: 'out-of-stock' as const }
    },
    {
      id: 'fast-moving',
      name: 'Fast Moving',
      description: 'High sales velocity items',
      icon: 'Zap',
      color: 'green',
      filter: { salesVelocity: 'fast' as const }
    },
    {
      id: 'overstocked',
      name: 'Overstocked',
      description: 'Items with excess inventory',
      icon: 'Archive',
      color: 'yellow',
      filter: { status: 'overstocked' as const }
    }
  ], [])
  
  return presets
}