import { useState, useEffect, useMemo, useCallback } from 'react'
import { useDebounce } from './useDebounce'

export interface UseUniversalPageDataOptions<T> {
  endpoint: string
  dependencies?: any[]
  transform?: (data: any) => T[]
  enablePagination?: boolean
  defaultItemsPerPage?: number
  enableSearch?: boolean
  searchFields?: (keyof T)[]
  enableSorting?: boolean
  defaultSort?: { field: keyof T; direction: 'asc' | 'desc' }
  searchDebounceMs?: number
}

export interface UniversalPageDataReturn<T> {
  // Data states
  data: T[]
  loading: boolean
  refreshing: boolean
  error: string | null
  
  // Pagination
  currentPage: number
  totalPages: number
  itemsPerPage: number
  paginatedData: T[]
  totalCount: number
  startIndex: number
  endIndex: number
  
  // Search
  searchTerm: string
  debouncedSearchTerm: string
  filteredData: T[]
  isSearching: boolean
  
  // Sorting
  sortField: keyof T | null
  sortDirection: 'asc' | 'desc'
  sortedData: T[]
  
  // Actions
  refresh: () => Promise<void>
  setSearchTerm: (term: string) => void
  handleSort: (field: keyof T) => void
  setCurrentPage: (page: number) => void
  setItemsPerPage: (items: number) => void
  clearSearch: () => void
}

export function useUniversalPageData<T>({
  endpoint,
  dependencies = [],
  transform,
  enablePagination = true,
  defaultItemsPerPage = 50,
  enableSearch = true,
  searchFields = [],
  enableSorting = true,
  defaultSort,
  searchDebounceMs = 300
}: UseUniversalPageDataOptions<T>): UniversalPageDataReturn<T> {
  // Core data state
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const debouncedSearchTerm = useDebounce(searchTerm, searchDebounceMs)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage)
  
  // Sorting state
  const [sortField, setSortField] = useState<keyof T | null>(defaultSort?.field || null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSort?.direction || 'asc')

  // Data loading function
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const response = await fetch(endpoint)
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Transform data if transformer provided
      const processedData = transform ? transform(result) : (result.data || result)
      
      setData(Array.isArray(processedData) ? processedData : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [endpoint, transform])

  // Initial load and dependency changes
  useEffect(() => {
    loadData()
  }, [loadData, ...dependencies])

  // Refresh function
  const refresh = useCallback(() => loadData(true), [loadData])

  // Search filtering
  const filteredData = useMemo(() => {
    if (!enableSearch || !debouncedSearchTerm.trim()) {
      return data
    }

    const searchLower = debouncedSearchTerm.toLowerCase()
    
    return data.filter(item => {
      // If specific search fields provided, search only those
      if (searchFields.length > 0) {
        return searchFields.some(field => {
          const value = item[field]
          return value && String(value).toLowerCase().includes(searchLower)
        })
      }
      
      // Otherwise search all string fields
      return Object.values(item as any).some(value => 
        value && String(value).toLowerCase().includes(searchLower)
      )
    })
  }, [data, debouncedSearchTerm, enableSearch, searchFields])

  // Sorting
  const sortedData = useMemo(() => {
    if (!enableSorting || !sortField) {
      return filteredData
    }

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]
      
      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return sortDirection === 'asc' ? 1 : -1
      if (bValue == null) return sortDirection === 'asc' ? -1 : 1
      
      // Compare values
      let comparison = 0
      if (aValue < bValue) comparison = -1
      else if (aValue > bValue) comparison = 1
      
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredData, sortField, sortDirection, enableSorting])

  // Pagination calculations
  const totalCount = sortedData.length
  const totalPages = enablePagination ? Math.ceil(totalCount / itemsPerPage) : 1
  const startIndex = enablePagination ? (currentPage - 1) * itemsPerPage : 0
  const endIndex = enablePagination ? Math.min(startIndex + itemsPerPage, totalCount) : totalCount
  
  const paginatedData = enablePagination 
    ? sortedData.slice(startIndex, endIndex)
    : sortedData

  // Reset page when search or sort changes
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, sortField, sortDirection])

  // Update searching state when debounced term changes
  useEffect(() => {
    setIsSearching(false)
  }, [debouncedSearchTerm])

  // Handle search term changes
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term)
    setIsSearching(true)
  }, [])

  // Handle sorting
  const handleSort = useCallback((field: keyof T) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }, [sortField])

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchTerm('')
    setIsSearching(false)
  }, [])

  // Handle items per page change
  const handleItemsPerPageChange = useCallback((items: number) => {
    setItemsPerPage(items)
    setCurrentPage(1)
  }, [])

  return {
    // Data states
    data,
    loading,
    refreshing,
    error,
    
    // Pagination
    currentPage,
    totalPages,
    itemsPerPage,
    paginatedData,
    totalCount,
    startIndex,
    endIndex,
    
    // Search
    searchTerm,
    debouncedSearchTerm,
    filteredData,
    isSearching,
    
    // Sorting
    sortField,
    sortDirection,
    sortedData,
    
    // Actions
    refresh,
    setSearchTerm: handleSearchChange,
    handleSort,
    setCurrentPage,
    setItemsPerPage: handleItemsPerPageChange,
    clearSearch
  }
}
