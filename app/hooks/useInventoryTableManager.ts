'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { InventoryItem } from '@/app/types'

// Column configuration types
export interface ColumnConfig {
  key: keyof InventoryItem | 'actions'
  label: string
  visible: boolean
  sortable: boolean
  width?: string
  type: 'text' | 'number' | 'currency' | 'date' | 'status' | 'component'
  format?: (value: any, item: InventoryItem) => string | React.ReactNode
}

// Filter configuration
export interface TableFilterConfig {
  search: string
  status: 'all' | 'out-of-stock' | 'low-stock' | 'critical' | 'adequate' | 'overstocked' | 'in-stock'
  vendor: string
  location: string
  minPrice: number
  maxPrice: number
  minStock: number
  maxStock: number
  salesVelocity: 'all' | 'fast' | 'medium' | 'slow' | 'dead'
  stockDays: 'all' | 'under-30' | '30-60' | '60-90' | 'over-90' | 'over-180'
  reorderNeeded: boolean
  hasValue: boolean
  showManufactured: boolean
  showPurchased: boolean
  activeStatus: 'all' | 'active' | 'inactive'
  showHidden: boolean
}

// Sorting configuration
export interface SortConfig {
  key: keyof InventoryItem
  direction: 'asc' | 'desc'
}

// Preset filter configurations
export interface PresetFilter {
  id: string
  name: string
  description: string
  icon: string
  color: string
  config: Partial<TableFilterConfig>
}

// Default column configurations
const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'sku', label: 'SKU', visible: true, sortable: true, type: 'text', width: '120px' },
  { key: 'product_name', label: 'Product Name', visible: true, sortable: true, type: 'text', width: '200px' },
  { key: 'current_stock', label: 'Stock', visible: true, sortable: true, type: 'number', width: '100px' },
  { key: 'stock_status_level', label: 'Status', visible: true, sortable: true, type: 'status', width: '120px' },
  { key: 'sales_velocity', label: 'Velocity/Day', visible: true, sortable: true, type: 'number', width: '120px' },
  { key: 'days_until_stockout', label: 'Days Left', visible: true, sortable: true, type: 'number', width: '100px' },
  { key: 'location', label: 'Location', visible: true, sortable: true, type: 'text', width: '120px' },
  { key: 'vendor', label: 'Vendor', visible: true, sortable: true, type: 'text', width: '150px' },
  { key: 'unit_price', label: 'Unit Price', visible: true, sortable: true, type: 'currency', width: '100px' },
  { key: 'cost', label: 'Cost', visible: false, sortable: true, type: 'currency', width: '100px' },
  { key: 'sales_last_30_days', label: '30d Sales', visible: true, sortable: true, type: 'number', width: '100px' },
  { key: 'sales_last_90_days', label: '90d Sales', visible: false, sortable: true, type: 'number', width: '100px' },
  { key: 'minimum_stock', label: 'Min Stock', visible: false, sortable: true, type: 'number', width: '100px' },
  { key: 'maximum_stock', label: 'Max Stock', visible: false, sortable: true, type: 'number', width: '100px' },
  { key: 'reorder_point', label: 'Reorder Point', visible: false, sortable: true, type: 'number', width: '120px' },
  { key: 'reorder_quantity', label: 'Reorder Qty', visible: false, sortable: true, type: 'number', width: '120px' },
  { key: 'last_updated', label: 'Last Updated', visible: false, sortable: true, type: 'date', width: '120px' },
  { key: 'trend', label: 'Trend', visible: true, sortable: true, type: 'text', width: '80px' },
  { key: 'actions', label: 'Actions', visible: true, sortable: false, type: 'component', width: '120px' }
]

// Default filter configuration
const DEFAULT_FILTER_CONFIG: TableFilterConfig = {
  search: '',
  status: 'all',
  vendor: '',
  location: '',
  minPrice: 0,
  maxPrice: 999999,
  minStock: 0,
  maxStock: 999999,
  salesVelocity: 'all',
  stockDays: 'all',
  reorderNeeded: false,
  hasValue: false,
  showManufactured: true,
  showPurchased: true,
  activeStatus: 'active',
  showHidden: false
}

// Preset filters
const PRESET_FILTERS: PresetFilter[] = [
  {
    id: 'out-of-stock',
    name: 'Out of Stock',
    description: 'Items with zero current stock',
    icon: '🚫',
    color: 'red',
    config: { status: 'out-of-stock' }
  },
  {
    id: 'critical',
    name: 'Critical Stock',
    description: 'Items critically low on stock',
    icon: '⚠️',
    color: 'orange',
    config: { status: 'critical' }
  },
  {
    id: 'reorder-needed',
    name: 'Reorder Needed',
    description: 'Items that need to be reordered',
    icon: '🔄',
    color: 'yellow',
    config: { reorderNeeded: true }
  },
  {
    id: 'fast-moving',
    name: 'Fast Moving',
    description: 'High velocity items (>1 per day)',
    icon: '⚡',
    color: 'green',
    config: { salesVelocity: 'fast' }
  },
  {
    id: 'dead-stock',
    name: 'Dead Stock',
    description: 'Items with no recent sales',
    icon: '💀',
    color: 'gray',
    config: { salesVelocity: 'dead' }
  },
  {
    id: 'overstocked',
    name: 'Overstocked',
    description: 'Items with excessive inventory',
    icon: '📦',
    color: 'purple',
    config: { status: 'overstocked' }
  },
  {
    id: 'high-value',
    name: 'High Value',
    description: 'Items with high unit price (>$100)',
    icon: '💰',
    color: 'blue',
    config: { minPrice: 100 }
  },
  {
    id: 'manufactured',
    name: 'Manufactured',
    description: 'BuildASoil manufactured items',
    icon: '🏭',
    color: 'indigo',
    config: { showPurchased: false, showManufactured: true }
  }
]

/**
 * Comprehensive inventory table management hook
 * Handles filtering, sorting, column management, and data processing
 */
export function useInventoryTableManager(items: InventoryItem[]) {
  // Column management
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('inventory-columns')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error('Error loading saved columns:', e)
        }
      }
    }
    return DEFAULT_COLUMNS
  })

  // Filter management
  const [filterConfig, setFilterConfig] = useState<TableFilterConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('inventory-filters')
      if (saved) {
        try {
          return { ...DEFAULT_FILTER_CONFIG, ...JSON.parse(saved) }
        } catch (e) {
          console.error('Error loading saved filters:', e)
        }
      }
    }
    return DEFAULT_FILTER_CONFIG
  })

  // Sort management
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'product_name', direction: 'asc' })

  // Active preset filter
  const [activePresetFilter, setActivePresetFilter] = useState<string | null>(null)

  // Save configurations to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('inventory-columns', JSON.stringify(columns))
    }
  }, [columns])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('inventory-filters', JSON.stringify(filterConfig))
    }
  }, [filterConfig])

  // Get visible columns
  const visibleColumns = useMemo(() => {
    return columns.filter(col => col.visible)
  }, [columns])

  // Apply filters to items
  const filteredItems = useMemo(() => {
    let filtered = [...items]

    // Search filter
    if (filterConfig.search) {
      const searchLower = filterConfig.search.toLowerCase().trim()
      filtered = filtered.filter(item => 
        (item.product_name || item.name || '').toLowerCase().includes(searchLower) ||
        item.sku.toLowerCase().includes(searchLower) ||
        (item.vendor || '').toLowerCase().includes(searchLower) ||
        (item.location || '').toLowerCase().includes(searchLower)
      )
    }

    // Status filter
    if (filterConfig.status !== 'all') {
      filtered = filtered.filter(item => {
        switch (filterConfig.status) {
          case 'out-of-stock':
            return (item.current_stock || 0) === 0
          case 'low-stock':
            return (item.current_stock || 0) > 0 && (item.current_stock || 0) <= (item.reorder_point || item.minimum_stock || 0)
          case 'critical':
            return item.stock_status_level === 'critical'
          case 'adequate':
            return item.stock_status_level === 'adequate'
          case 'overstocked':
            return item.stock_status_level === 'overstocked'
          case 'in-stock':
            return (item.current_stock || 0) > 0
          default:
            return true
        }
      })
    }

    // Vendor filter
    if (filterConfig.vendor) {
      const vendorLower = filterConfig.vendor.toLowerCase()
      filtered = filtered.filter(item => 
        (item.vendor || '').toLowerCase().includes(vendorLower)
      )
    }

    // Location filter
    if (filterConfig.location) {
      const locationLower = filterConfig.location.toLowerCase()
      filtered = filtered.filter(item => 
        (item.location || '').toLowerCase().includes(locationLower)
      )
    }

    // Price range filter
    if (filterConfig.minPrice > 0 || filterConfig.maxPrice < 999999) {
      filtered = filtered.filter(item => {
        const price = item.unit_price || item.cost || 0
        return price >= filterConfig.minPrice && price <= filterConfig.maxPrice
      })
    }

    // Stock range filter
    if (filterConfig.minStock > 0 || filterConfig.maxStock < 999999) {
      filtered = filtered.filter(item => {
        const stock = item.current_stock || 0
        return stock >= filterConfig.minStock && stock <= filterConfig.maxStock
      })
    }

    // Sales velocity filter
    if (filterConfig.salesVelocity !== 'all') {
      filtered = filtered.filter(item => {
        const velocity = item.sales_velocity || 0
        switch (filterConfig.salesVelocity) {
          case 'fast':
            return velocity > 1
          case 'medium':
            return velocity > 0.1 && velocity <= 1
          case 'slow':
            return velocity > 0 && velocity <= 0.1
          case 'dead':
            return velocity === 0
          default:
            return true
        }
      })
    }

    // Stock days filter
    if (filterConfig.stockDays !== 'all') {
      filtered = filtered.filter(item => {
        const days = item.days_until_stockout
        if (days === undefined || days === null || days === Infinity) return false
        
        switch (filterConfig.stockDays) {
          case 'under-30':
            return days > 0 && days <= 30
          case '30-60':
            return days > 30 && days <= 60
          case '60-90':
            return days > 60 && days <= 90
          case 'over-90':
            return days > 90
          case 'over-180':
            return days > 180
          default:
            return true
        }
      })
    }

    // Reorder needed filter
    if (filterConfig.reorderNeeded) {
      filtered = filtered.filter(item => item.reorder_recommended === true)
    }

    // Has value filter
    if (filterConfig.hasValue) {
      filtered = filtered.filter(item => (item.unit_price || item.cost || 0) > 0)
    }

    // Manufacturing source filter
    const manufacturingVendors = [
      'BuildASoil Soil Production',
      'BuildASoil Manufacturing', 
      'BuildASoil Family Farms'
    ]

    if (!filterConfig.showManufactured || !filterConfig.showPurchased) {
      filtered = filtered.filter(item => {
        const isManufactured = manufacturingVendors.some(vendor => 
          (item.vendor || '').toLowerCase().includes(vendor.toLowerCase())
        )
        
        if (!filterConfig.showManufactured && isManufactured) return false
        if (!filterConfig.showPurchased && !isManufactured) return false
        return true
      })
    }

    // Active status filter
    if (filterConfig.activeStatus !== 'all') {
      filtered = filtered.filter(item => {
        // Default to active if the field doesn't exist yet
        const isActive = item.active !== undefined ? item.active : true
        
        switch (filterConfig.activeStatus) {
          case 'active':
            return isActive === true
          case 'inactive':
            return isActive === false
          default:
            return true
        }
      })
    }

    // Hidden items filter
    if (!filterConfig.showHidden) {
      filtered = filtered.filter(item => {
        // Only show items that are not hidden (default to not hidden if field doesn't exist)
        return item.hidden !== true
      })
    }

    return filtered
  }, [items, filterConfig])

  // Apply sorting
  const sortedItems = useMemo(() => {
    if (!sortConfig.key) return filteredItems

    return [...filteredItems].sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1
      if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1

      // Type-specific sorting
      let comparison = 0
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue)
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison
    })
  }, [filteredItems, sortConfig])

  // Column management functions
  const toggleColumn = useCallback((columnKey: keyof InventoryItem | 'actions') => {
    setColumns(prev => prev.map(col => 
      col.key === columnKey 
        ? { ...col, visible: !col.visible }
        : col
    ))
  }, [])

  const reorderColumns = useCallback((startIndex: number, endIndex: number) => {
    setColumns(prev => {
      const result = [...prev]
      const [removed] = result.splice(startIndex, 1)
      result.splice(endIndex, 0, removed)
      return result
    })
  }, [])

  const resetColumns = useCallback(() => {
    setColumns(DEFAULT_COLUMNS)
  }, [])

  // Filter management functions
  const updateFilter = useCallback((updates: Partial<TableFilterConfig>) => {
    setFilterConfig(prev => ({ ...prev, ...updates }))
    setActivePresetFilter(null) // Clear preset when manually filtering
  }, [])

  const applyPresetFilter = useCallback((presetId: string) => {
    const preset = PRESET_FILTERS.find(p => p.id === presetId)
    if (preset) {
      setFilterConfig(prev => ({ ...prev, ...preset.config }))
      setActivePresetFilter(presetId)
    }
  }, [])

  const clearFilters = useCallback(() => {
    setFilterConfig(DEFAULT_FILTER_CONFIG)
    setActivePresetFilter(null)
  }, [])

  // Sort management functions
  const handleSort = useCallback((key: keyof InventoryItem) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }, [])

  // Calculate filter counts for preset buttons
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    
    PRESET_FILTERS.forEach(preset => {
      const tempConfig = { ...DEFAULT_FILTER_CONFIG, ...preset.config }
      
      // Count items that match this preset
      let count = items.filter(item => {
        // Apply the same filtering logic but with preset config
        if (tempConfig.status !== 'all') {
          switch (tempConfig.status) {
            case 'out-of-stock':
              if ((item.current_stock || 0) !== 0) return false
              break
            case 'critical':
              if (item.stock_status_level !== 'critical') return false
              break
            case 'overstocked':
              if (item.stock_status_level !== 'overstocked') return false
              break
          }
        }

        if (tempConfig.reorderNeeded && !item.reorder_recommended) return false

        if (tempConfig.salesVelocity !== 'all') {
          const velocity = item.sales_velocity || 0
          switch (tempConfig.salesVelocity) {
            case 'fast':
              if (velocity <= 1) return false
              break
            case 'dead':
              if (velocity !== 0) return false
              break
          }
        }

        if (tempConfig.minPrice > 0) {
          const price = item.unit_price || item.cost || 0
          if (price < tempConfig.minPrice) return false
        }

        // Manufacturing filter
        const manufacturingVendors = [
          'BuildASoil Soil Production',
          'BuildASoil Manufacturing', 
          'BuildASoil Family Farms'
        ]
        const isManufactured = manufacturingVendors.some(vendor => 
          (item.vendor || '').toLowerCase().includes(vendor.toLowerCase())
        )
        
        if (tempConfig.showPurchased === false && !isManufactured) return false
        if (tempConfig.showManufactured === false && isManufactured) return false

        return true
      }).length

      counts[preset.id] = count
    })

    return counts
  }, [items])

  // Get unique values for filter dropdowns
  const uniqueVendors = useMemo(() => {
    const vendors = new Set(
      items
        .map(item => item.vendor)
        .filter((vendor): vendor is string => vendor !== undefined && vendor !== null && vendor !== '')
    )
    return Array.from(vendors).sort()
  }, [items])

  const uniqueLocations = useMemo(() => {
    const locations = new Set(
      items
        .map(item => item.location)
        .filter((location): location is string => location !== undefined && location !== null && location !== '')
    )
    return Array.from(locations).sort()
  }, [items])

  return {
    // Data
    filteredItems: sortedItems,
    totalItems: items.length,
    filteredCount: filteredItems.length,
    
    // Columns
    columns,
    visibleColumns,
    toggleColumn,
    reorderColumns,
    resetColumns,
    
    // Filters
    filterConfig,
    updateFilter,
    clearFilters,
    activePresetFilter,
    applyPresetFilter,
    presetFilters: PRESET_FILTERS,
    filterCounts,
    uniqueVendors,
    uniqueLocations,
    
    // Sorting
    sortConfig,
    handleSort
  }
}

export default useInventoryTableManager
