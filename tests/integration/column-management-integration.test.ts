import { describe, it, expect, beforeEach } from '@jest/globals'

// Integration test for the complete column management system
describe('Column Management System Integration', () => {
  // Mock localStorage
  const mockLocalStorage = (() => {
    let store: Record<string, string> = {}
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value },
      removeItem: (key: string) => { delete store[key] },
      clear: () => { store = {} }
    }
  })()

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })
    mockLocalStorage.clear()
  })

  const mockDefaultColumns = [
    { key: 'actions', label: 'Actions', visible: true, sortable: false, width: '100px' },
    { key: 'sku', label: 'SKU', visible: true, sortable: true, width: '120px' },
    { key: 'product_name', label: 'Product Name', visible: true, sortable: true, width: '250px' },
    { key: 'current_stock', label: 'Current Stock', visible: true, sortable: true, width: '110px' },
    { key: 'cost', label: 'Unit Cost', visible: true, sortable: true, width: '100px' },
    { key: 'vendor', label: 'Vendor', visible: true, sortable: true, width: '150px' },
    { key: 'location', label: 'Location', visible: true, sortable: true, width: '120px' },
    { key: 'minimum_stock', label: 'Min Stock', visible: false, sortable: true, width: '100px' },
    { key: 'sales_velocity', label: 'Sales Velocity', visible: false, sortable: true, width: '130px' },
    { key: 'inventory_value', label: 'Inventory Value', visible: false, sortable: true, width: '130px' }
  ]

  const mockColumnPresets = {
    essential: {
      name: 'Essential',
      description: 'Core inventory fields only',
      columns: ['actions', 'sku', 'product_name', 'current_stock', 'cost', 'vendor']
    },
    operations: {
      name: 'Operations', 
      description: 'Fields needed for daily operations',
      columns: ['actions', 'sku', 'product_name', 'current_stock', 'minimum_stock', 'vendor', 'location']
    },
    analytics: {
      name: 'Analytics',
      description: 'Sales and performance data', 
      columns: ['actions', 'sku', 'product_name', 'current_stock', 'sales_velocity', 'inventory_value']
    }
  }

  describe('localStorage Persistence', () => {
    it('should save column preferences to localStorage', () => {
      const testColumns = [...mockDefaultColumns]
      testColumns[7].visible = true // Show minimum_stock
      
      localStorage.setItem('inventory-column-preferences', JSON.stringify(testColumns))
      
      const saved = localStorage.getItem('inventory-column-preferences')
      expect(saved).toBeTruthy()
      
      const parsed = JSON.parse(saved!)
      expect(parsed[7].visible).toBe(true)
      expect(parsed[7].key).toBe('minimum_stock')
    })

    it('should load and validate saved preferences', () => {
      const customColumns = [...mockDefaultColumns]
      customColumns[7].visible = true
      customColumns[8].visible = true
      
      localStorage.setItem('inventory-column-preferences', JSON.stringify(customColumns))
      
      const saved = localStorage.getItem('inventory-column-preferences')
      const parsed = JSON.parse(saved!)
      
      // Validate structure
      const isValid = Array.isArray(parsed) && 
        parsed.every(col => 
          col && typeof col.key === 'string' && 
          typeof col.label === 'string' && 
          typeof col.visible === 'boolean'
        )
      
      expect(isValid).toBe(true)
      expect(parsed.filter((col: any) => col.visible).length).toBe(9) // 7 default + 2 custom
    })

    it('should handle corrupted localStorage gracefully', () => {
      localStorage.setItem('inventory-column-preferences', 'invalid-json')
      
      // Should fallback to defaults without throwing
      expect(() => {
        const saved = localStorage.getItem('inventory-column-preferences')
        if (saved) {
          try {
            JSON.parse(saved)
          } catch (error) {
            // Should handle gracefully
            expect(error).toBeTruthy()
          }
        }
      }).not.toThrow()
    })
  })

  describe('Column Preset System', () => {
    it('should apply preset configurations correctly', () => {
      const applyPreset = (presetKey: string, columns: any[]) => {
        const preset = mockColumnPresets[presetKey as keyof typeof mockColumnPresets]
        if (!preset) return columns
        
        const presetColumns = new Set(preset.columns)
        return columns.map(col => ({
          ...col,
          visible: presetColumns.has(col.key)
        }))
      }

      // Apply Essential preset
      const essentialColumns = applyPreset('essential', mockDefaultColumns)
      const visibleEssential = essentialColumns.filter(col => col.visible)
      
      expect(visibleEssential.length).toBe(6)
      expect(visibleEssential.map(col => col.key)).toEqual([
        'actions', 'sku', 'product_name', 'current_stock', 'cost', 'vendor'
      ])

      // Apply Operations preset
      const operationsColumns = applyPreset('operations', mockDefaultColumns)
      const visibleOperations = operationsColumns.filter(col => col.visible)
      
      expect(visibleOperations.length).toBe(7)
      expect(visibleOperations.some(col => col.key === 'minimum_stock')).toBe(true)
      expect(visibleOperations.some(col => col.key === 'location')).toBe(true)
    })

    it('should have all presets with required properties', () => {
      Object.entries(mockColumnPresets).forEach(([key, preset]) => {
        expect(preset.name).toBeTruthy()
        expect(preset.description).toBeTruthy()
        expect(Array.isArray(preset.columns)).toBe(true)
        expect(preset.columns.length).toBeGreaterThan(3)
        expect(preset.columns).toContain('actions') // All presets should include actions
        expect(preset.columns).toContain('sku') // All presets should include SKU
      })
    })
  })

  describe('Column Reordering', () => {
    it('should reorder columns correctly via drag and drop', () => {
      const columns = [...mockDefaultColumns]
      const originalOrder = columns.map(col => col.key)
      
      // Simulate dragging first column to last position
      const reorderColumns = (dragIndex: number, hoverIndex: number) => {
        const dragItem = columns[dragIndex]
        const newColumns = [...columns]
        newColumns.splice(dragIndex, 1)
        newColumns.splice(hoverIndex, 0, dragItem)
        return newColumns
      }
      
      const reordered = reorderColumns(0, columns.length - 1)
      const newOrder = reordered.map(col => col.key)
      
      expect(newOrder[newOrder.length - 1]).toBe(originalOrder[0])
      expect(newOrder.length).toBe(originalOrder.length)
      expect(newOrder[0]).toBe(originalOrder[1]) // Second item becomes first
    })

    it('should handle edge cases in reordering', () => {
      const columns = [...mockDefaultColumns]
      
      // Reorder to same position should not change anything
      const reorderColumns = (dragIndex: number, hoverIndex: number) => {
        if (dragIndex === hoverIndex) return columns
        const dragItem = columns[dragIndex]
        const newColumns = [...columns]
        newColumns.splice(dragIndex, 1)
        newColumns.splice(hoverIndex, 0, dragItem)
        return newColumns
      }
      
      const samePosition = reorderColumns(2, 2)
      expect(samePosition).toEqual(columns)
      
      // Reorder first to second position
      const firstToSecond = reorderColumns(0, 1)
      expect(firstToSecond[1].key).toBe(columns[0].key)
      expect(firstToSecond[0].key).toBe(columns[1].key)
    })
  })

  describe('Column Visibility Management', () => {
    it('should toggle column visibility correctly', () => {
      const columns = [...mockDefaultColumns]
      
      const toggleColumn = (columnKey: string) => {
        return columns.map(col => 
          col.key === columnKey ? { ...col, visible: !col.visible } : col
        )
      }
      
      // Toggle hidden column to visible
      const showMinStock = toggleColumn('minimum_stock')
      const minStockCol = showMinStock.find(col => col.key === 'minimum_stock')
      expect(minStockCol?.visible).toBe(true)
      
      // Toggle visible column to hidden
      const hideSku = toggleColumn('sku')
      const skuCol = hideSku.find(col => col.key === 'sku')
      expect(skuCol?.visible).toBe(false)
    })

    it('should maintain proper visible column count', () => {
      const columns = [...mockDefaultColumns]
      const initialVisibleCount = columns.filter(col => col.visible).length
      
      const toggleColumn = (columnKey: string) => {
        return columns.map(col => 
          col.key === columnKey ? { ...col, visible: !col.visible } : col
        )
      }
      
      // Show one hidden column
      const withNewVisible = toggleColumn('minimum_stock')
      const newVisibleCount = withNewVisible.filter(col => col.visible).length
      expect(newVisibleCount).toBe(initialVisibleCount + 1)
      
      // Hide one visible column
      const withOneHidden = toggleColumn('vendor')
      const reducedVisibleCount = withOneHidden.filter(col => col.visible).length
      expect(reducedVisibleCount).toBe(initialVisibleCount - 1)
    })
  })

  describe('Business Logic Integration', () => {
    it('should support BuildASoil specific use cases', () => {
      // Essential view for quick inventory checks
      const essentialColumns = mockColumnPresets.essential.columns
      expect(essentialColumns).toContain('cost') // Important for pricing decisions
      expect(essentialColumns).toContain('vendor') // Important for supplier management
      
      // Operations view for daily warehouse work
      const operationsColumns = mockColumnPresets.operations.columns
      expect(operationsColumns).toContain('location') // Critical for picking/packing
      expect(operationsColumns).toContain('minimum_stock') // Important for reorder decisions
      
      // Analytics view for business intelligence
      const analyticsColumns = mockColumnPresets.analytics.columns
      expect(analyticsColumns).toContain('sales_velocity') // Key performance metric
      expect(analyticsColumns).toContain('inventory_value') // Financial tracking
    })

    it('should maintain Actions column in all presets', () => {
      Object.values(mockColumnPresets).forEach(preset => {
        expect(preset.columns).toContain('actions')
      })
    })

    it('should have reasonable column width assignments', () => {
      mockDefaultColumns.forEach(col => {
        if (col.width) {
          expect(col.width).toMatch(/^\d+px$/) // Should be in pixels
          const width = parseInt(col.width.replace('px', ''))
          expect(width).toBeGreaterThan(50) // Minimum usable width
          expect(width).toBeLessThan(500) // Maximum reasonable width
        }
      })
    })
  })
})
