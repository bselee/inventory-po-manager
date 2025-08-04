import { useState, useMemo, useCallback, useEffect } from 'react'
import { InventoryItem, TableFilterConfig, PresetFilter, ColumnConfig, SortConfig } from '@/app/types'

// Default filter configuration
export const DEFAULT_FILTER_CONFIG: TableFilterConfig = {
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
  showHidden: false
}

// Default columns configuration
export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'actions', label: 'Actions', visible: true, sortable: false, width: '100px', align: 'center' },
  { key: 'sku', label: 'SKU', visible: true, sortable: true, width: '120px' },
  { key: 'product_name', label: 'Product Name', visible: true, sortable: true, width: '250px' },
  { key: 'current_stock', label: 'Current Stock', visible: true, sortable: true, width: '110px', align: 'right' },
  { key: 'cost', label: 'Unit Cost', visible: true, sortable: true, width: '100px', align: 'right' },
  { key: 'vendor', label: 'Vendor', visible: true, sortable: true, width: '150px' },
  { key: 'location', label: 'Location', visible: true, sortable: true, width: '120px' },
  { key: 'minimum_stock', label: 'Min Stock', visible: false, sortable: true, width: '100px', align: 'right' },
  { key: 'maximum_stock', label: 'Max Stock', visible: false, sortable: true, width: '100px', align: 'right' },
  { key: 'reorder_quantity', label: 'Reorder Qty', visible: false, sortable: true, width: '110px', align: 'right' },
  { key: 'sales_velocity', label: 'Sales Velocity', visible: false, sortable: true, width: '130px', align: 'right' },
  { key: 'days_until_stockout', label: 'Days Until Stockout', visible: false, sortable: true, width: '150px', align: 'right' },
  { key: 'inventory_value', label: 'Inventory Value', visible: false, sortable: true, width: '130px', align: 'right' },
  { key: 'stock_status_level', label: 'Stock Status', visible: false, sortable: true, width: '120px' },
  { key: 'trend', label: 'Trend', visible: false, sortable: true, width: '100px' },
  { key: 'sales_last_30_days', label: 'Sales (30d)', visible: false, sortable: true, width: '100px', align: 'right' },
  { key: 'sales_last_90_days', label: 'Sales (90d)', visible: false, sortable: true, width: '100px', align: 'right' },
  { key: 'unit_price', label: 'Unit Price', visible: false, sortable: true, width: '100px', align: 'right' },
  { key: 'finale_id', label: 'Finale ID', visible: false, sortable: true, width: '100px' },
  { key: 'last_updated', label: 'Last Updated', visible: false, sortable: true, width: '130px' },
  { key: 'created_at', label: 'Created', visible: false, sortable: true, width: '130px' },
  { key: 'active', label: 'Active', visible: false, sortable: true, width: '80px' }
]

// Preset filters
export const PRESET_FILTERS: PresetFilter[] = [
  {
    id: 'out-of-stock',
    name: 'Out of Stock',
    color: 'red',
    config: { status: 'out_of_stock', reorderNeeded: false }
  },
  {
    id: 'reorder-needed',
    name: 'Reorder Needed',
    color: 'orange',
    config: { reorderNeeded: true }
  },
  {
    id: 'dead-stock',
    name: 'Dead Stock',
    color: 'gray',
    config: { salesVelocity: 'low', stockDays: 'low', hasValue: true }
  },
  {
    id: 'overstocked',
    name: 'Overstocked',
    color: 'purple',
    config: { stockDays: 'high', hasValue: true }
  },
  {
    id: 'fast-moving',
    name: 'Fast Moving',
    color: 'green',
    config: { status: 'in_stock', salesVelocity: 'high' }
  },
  {
    id: 'low-value',
    name: 'Low Value',
    color: 'blue',
    config: { minPrice: 0, maxPrice: 50 }
  },
  {
    id: 'critical-stock',
    name: 'Critical Stock',
    color: 'red',
    config: { status: 'low_stock', stockDays: 'critical' }
  },
  // BuildASoil-specific filters
  {
    id: 'buildasoil-products',
    name: 'BuildASoil Products',
    color: 'emerald',
    config: { showManufactured: true }
  },
  {
    id: 'supplier-materials',
    name: 'Supplier Materials',
    color: 'indigo',
    config: { showPurchased: true, reorderNeeded: true }
  },
  {
    id: 'high-value',
    name: 'High Value Items',
    color: 'yellow',
    config: { minPrice: 100, hasValue: true }
  }
]

export default function useInventoryTableManager(items: InventoryItem[]) {
  const [filterConfig, setFilterConfig] = useState<TableFilterConfig>(DEFAULT_FILTER_CONFIG)
  
  // Initialize columns from localStorage or default
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('inventory-column-preferences')
        if (saved) {
          const parsedColumns = JSON.parse(saved)
          // Validate that saved columns match expected structure
          const isValid = Array.isArray(parsedColumns) && 
            parsedColumns.every(col => 
              col && typeof col.key === 'string' && 
              typeof col.label === 'string' && 
              typeof col.visible === 'boolean'
            )
          if (isValid) {
            // Merge saved preferences with any new default columns
            const savedKeys = new Set(parsedColumns.map((col: ColumnConfig) => col.key))
            const newColumns = DEFAULT_COLUMNS.filter(col => !savedKeys.has(col.key))
            return [...parsedColumns, ...newColumns]
          }
        }
      } catch (error) {
        console.warn('Failed to load column preferences:', error)
      }
    }
    return DEFAULT_COLUMNS
  })
  
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'product_name', direction: 'asc' })
  const [activePresetFilter, setActivePresetFilter] = useState<string | null>(null)

  // Save column preferences to localStorage whenever columns change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('inventory-column-preferences', JSON.stringify(columns))
      } catch (error) {
        console.warn('Failed to save column preferences:', error)
      }
    }
  }, [columns])

  // BuildASoil manufacturing vendors
  const manufacturingVendors = [
    'BuildASoil Soil Production',
    'BuildASoil Manufacturing', 
    'BuildASoil Family Farms'
  ]

  // Helper function to determine if item is manufactured
  const isManufacturedItem = (item: InventoryItem): boolean => {
    if (!item.vendor) return false
    return manufacturingVendors.includes(item.vendor)
  }

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let filtered = items.filter(item => {
      // Hide items that are marked as hidden (unless showHidden is true)
      if (item.hidden && !filterConfig.showHidden) {
        return false
      }

      // Search filter
      if (filterConfig.search) {
        const searchTerm = filterConfig.search.toLowerCase()
        const searchFields = [
          item.sku?.toLowerCase(),
          item.product_name?.toLowerCase(),
          item.name?.toLowerCase(),
          item.vendor?.toLowerCase()
        ].filter(Boolean)
        
        if (!searchFields.some(field => field && field.includes(searchTerm))) {
          return false
        }
      }

      // Status filter
      if (filterConfig.status !== 'all') {
        const stock = item.current_stock || 0
        const minStock = item.minimum_stock || 0
        
        switch (filterConfig.status) {
          case 'out_of_stock':
            if (stock > 0) return false
            break
          case 'low_stock':
            if (stock <= 0 || stock > minStock) return false
            break
          case 'in_stock':
            if (stock <= minStock) return false
            break
        }
      }

      // Vendor filter
      if (filterConfig.vendor && item.vendor !== filterConfig.vendor) {
        return false
      }

      // Location filter
      if (filterConfig.location && item.location !== filterConfig.location) {
        return false
      }

      // Price range filter
      const cost = item.cost || 0
      if (cost < filterConfig.minPrice || cost > filterConfig.maxPrice) {
        return false
      }

      // Stock range filter
      const stock = item.current_stock || 0
      if (stock < filterConfig.minStock || stock > filterConfig.maxStock) {
        return false
      }

      // Reorder needed filter
      if (filterConfig.reorderNeeded && !item.reorder_recommended) {
        return false
      }

      // Has value filter
      if (filterConfig.hasValue && (!item.inventory_value || item.inventory_value <= 0)) {
        return false
      }

      // Manufactured/Purchased item filters
      if (!filterConfig.showManufactured && isManufacturedItem(item)) {
        return false
      }

      if (!filterConfig.showPurchased && !isManufacturedItem(item) && item.vendor) {
        return false
      }

      return true
    })

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof InventoryItem] || ''
        const bValue = b[sortConfig.key as keyof InventoryItem] || ''
        
        let comparison = 0
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue
        } else {
          comparison = String(aValue).localeCompare(String(bValue))
        }
        
        return sortConfig.direction === 'desc' ? -comparison : comparison
      })
    }

    return filtered
  }, [items, filterConfig, sortConfig])

  // Calculate unique values for filter dropdowns
  const uniqueVendors = useMemo(() => {
    const vendors = items.map(item => item.vendor).filter(Boolean) as string[]
    return [...new Set(vendors)].sort()
  }, [items])

  const uniqueLocations = useMemo(() => {
    const locations = items.map(item => item.location).filter(Boolean) as string[]
    return [...new Set(locations)].sort()
  }, [items])

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    
    PRESET_FILTERS.forEach(preset => {
      const presetFiltered = items.filter(item => {
        // Apply preset config
        if (preset.config.status && preset.config.status !== 'all') {
          const stock = item.current_stock || 0
          const minStock = item.minimum_stock || 0
          
          switch (preset.config.status) {
            case 'out_of_stock':
              if (stock > 0) return false
              break
            case 'low_stock':
              if (stock <= 0 || stock > minStock) return false
              break
            case 'in_stock':
              if (stock <= minStock) return false
              break
          }
        }
        
        // Sales velocity filter
        if (preset.config.salesVelocity && preset.config.salesVelocity !== 'all') {
          const velocity = item.sales_velocity || 0
          switch (preset.config.salesVelocity) {
            case 'high':
              if (velocity <= 1.0) return false
              break
            case 'medium':
              if (velocity <= 0.1 || velocity > 1.0) return false
              break
            case 'low':
              if (velocity <= 0 || velocity > 0.1) return false
              break
          }
        }
        
        // Stock days filter
        if (preset.config.stockDays && preset.config.stockDays !== 'all') {
          const stockDays = item.days_until_stockout || 0
          switch (preset.config.stockDays) {
            case 'critical':
              if (stockDays > 30) return false
              break
            case 'low':
              if (stockDays <= 30 || stockDays > 90) return false
              break
            case 'adequate':
              if (stockDays <= 90 || stockDays > 180) return false
              break
            case 'high':
              if (stockDays <= 180) return false
              break
          }
        }
        
        // Price range filter
        if (preset.config.minPrice !== undefined || preset.config.maxPrice !== undefined) {
          const price = item.unit_price || item.cost || 0
          if (preset.config.minPrice !== undefined && price < preset.config.minPrice) return false
          if (preset.config.maxPrice !== undefined && price > preset.config.maxPrice) return false
        }
        
        // Reorder needed filter
        if (preset.config.reorderNeeded && !item.reorder_recommended) {
          return false
        }
        
        // Has value filter
        if (preset.config.hasValue) {
          const value = (item.unit_price || item.cost || 0) * (item.current_stock || 0)
          if (value <= 0) return false
        }
        
        // Manufactured/Purchased filters
        if (preset.config.showManufactured && !preset.config.showPurchased) {
          if (!isManufacturedItem(item)) return false
        }
        
        if (preset.config.showPurchased && !preset.config.showManufactured) {
          if (isManufacturedItem(item) || !item.vendor) return false
        }
        
        return true
      })
      
      counts[preset.id] = presetFiltered.length
    })
    
    return counts
  }, [items])

  // Handlers
  const updateFilter = useCallback((updates: Partial<TableFilterConfig>) => {
    setFilterConfig(prev => ({ ...prev, ...updates }))
    setActivePresetFilter(null)
  }, [])

  const clearFilters = useCallback(() => {
    setFilterConfig(DEFAULT_FILTER_CONFIG)
    setActivePresetFilter(null)
  }, [])

  const applyPresetFilter = useCallback((presetId: string) => {
    const preset = PRESET_FILTERS.find(p => p.id === presetId)
    if (preset) {
      setFilterConfig(prev => ({ ...prev, ...preset.config }))
      setActivePresetFilter(presetId)
    }
  }, [])

  const handleSort = useCallback((key: keyof InventoryItem | 'actions') => {
    if (key === 'actions') return
    
    setSortConfig(prev => ({
      key: key as keyof InventoryItem,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }, [])

  const toggleColumn = useCallback((columnKey: keyof InventoryItem | 'actions') => {
    setColumns(prev => prev.map(col => 
      col.key === columnKey ? { ...col, visible: !col.visible } : col
    ))
  }, [])

  const reorderColumns = useCallback((dragIndex: number, hoverIndex: number) => {
    setColumns(prev => {
      const dragItem = prev[dragIndex]
      const newColumns = [...prev]
      newColumns.splice(dragIndex, 1)
      newColumns.splice(hoverIndex, 0, dragItem)
      return newColumns
    })
  }, [])

  const resetColumns = useCallback(() => {
    setColumns(DEFAULT_COLUMNS)
  }, [])

  return {
    filteredItems,
    totalItems: items.length,
    filteredCount: filteredItems.length,
    columns,
    visibleColumns: columns.filter(col => col.visible),
    toggleColumn,
    reorderColumns,
    resetColumns,
    filterConfig,
    updateFilter,
    clearFilters,
    activePresetFilter,
    applyPresetFilter,
    presetFilters: PRESET_FILTERS,
    filterCounts,
    uniqueVendors,
    uniqueLocations,
    sortConfig,
    handleSort
  }
}
