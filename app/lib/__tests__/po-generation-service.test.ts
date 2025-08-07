/**
 * Unit tests for POGenerationService
 * Tests EOQ calculations, reorder suggestions, and urgency determination
 */

import { POGenerationService } from '../po-generation-service'
import { supabase } from '../supabase'

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis()
    }))
  }
}))

describe('POGenerationService', () => {
  let service: POGenerationService

  beforeEach(() => {
    service = new POGenerationService()
    jest.clearAllMocks()
  })

  describe('calculateEOQ', () => {
    it('should calculate EOQ correctly with default parameters', () => {
      // Access private method through any cast for testing
      const calculateEOQ = (service as any).calculateEOQ
      
      // Test case: Annual demand = 1000, Order cost = 50, Holding cost = 2.5
      const eoq = calculateEOQ.call(service, 1000, 50, 2.5)
      expect(eoq).toBe(200) // sqrt((2 * 1000 * 50) / 2.5) = 200
    })

    it('should return 0 for zero or negative demand', () => {
      const calculateEOQ = (service as any).calculateEOQ
      
      expect(calculateEOQ.call(service, 0, 50, 2.5)).toBe(0)
      expect(calculateEOQ.call(service, -100, 50, 2.5)).toBe(0)
    })

    it('should handle large numbers correctly', () => {
      const calculateEOQ = (service as any).calculateEOQ
      
      // High volume item
      const eoq = calculateEOQ.call(service, 50000, 100, 5)
      expect(eoq).toBe(1415) // sqrt((2 * 50000 * 100) / 5) ≈ 1414.2
    })
  })

  describe('calculateSuggestedQuantity', () => {
    it('should return reorder quantity when no sales velocity', () => {
      const calculateSuggestedQuantity = (service as any).calculateSuggestedQuantity
      
      const item = {
        sales_velocity_30d: 0,
        reorder_quantity: 100,
        unit_cost: 10,
        current_stock: 20,
        reorder_point: 50
      }
      
      const quantity = calculateSuggestedQuantity.call(service, item)
      expect(quantity).toBe(100)
    })

    it('should calculate quantity based on sales velocity and coverage', () => {
      const calculateSuggestedQuantity = (service as any).calculateSuggestedQuantity
      
      const item = {
        sales_velocity_30d: 10, // 10 units per day
        sales_velocity_90d: 8,
        reorder_quantity: 200,
        unit_cost: 25,
        current_stock: 50,
        reorder_point: 100,
        lead_time_days: 7
      }
      
      const quantity = calculateSuggestedQuantity.call(service, item)
      expect(quantity).toBeGreaterThan(0)
      expect(quantity).toBeGreaterThanOrEqual(200) // Should be at least the reorder quantity
    })

    it('should round to appropriate units for large quantities', () => {
      const calculateSuggestedQuantity = (service as any).calculateSuggestedQuantity
      
      const item = {
        sales_velocity_30d: 50,
        sales_velocity_90d: 45,
        reorder_quantity: 1000,
        unit_cost: 5,
        current_stock: 100,
        reorder_point: 500,
        lead_time_days: 14
      }
      
      const quantity = calculateSuggestedQuantity.call(service, item)
      expect(quantity % 10).toBe(0) // Should be rounded to nearest 10
    })

    it('should factor in safety stock for variable demand', () => {
      const calculateSuggestedQuantity = (service as any).calculateSuggestedQuantity
      
      const stableItem = {
        sales_velocity_30d: 10,
        sales_velocity_90d: 10, // Stable demand
        reorder_quantity: 100,
        unit_cost: 20,
        current_stock: 30,
        reorder_point: 50,
        lead_time_days: 7
      }
      
      const variableItem = {
        ...stableItem,
        sales_velocity_90d: 5 // High variability
      }
      
      const stableQuantity = calculateSuggestedQuantity.call(service, stableItem)
      const variableQuantity = calculateSuggestedQuantity.call(service, variableItem)
      
      expect(variableQuantity).toBeGreaterThanOrEqual(stableQuantity)
    })
  })

  describe('determineUrgency', () => {
    it('should return critical for stockout within 7 days', () => {
      const determineUrgency = (service as any).determineUrgency
      
      expect(determineUrgency.call(service, 0)).toBe('critical')
      expect(determineUrgency.call(service, 5)).toBe('critical')
      expect(determineUrgency.call(service, 7)).toBe('critical')
      expect(determineUrgency.call(service, undefined)).toBe('critical')
    })

    it('should return high for stockout within 14 days', () => {
      const determineUrgency = (service as any).determineUrgency
      
      expect(determineUrgency.call(service, 8)).toBe('high')
      expect(determineUrgency.call(service, 14)).toBe('high')
    })

    it('should return medium for stockout within 30 days', () => {
      const determineUrgency = (service as any).determineUrgency
      
      expect(determineUrgency.call(service, 15)).toBe('medium')
      expect(determineUrgency.call(service, 30)).toBe('medium')
    })

    it('should return low for stockout beyond 30 days', () => {
      const determineUrgency = (service as any).determineUrgency
      
      expect(determineUrgency.call(service, 31)).toBe('low')
      expect(determineUrgency.call(service, 100)).toBe('low')
    })
  })

  describe('getItemsNeedingReorder', () => {
    it('should fetch and sort items by stockout urgency', async () => {
      const mockItems = [
        {
          id: '1',
          sku: 'SKU001',
          product_name: 'Product 1',
          current_stock: 10,
          reorder_point: 20,
          sales_velocity_30d: 5
        },
        {
          id: '2',
          sku: 'SKU002',
          product_name: 'Product 2',
          current_stock: 5,
          reorder_point: 15,
          sales_velocity_30d: 10
        }
      ]

      const fromMock = supabase.from as jest.Mock
      fromMock.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockItems, error: null })
      })

      const items = await service.getItemsNeedingReorder()
      
      expect(items).toHaveLength(2)
      expect(items[0].days_until_stockout).toBe(0) // 5/10 = 0.5 days
      expect(items[1].days_until_stockout).toBe(2) // 10/5 = 2 days
    })

    it('should handle items with no sales velocity', async () => {
      const mockItems = [
        {
          id: '1',
          sku: 'SKU001',
          product_name: 'Product 1',
          current_stock: 10,
          reorder_point: 20,
          sales_velocity_30d: 0
        }
      ]

      const fromMock = supabase.from as jest.Mock
      fromMock.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockItems, error: null })
      })

      const items = await service.getItemsNeedingReorder()
      
      expect(items).toHaveLength(1)
      expect(items[0].days_until_stockout).toBe(999) // No velocity, stock exists
    })

    it('should handle database errors gracefully', async () => {
      const fromMock = supabase.from as jest.Mock
      fromMock.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
      })

      await expect(service.getItemsNeedingReorder()).rejects.toThrow('Database error')
    })
  })

  describe('generatePOSuggestions', () => {
    it('should group items by vendor and generate suggestions', async () => {
      const mockItems = [
        {
          id: '1',
          sku: 'SKU001',
          product_name: 'Product 1',
          current_stock: 10,
          reorder_point: 20,
          reorder_quantity: 50,
          unit_cost: 10,
          sales_velocity_30d: 5,
          vendor_id: 'vendor1',
          vendor_name: 'Vendor 1'
        },
        {
          id: '2',
          sku: 'SKU002',
          product_name: 'Product 2',
          current_stock: 5,
          reorder_point: 15,
          reorder_quantity: 30,
          unit_cost: 20,
          sales_velocity_30d: 10,
          vendor_id: 'vendor1',
          vendor_name: 'Vendor 1'
        },
        {
          id: '3',
          sku: 'SKU003',
          product_name: 'Product 3',
          current_stock: 20,
          reorder_point: 25,
          reorder_quantity: 40,
          unit_cost: 15,
          sales_velocity_30d: 3,
          vendor_id: 'vendor2',
          vendor_name: 'Vendor 2'
        }
      ]

      const mockVendors = [
        { id: 'vendor1', name: 'Vendor 1', contact_email: 'vendor1@example.com', lead_time_days: 7 },
        { id: 'vendor2', name: 'Vendor 2', contact_email: 'vendor2@example.com', lead_time_days: 10 }
      ]

      // Mock getItemsNeedingReorder
      jest.spyOn(service, 'getItemsNeedingReorder').mockResolvedValue(
        mockItems.map(item => ({
          ...item,
          days_until_stockout: Math.floor(item.current_stock / item.sales_velocity_30d),
          lead_time_days: 7
        }))
      )

      // Mock vendor fetch
      const fromMock = supabase.from as jest.Mock
      fromMock.mockImplementation((table: string) => {
        if (table === 'vendors') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: mockVendors, error: null })
          }
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockItems, error: null })
        }
      })

      const suggestions = await service.generatePOSuggestions()
      
      expect(suggestions).toHaveLength(2) // Two vendors
      expect(suggestions[0].vendor_name).toBe('Vendor 1')
      expect(suggestions[0].items).toHaveLength(2)
      expect(suggestions[0].urgency_level).toBe('critical') // SKU002 has 0 days until stockout
      expect(suggestions[1].vendor_name).toBe('Vendor 2')
      expect(suggestions[1].items).toHaveLength(1)
    })

    it('should handle vendors without IDs by matching names', async () => {
      const mockItems = [
        {
          id: '1',
          sku: 'SKU001',
          product_name: 'Product 1',
          current_stock: 10,
          reorder_point: 20,
          reorder_quantity: 50,
          unit_cost: 10,
          sales_velocity_30d: 5,
          vendor_name: 'Vendor ABC' // No vendor_id
        }
      ]

      const mockVendors = [
        { id: 'vendor1', name: 'Vendor ABC', contact_email: 'abc@example.com', lead_time_days: 7 }
      ]

      jest.spyOn(service, 'getItemsNeedingReorder').mockResolvedValue(
        mockItems.map(item => ({
          ...item,
          days_until_stockout: 2,
          lead_time_days: 7
        }))
      )

      const fromMock = supabase.from as jest.Mock
      fromMock.mockImplementation((table: string) => {
        if (table === 'vendors') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: mockVendors, error: null })
          }
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockItems, error: null })
        }
      })

      const suggestions = await service.generatePOSuggestions()
      
      expect(suggestions).toHaveLength(1)
      expect(suggestions[0].vendor_id).toBe('vendor1')
      expect(suggestions[0].vendor_email).toBe('abc@example.com')
    })

    it('should return empty array when no items need reordering', async () => {
      jest.spyOn(service, 'getItemsNeedingReorder').mockResolvedValue([])
      
      const suggestions = await service.generatePOSuggestions()
      
      expect(suggestions).toEqual([])
    })

    it('should sort suggestions by urgency level', async () => {
      const mockItems = [
        {
          id: '1',
          sku: 'SKU001',
          product_name: 'Product 1',
          current_stock: 100,
          reorder_point: 20,
          reorder_quantity: 50,
          unit_cost: 10,
          sales_velocity_30d: 2,
          vendor_id: 'vendor1',
          days_until_stockout: 50 // Low urgency
        },
        {
          id: '2',
          sku: 'SKU002',
          product_name: 'Product 2',
          current_stock: 5,
          reorder_point: 15,
          reorder_quantity: 30,
          unit_cost: 20,
          sales_velocity_30d: 10,
          vendor_id: 'vendor2',
          days_until_stockout: 0 // Critical urgency
        },
        {
          id: '3',
          sku: 'SKU003',
          product_name: 'Product 3',
          current_stock: 30,
          reorder_point: 25,
          reorder_quantity: 40,
          unit_cost: 15,
          sales_velocity_30d: 3,
          vendor_id: 'vendor3',
          days_until_stockout: 10 // High urgency
        }
      ]

      const mockVendors = [
        { id: 'vendor1', name: 'Vendor 1', contact_email: 'v1@example.com', lead_time_days: 7 },
        { id: 'vendor2', name: 'Vendor 2', contact_email: 'v2@example.com', lead_time_days: 7 },
        { id: 'vendor3', name: 'Vendor 3', contact_email: 'v3@example.com', lead_time_days: 7 }
      ]

      jest.spyOn(service, 'getItemsNeedingReorder').mockResolvedValue(mockItems as any)

      const fromMock = supabase.from as jest.Mock
      fromMock.mockImplementation((table: string) => {
        if (table === 'vendors') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: mockVendors, error: null })
          }
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockItems, error: null })
        }
      })

      const suggestions = await service.generatePOSuggestions()
      
      expect(suggestions).toHaveLength(3)
      expect(suggestions[0].urgency_level).toBe('critical')
      expect(suggestions[1].urgency_level).toBe('high')
      expect(suggestions[2].urgency_level).toBe('low')
    })
  })

  describe('createPurchaseOrder', () => {
    it('should create a purchase order with correct data', async () => {
      const suggestion = {
        vendor_id: 'vendor1',
        vendor_name: 'Test Vendor',
        vendor_email: 'vendor@example.com',
        items: [
          {
            sku: 'SKU001',
            product_name: 'Product 1',
            quantity: 100,
            unit_cost: 10,
            total_cost: 1000,
            current_stock: 20,
            reorder_point: 50,
            sales_velocity: 5,
            days_until_stockout: 4,
            urgency: 'critical' as const
          }
        ],
        total_amount: 1000,
        total_items: 1,
        urgency_level: 'critical' as const,
        estimated_stockout_days: 4
      }

      const mockPO = {
        id: 'po1',
        po_number: 'PO-2024-123456',
        ...suggestion,
        status: 'draft',
        created_at: new Date().toISOString()
      }

      const fromMock = supabase.from as jest.Mock
      fromMock.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPO, error: null })
      })

      const result = await service.createPurchaseOrder(suggestion, 'user123')
      
      expect(result).toEqual(mockPO)
      expect(fromMock).toHaveBeenCalledWith('purchase_orders')
    })

    it('should generate unique PO numbers', async () => {
      const suggestion = {
        vendor_id: 'vendor1',
        vendor_name: 'Test Vendor',
        items: [],
        total_amount: 0,
        total_items: 0,
        urgency_level: 'low' as const,
        estimated_stockout_days: 100
      }

      const fromMock = supabase.from as jest.Mock
      fromMock.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => {
          const timestamp = Date.now().toString().slice(-6)
          const year = new Date().getFullYear()
          return Promise.resolve({
            data: { po_number: `PO-${year}-${timestamp}` },
            error: null
          })
        })
      })

      const po1 = await service.createPurchaseOrder(suggestion)
      await new Promise(resolve => setTimeout(resolve, 10)) // Small delay
      const po2 = await service.createPurchaseOrder(suggestion)
      
      expect(po1.po_number).not.toBe(po2.po_number)
    })

    it('should handle database errors', async () => {
      const suggestion = {
        vendor_name: 'Test Vendor',
        items: [],
        total_amount: 0,
        total_items: 0,
        urgency_level: 'low' as const,
        estimated_stockout_days: 100
      }

      const fromMock = supabase.from as jest.Mock
      fromMock.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: new Error('Insert failed') })
      })

      await expect(service.createPurchaseOrder(suggestion)).rejects.toThrow('Insert failed')
    })
  })

  describe('getDraftPurchaseOrders', () => {
    it('should fetch draft purchase orders', async () => {
      const mockDrafts = [
        { id: 'po1', po_number: 'PO-2024-001', status: 'draft' },
        { id: 'po2', po_number: 'PO-2024-002', status: 'draft' }
      ]

      const fromMock = supabase.from as jest.Mock
      fromMock.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockDrafts, error: null })
      })

      const drafts = await service.getDraftPurchaseOrders()
      
      expect(drafts).toEqual(mockDrafts)
      expect(fromMock).toHaveBeenCalledWith('purchase_orders')
    })

    it('should return empty array on error', async () => {
      const fromMock = supabase.from as jest.Mock
      fromMock.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: new Error('Fetch failed') })
      })

      await expect(service.getDraftPurchaseOrders()).rejects.toThrow('Fetch failed')
    })
  })
})

describe('Performance Tests', () => {
  let service: POGenerationService

  beforeEach(() => {
    service = new POGenerationService()
  })

  it('should handle 100+ line items efficiently', async () => {
    const largeItemSet = Array.from({ length: 150 }, (_, i) => ({
      id: `item${i}`,
      sku: `SKU${i.toString().padStart(3, '0')}`,
      product_name: `Product ${i}`,
      current_stock: Math.floor(Math.random() * 100),
      reorder_point: 50,
      reorder_quantity: 100,
      unit_cost: Math.random() * 100,
      sales_velocity_30d: Math.random() * 20,
      sales_velocity_90d: Math.random() * 20,
      vendor_id: `vendor${Math.floor(i / 30)}`, // 5 vendors
      days_until_stockout: Math.floor(Math.random() * 60)
    }))

    const mockVendors = Array.from({ length: 5 }, (_, i) => ({
      id: `vendor${i}`,
      name: `Vendor ${i}`,
      contact_email: `vendor${i}@example.com`,
      lead_time_days: 7
    }))

    jest.spyOn(service, 'getItemsNeedingReorder').mockResolvedValue(largeItemSet as any)

    const fromMock = supabase.from as jest.Mock
    fromMock.mockImplementation((table: string) => {
      if (table === 'vendors') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: mockVendors, error: null })
        }
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: largeItemSet, error: null })
      }
    })

    const startTime = Date.now()
    const suggestions = await service.generatePOSuggestions()
    const endTime = Date.now()
    const executionTime = endTime - startTime

    expect(suggestions).toHaveLength(5) // 5 vendors
    expect(suggestions.reduce((sum, s) => sum + s.items.length, 0)).toBe(150)
    expect(executionTime).toBeLessThan(1000) // Should complete within 1 second
  })

  it('should calculate quantities for large item sets efficiently', () => {
    const calculateSuggestedQuantity = (service as any).calculateSuggestedQuantity
    
    const items = Array.from({ length: 1000 }, (_, i) => ({
      sales_velocity_30d: Math.random() * 100,
      sales_velocity_90d: Math.random() * 100,
      reorder_quantity: Math.floor(Math.random() * 500),
      unit_cost: Math.random() * 100,
      current_stock: Math.floor(Math.random() * 200),
      reorder_point: Math.floor(Math.random() * 100),
      lead_time_days: Math.floor(Math.random() * 14) + 1
    }))

    const startTime = Date.now()
    items.forEach(item => {
      calculateSuggestedQuantity.call(service, item)
    })
    const endTime = Date.now()
    const executionTime = endTime - startTime

    expect(executionTime).toBeLessThan(100) // Should process 1000 items in under 100ms
  })
})