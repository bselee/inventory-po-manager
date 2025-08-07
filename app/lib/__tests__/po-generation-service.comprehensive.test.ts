/**
 * Comprehensive Unit Tests for PO Generation Service
 * Validates EOQ calculations, reorder logic, and urgency determination
 */

import { POGenerationService } from '../po-generation-service'
import { supabase } from '../supabase'

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}))

describe('POGenerationService - Comprehensive Tests', () => {
  let service: POGenerationService

  beforeEach(() => {
    service = new POGenerationService()
    jest.clearAllMocks()
  })

  describe('EOQ Calculation Tests', () => {
    test('should calculate EOQ correctly with standard inputs', () => {
      // EOQ = sqrt((2 * D * S) / H)
      // D = 365 (1 unit per day), S = 50, H = 2.5 (25% of $10)
      // EOQ = sqrt((2 * 365 * 50) / 2.5) = sqrt(14600) = 120.83
      const eoq = service['calculateEOQ'](365, 50, 2.5)
      expect(eoq).toBe(121) // Rounded up
    })

    test('should handle zero annual demand', () => {
      const eoq = service['calculateEOQ'](0, 50, 2.5)
      expect(eoq).toBe(0)
    })

    test('should handle high volume items', () => {
      // D = 10000 units/year, S = 50, H = 5
      // EOQ = sqrt((2 * 10000 * 50) / 5) = sqrt(200000) = 447.21
      const eoq = service['calculateEOQ'](10000, 50, 5)
      expect(eoq).toBe(448)
    })

    test('should handle expensive items with high holding cost', () => {
      // D = 100 units/year, S = 50, H = 100 (expensive item)
      // EOQ = sqrt((2 * 100 * 50) / 100) = sqrt(100) = 10
      const eoq = service['calculateEOQ'](100, 50, 100)
      expect(eoq).toBe(10)
    })
  })

  describe('Suggested Quantity Calculation Tests', () => {
    test('should use reorder quantity when no sales velocity', () => {
      const item = {
        id: '1',
        sku: 'TEST-001',
        product_name: 'Test Product',
        current_stock: 10,
        reorder_point: 20,
        reorder_quantity: 50,
        unit_cost: 10,
        sales_velocity_30d: 0,
        sales_velocity_90d: 0
      }

      const qty = service['calculateSuggestedQuantity'](item)
      expect(qty).toBe(50) // Should use reorder_quantity
    })

    test('should calculate balanced quantity for normal velocity item', () => {
      const item = {
        id: '1',
        sku: 'TEST-002',
        product_name: 'Test Product',
        current_stock: 5,
        reorder_point: 30,
        reorder_quantity: 100,
        unit_cost: 20,
        sales_velocity_30d: 10, // 10 units per day
        sales_velocity_90d: 8,
        lead_time_days: 7
      }

      const qty = service['calculateSuggestedQuantity'](item)
      // Should consider EOQ, coverage, and safety stock
      expect(qty).toBeGreaterThan(100) // More than reorder quantity
      expect(qty).toBeLessThan(1000) // Reasonable upper limit
    })

    test('should round to nearest 10 for quantities > 100', () => {
      const item = {
        id: '1',
        sku: 'TEST-003',
        product_name: 'Test Product',
        current_stock: 20,
        reorder_point: 150,
        reorder_quantity: 200,
        unit_cost: 5,
        sales_velocity_30d: 5,
        sales_velocity_90d: 5,
        lead_time_days: 14
      }

      const qty = service['calculateSuggestedQuantity'](item)
      expect(qty % 10).toBe(0) // Should be rounded to nearest 10
    })

    test('should handle high velocity items with adequate safety stock', () => {
      const item = {
        id: '1',
        sku: 'FAST-001',
        product_name: 'Fast Moving Product',
        current_stock: 10,
        reorder_point: 500,
        reorder_quantity: 1000,
        unit_cost: 2,
        sales_velocity_30d: 100, // 100 units per day!
        sales_velocity_90d: 80,
        lead_time_days: 10
      }

      const qty = service['calculateSuggestedQuantity'](item)
      expect(qty).toBeGreaterThanOrEqual(1000) // Should order significant quantity
      // Should account for lead time buffer and safety stock
      expect(qty).toBeGreaterThan(item.sales_velocity_30d * item.lead_time_days)
    })

    test('should never return less than 1 unit', () => {
      const item = {
        id: '1',
        sku: 'MIN-001',
        product_name: 'Minimal Product',
        current_stock: 100,
        reorder_point: 5,
        reorder_quantity: 1,
        unit_cost: 1000,
        sales_velocity_30d: 0.01,
        sales_velocity_90d: 0.01
      }

      const qty = service['calculateSuggestedQuantity'](item)
      expect(qty).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Urgency Determination Tests', () => {
    test('should classify as critical when stockout <= 7 days', () => {
      expect(service['determineUrgency'](0)).toBe('critical')
      expect(service['determineUrgency'](3)).toBe('critical')
      expect(service['determineUrgency'](7)).toBe('critical')
    })

    test('should classify as high when stockout 8-14 days', () => {
      expect(service['determineUrgency'](8)).toBe('high')
      expect(service['determineUrgency'](10)).toBe('high')
      expect(service['determineUrgency'](14)).toBe('high')
    })

    test('should classify as medium when stockout 15-30 days', () => {
      expect(service['determineUrgency'](15)).toBe('medium')
      expect(service['determineUrgency'](25)).toBe('medium')
      expect(service['determineUrgency'](30)).toBe('medium')
    })

    test('should classify as low when stockout > 30 days', () => {
      expect(service['determineUrgency'](31)).toBe('low')
      expect(service['determineUrgency'](60)).toBe('low')
      expect(service['determineUrgency'](999)).toBe('low')
    })

    test('should handle undefined as critical', () => {
      expect(service['determineUrgency'](undefined)).toBe('critical')
    })
  })

  describe('Items Needing Reorder Tests', () => {
    test('should fetch items below reorder point', async () => {
      const mockItems = [
        {
          id: '1',
          sku: 'LOW-001',
          product_name: 'Low Stock Item',
          current_stock: 10,
          reorder_point: 20,
          reorder_quantity: 50,
          unit_cost: 15,
          sales_velocity_30d: 2,
          sales_velocity_90d: 1.5,
          vendor_id: 'vendor-1',
          active: true,
          discontinued: false
        }
      ]

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockItems, error: null })
      }

      ;(supabase.from as jest.Mock).mockReturnValue(mockFrom)

      const items = await service.getItemsNeedingReorder()
      
      expect(items).toHaveLength(1)
      expect(items[0].days_until_stockout).toBe(5) // 10 stock / 2 velocity = 5 days
      expect(supabase.from).toHaveBeenCalledWith('inventory_items')
    })

    test('should sort by urgency (days until stockout)', async () => {
      const mockItems = [
        {
          id: '1',
          sku: 'URGENT-001',
          current_stock: 5,
          reorder_point: 20,
          sales_velocity_30d: 5,
          active: true,
          discontinued: false
        },
        {
          id: '2',
          sku: 'MEDIUM-001',
          current_stock: 30,
          reorder_point: 20,
          sales_velocity_30d: 2,
          active: true,
          discontinued: false
        },
        {
          id: '3',
          sku: 'CRITICAL-001',
          current_stock: 2,
          reorder_point: 20,
          sales_velocity_30d: 10,
          active: true,
          discontinued: false
        }
      ]

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockItems, error: null })
      }

      ;(supabase.from as jest.Mock).mockReturnValue(mockFrom)

      const items = await service.getItemsNeedingReorder()
      
      // Should be sorted by days_until_stockout ascending
      expect(items[0].sku).toBe('CRITICAL-001') // 0 days
      expect(items[1].sku).toBe('URGENT-001') // 1 day
      expect(items[2].sku).toBe('MEDIUM-001') // 15 days
    })

    test('should handle items with no sales velocity', async () => {
      const mockItems = [
        {
          id: '1',
          sku: 'NOSALES-001',
          current_stock: 0,
          reorder_point: 10,
          sales_velocity_30d: 0,
          active: true,
          discontinued: false
        }
      ]

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockItems, error: null })
      }

      ;(supabase.from as jest.Mock).mockReturnValue(mockFrom)

      const items = await service.getItemsNeedingReorder()
      
      expect(items[0].days_until_stockout).toBe(0) // No stock, no sales = 0 days
    })
  })

  describe('PO Suggestion Generation Tests', () => {
    test('should group items by vendor', async () => {
      const mockItems = [
        {
          id: '1',
          sku: 'V1-001',
          product_name: 'Vendor 1 Item 1',
          vendor_id: 'vendor-1',
          current_stock: 5,
          reorder_point: 20,
          reorder_quantity: 50,
          unit_cost: 10,
          sales_velocity_30d: 2
        },
        {
          id: '2',
          sku: 'V1-002',
          product_name: 'Vendor 1 Item 2',
          vendor_id: 'vendor-1',
          current_stock: 10,
          reorder_point: 30,
          reorder_quantity: 100,
          unit_cost: 5,
          sales_velocity_30d: 5
        },
        {
          id: '3',
          sku: 'V2-001',
          product_name: 'Vendor 2 Item',
          vendor_id: 'vendor-2',
          current_stock: 0,
          reorder_point: 15,
          reorder_quantity: 30,
          unit_cost: 20,
          sales_velocity_30d: 3
        }
      ]

      const mockVendors = [
        { id: 'vendor-1', name: 'Vendor One', contact_email: 'vendor1@test.com', active: true },
        { id: 'vendor-2', name: 'Vendor Two', contact_email: 'vendor2@test.com', active: true }
      ]

      // Mock getItemsNeedingReorder
      jest.spyOn(service, 'getItemsNeedingReorder').mockResolvedValue(
        mockItems.map(item => ({
          ...item,
          vendor_name: '',
          lead_time_days: 7,
          days_until_stockout: Math.floor(item.current_stock / item.sales_velocity_30d)
        }))
      )

      // Mock vendor fetch
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockVendors, error: null })
      }
      ;(supabase.from as jest.Mock).mockReturnValue(mockFrom)

      const suggestions = await service.generatePOSuggestions()

      expect(suggestions).toHaveLength(2) // Two vendors
      expect(suggestions[0].vendor_name).toBe('Vendor Two') // More urgent (0 days)
      expect(suggestions[0].items).toHaveLength(1)
      expect(suggestions[0].urgency_level).toBe('critical')
      
      expect(suggestions[1].vendor_name).toBe('Vendor One')
      expect(suggestions[1].items).toHaveLength(2)
    })

    test('should calculate total amounts correctly', async () => {
      const mockItems = [
        {
          id: '1',
          sku: 'CALC-001',
          product_name: 'Calc Item',
          vendor_id: 'vendor-1',
          current_stock: 10,
          reorder_point: 20,
          reorder_quantity: 100,
          unit_cost: 10,
          sales_velocity_30d: 5,
          days_until_stockout: 2
        }
      ]

      jest.spyOn(service, 'getItemsNeedingReorder').mockResolvedValue(mockItems)
      jest.spyOn(service as any, 'calculateSuggestedQuantity').mockReturnValue(100)

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null })
      }
      ;(supabase.from as jest.Mock).mockReturnValue(mockFrom)

      const suggestions = await service.generatePOSuggestions()

      expect(suggestions[0].total_amount).toBe(1000) // 100 units * $10
      expect(suggestions[0].total_items).toBe(1)
    })

    test('should handle vendor name matching when no vendor_id', async () => {
      const mockItems = [
        {
          id: '1',
          sku: 'NOMATCH-001',
          product_name: 'No Match Item',
          vendor_id: null,
          vendor_name: 'Unknown Vendor',
          current_stock: 5,
          reorder_point: 20,
          reorder_quantity: 50,
          unit_cost: 15,
          sales_velocity_30d: 2,
          days_until_stockout: 2
        }
      ]

      jest.spyOn(service, 'getItemsNeedingReorder').mockResolvedValue(mockItems)

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null })
      }
      ;(supabase.from as jest.Mock).mockReturnValue(mockFrom)

      const suggestions = await service.generatePOSuggestions()

      expect(suggestions[0].vendor_name).toBe('Unknown Vendor')
      expect(suggestions[0].vendor_id).toBeUndefined()
    })
  })

  describe('Purchase Order Creation Tests', () => {
    test('should create PO with correct structure', async () => {
      const suggestion = {
        vendor_id: 'vendor-1',
        vendor_name: 'Test Vendor',
        vendor_email: 'test@vendor.com',
        items: [
          {
            sku: 'CREATE-001',
            product_name: 'Create Test Item',
            quantity: 100,
            unit_cost: 10,
            total_cost: 1000,
            current_stock: 5,
            reorder_point: 20,
            sales_velocity: 5,
            days_until_stockout: 1,
            urgency: 'critical' as const
          }
        ],
        total_amount: 1000,
        total_items: 1,
        urgency_level: 'critical' as const,
        estimated_stockout_days: 1
      }

      const mockPO = {
        id: 'po-1',
        po_number: 'PO-2024-123456',
        ...suggestion,
        status: 'draft',
        created_at: new Date().toISOString()
      }

      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPO, error: null })
      }
      ;(supabase.from as jest.Mock).mockReturnValue(mockFrom)

      const result = await service.createPurchaseOrder(suggestion, 'user-1')

      expect(result).toEqual(mockPO)
      expect(mockFrom.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          vendor_id: 'vendor-1',
          vendor_name: 'Test Vendor',
          status: 'draft',
          total_amount: 1000,
          urgency_level: 'critical',
          created_by: 'user-1'
        })
      )
    })

    test('should generate unique PO numbers', async () => {
      const suggestion = {
        vendor_id: 'vendor-1',
        vendor_name: 'Test Vendor',
        items: [],
        total_amount: 0,
        total_items: 0,
        urgency_level: 'low' as const,
        estimated_stockout_days: 100
      }

      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { po_number: 'PO-2024-123456' }, 
          error: null 
        })
      }
      ;(supabase.from as jest.Mock).mockReturnValue(mockFrom)

      await service.createPurchaseOrder(suggestion)

      const insertCall = mockFrom.insert.mock.calls[0][0]
      expect(insertCall.po_number).toMatch(/^PO-\d{4}-\d{6}$/)
    })
  })

  describe('Performance Tests', () => {
    test('should handle 100+ items efficiently', async () => {
      const mockItems = Array.from({ length: 150 }, (_, i) => ({
        id: `item-${i}`,
        sku: `PERF-${i.toString().padStart(3, '0')}`,
        product_name: `Performance Item ${i}`,
        vendor_id: `vendor-${i % 10}`, // 10 different vendors
        current_stock: Math.random() * 100,
        reorder_point: 50,
        reorder_quantity: 100,
        unit_cost: Math.random() * 50,
        sales_velocity_30d: Math.random() * 10,
        sales_velocity_90d: Math.random() * 8,
        days_until_stockout: Math.random() * 30
      }))

      const mockVendors = Array.from({ length: 10 }, (_, i) => ({
        id: `vendor-${i}`,
        name: `Vendor ${i}`,
        contact_email: `vendor${i}@test.com`,
        active: true
      }))

      jest.spyOn(service, 'getItemsNeedingReorder').mockResolvedValue(mockItems)

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockVendors, error: null })
      }
      ;(supabase.from as jest.Mock).mockReturnValue(mockFrom)

      const startTime = Date.now()
      const suggestions = await service.generatePOSuggestions()
      const endTime = Date.now()

      expect(suggestions.length).toBeLessThanOrEqual(10) // Max 10 vendors
      expect(endTime - startTime).toBeLessThan(1000) // Should complete in < 1 second
      
      // Verify all items are included
      const totalItems = suggestions.reduce((sum, s) => sum + s.items.length, 0)
      expect(totalItems).toBe(150)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ 
          data: null, 
          error: new Error('Database connection failed') 
        })
      }
      ;(supabase.from as jest.Mock).mockReturnValue(mockFrom)

      await expect(service.getItemsNeedingReorder()).rejects.toThrow('Database connection failed')
    })

    test('should return empty array when no items need reordering', async () => {
      jest.spyOn(service, 'getItemsNeedingReorder').mockResolvedValue([])

      const suggestions = await service.generatePOSuggestions()
      expect(suggestions).toEqual([])
    })

    test('should handle null/undefined vendor fields', async () => {
      const mockItems = [
        {
          id: '1',
          sku: 'NULL-001',
          product_name: 'Null Vendor Item',
          vendor_id: null,
          vendor_name: null,
          current_stock: 5,
          reorder_point: 20,
          reorder_quantity: 50,
          unit_cost: 10,
          sales_velocity_30d: 2,
          days_until_stockout: 2
        }
      ]

      jest.spyOn(service, 'getItemsNeedingReorder').mockResolvedValue(mockItems)

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null })
      }
      ;(supabase.from as jest.Mock).mockReturnValue(mockFrom)

      const suggestions = await service.generatePOSuggestions()
      
      expect(suggestions[0].vendor_name).toBe('unknown')
      expect(suggestions[0].vendor_id).toBeUndefined()
    })

    test('should handle negative stock values', () => {
      const item = {
        id: '1',
        sku: 'NEG-001',
        product_name: 'Negative Stock',
        current_stock: -10, // Negative stock
        reorder_point: 20,
        reorder_quantity: 50,
        unit_cost: 10,
        sales_velocity_30d: 5,
        sales_velocity_90d: 5
      }

      const qty = service['calculateSuggestedQuantity'](item)
      expect(qty).toBeGreaterThan(0) // Should still suggest positive quantity
    })
  })
})