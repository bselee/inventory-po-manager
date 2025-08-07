/**
 * Integration tests for Purchase Order API endpoints
 * Tests complete request/response cycles and database interactions
 */

import { NextRequest } from 'next/server'
import { GET as generateGET, POST as generatePOST } from '../generate/route'
import { GET as suggestionsGET } from '../suggestions/route'
import { POST as createPOST } from '../create/route'
import { POST as approvePOST } from '../[id]/approve/route'
import { POST as rejectPOST } from '../[id]/reject/route'
import { GET as exportGET } from '../[id]/export/route'
import { POST as sendPOST } from '../[id]/send/route'
import { supabase } from '@/app/lib/supabase'

// Mock Supabase
jest.mock('@/app/lib/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}))

// Mock POGenerationService
jest.mock('@/app/lib/po-generation-service', () => ({
  POGenerationService: jest.fn().mockImplementation(() => ({
    generatePOSuggestions: jest.fn(),
    getDraftPurchaseOrders: jest.fn(),
    createPurchaseOrder: jest.fn(),
    getItemsNeedingReorder: jest.fn()
  })),
  default: jest.fn().mockImplementation(() => ({
    generatePOSuggestions: jest.fn(),
    getDraftPurchaseOrders: jest.fn(),
    createPurchaseOrder: jest.fn(),
    getItemsNeedingReorder: jest.fn()
  }))
}))

describe('Purchase Orders API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/purchase-orders/generate', () => {
    it('should return PO suggestions with summary', async () => {
      const mockSuggestions = [
        {
          vendor_name: 'Vendor A',
          total_items: 5,
          total_amount: 1000,
          urgency_level: 'critical',
          items: []
        },
        {
          vendor_name: 'Vendor B',
          total_items: 3,
          total_amount: 500,
          urgency_level: 'high',
          items: []
        }
      ]

      const mockDrafts = [
        { vendor_name: 'Vendor A', created_at: new Date().toISOString() }
      ]

      // Mock the service methods
      const POGenerationService = require('@/app/lib/po-generation-service').POGenerationService
      POGenerationService.mockImplementation(() => ({
        generatePOSuggestions: jest.fn().mockResolvedValue(mockSuggestions),
        getDraftPurchaseOrders: jest.fn().mockResolvedValue(mockDrafts)
      }))

      const response = await generateGET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.suggestions).toHaveLength(2)
      expect(data.summary.critical_vendors).toBe(1)
      expect(data.summary.high_priority_vendors).toBe(1)
      expect(data.summary.total_items_to_order).toBe(8)
      expect(data.summary.estimated_total_cost).toBe(1500)
      expect(data.suggestions[0].has_existing_draft).toBe(true)
    })

    it('should handle errors gracefully', async () => {
      const POGenerationService = require('@/app/lib/po-generation-service').POGenerationService
      POGenerationService.mockImplementation(() => ({
        generatePOSuggestions: jest.fn().mockRejectedValue(new Error('Database error'))
      }))

      const response = await generateGET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Database error')
    })
  })

  describe('POST /api/purchase-orders/generate', () => {
    it('should create PO from suggestion', async () => {
      const suggestion = {
        vendor_name: 'Test Vendor',
        items: [
          { sku: 'SKU001', quantity: 10, unit_cost: 5, total_cost: 50 }
        ],
        total_amount: 50
      }

      const mockPO = {
        id: 'po123',
        po_number: 'PO-2024-001',
        ...suggestion,
        status: 'draft'
      }

      const POGenerationService = require('@/app/lib/po-generation-service').default
      POGenerationService.mockImplementation(() => ({
        createPurchaseOrder: jest.fn().mockResolvedValue(mockPO)
      }))

      const request = new NextRequest('http://localhost:3000/api/purchase-orders/generate', {
        method: 'POST',
        body: JSON.stringify({ suggestion, userId: 'user123' })
      })

      const response = await generatePOST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.purchase_order.po_number).toBe('PO-2024-001')
    })

    it('should apply quantity adjustments', async () => {
      const suggestion = {
        vendor_name: 'Test Vendor',
        items: [
          { sku: 'SKU001', quantity: 10, unit_cost: 5, total_cost: 50 },
          { sku: 'SKU002', quantity: 20, unit_cost: 3, total_cost: 60 }
        ],
        total_amount: 110
      }

      const adjustments = [
        { sku: 'SKU001', quantity: 15 } // Adjust quantity from 10 to 15
      ]

      const POGenerationService = require('@/app/lib/po-generation-service').default
      const createPurchaseOrderMock = jest.fn().mockImplementation((finalSuggestion) => {
        // Verify adjustments were applied
        expect(finalSuggestion.items[0].quantity).toBe(15)
        expect(finalSuggestion.items[0].total_cost).toBe(75)
        expect(finalSuggestion.total_amount).toBe(135)
        
        return Promise.resolve({
          id: 'po123',
          po_number: 'PO-2024-001',
          ...finalSuggestion
        })
      })

      POGenerationService.mockImplementation(() => ({
        createPurchaseOrder: createPurchaseOrderMock
      }))

      const request = new NextRequest('http://localhost:3000/api/purchase-orders/generate', {
        method: 'POST',
        body: JSON.stringify({ suggestion, adjustments, userId: 'user123' })
      })

      const response = await generatePOST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(createPurchaseOrderMock).toHaveBeenCalled()
    })

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/purchase-orders/generate', {
        method: 'POST',
        body: JSON.stringify({}) // Missing suggestion
      })

      const response = await generatePOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Suggestion data is required')
    })
  })

  describe('POST /api/purchase-orders/create', () => {
    it('should create a new purchase order', async () => {
      const poData = {
        vendor_name: 'Test Vendor',
        vendor_email: 'vendor@example.com',
        items: [
          {
            sku: 'SKU001',
            product_name: 'Product 1',
            quantity: 10,
            unit_cost: 5.99,
            total_cost: 59.90
          }
        ],
        total_amount: 59.90,
        notes: 'Urgent order'
      }

      const mockInsertResult = {
        id: 'po456',
        po_number: 'PO-2024-002',
        ...poData,
        status: 'draft',
        created_at: new Date().toISOString()
      }

      const fromMock = supabase.from as jest.Mock
      fromMock.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockInsertResult, error: null })
      })

      const request = new NextRequest('http://localhost:3000/api/purchase-orders/create', {
        method: 'POST',
        body: JSON.stringify(poData)
      })

      const response = await createPOST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.po_number).toBe('PO-2024-002')
      expect(fromMock).toHaveBeenCalledWith('purchase_orders')
    })

    it('should validate item structure', async () => {
      const invalidPO = {
        vendor_name: 'Test Vendor',
        items: [
          { sku: 'SKU001' } // Missing required fields
        ]
      }

      const request = new NextRequest('http://localhost:3000/api/purchase-orders/create', {
        method: 'POST',
        body: JSON.stringify(invalidPO)
      })

      const response = await createPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid item')
    })
  })

  describe('POST /api/purchase-orders/[id]/approve', () => {
    it('should approve a purchase order', async () => {
      const poId = 'po789'
      const mockPO = {
        id: poId,
        po_number: 'PO-2024-003',
        status: 'pending_approval'
      }

      const fromMock = supabase.from as jest.Mock
      fromMock.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPO, error: null }),
        update: jest.fn().mockReturnThis()
      }))

      const request = new NextRequest(`http://localhost:3000/api/purchase-orders/${poId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ approved_by: 'manager123', notes: 'Approved for urgent fulfillment' })
      })

      const response = await approvePOST(request, { params: { id: poId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('approved')
    })

    it('should reject approval for non-pending orders', async () => {
      const poId = 'po789'
      const mockPO = {
        id: poId,
        status: 'shipped' // Already shipped, cannot approve
      }

      const fromMock = supabase.from as jest.Mock
      fromMock.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPO, error: null })
      }))

      const request = new NextRequest(`http://localhost:3000/api/purchase-orders/${poId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ approved_by: 'manager123' })
      })

      const response = await approvePOST(request, { params: { id: poId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('cannot be approved')
    })
  })

  describe('POST /api/purchase-orders/[id]/reject', () => {
    it('should reject a purchase order with reason', async () => {
      const poId = 'po999'
      const mockPO = {
        id: poId,
        po_number: 'PO-2024-004',
        status: 'pending_approval'
      }

      const fromMock = supabase.from as jest.Mock
      fromMock.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPO, error: null }),
        update: jest.fn().mockReturnThis()
      }))

      const request = new NextRequest(`http://localhost:3000/api/purchase-orders/${poId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ 
          rejected_by: 'manager123',
          rejection_reason: 'Budget constraints'
        })
      })

      const response = await rejectPOST(request, { params: { id: poId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('rejected')
    })

    it('should require rejection reason', async () => {
      const request = new NextRequest('http://localhost:3000/api/purchase-orders/po999/reject', {
        method: 'POST',
        body: JSON.stringify({ rejected_by: 'manager123' }) // Missing reason
      })

      const response = await rejectPOST(request, { params: { id: 'po999' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('reason')
    })
  })

  describe('GET /api/purchase-orders/[id]/export', () => {
    it('should export PO as CSV', async () => {
      const poId = 'po111'
      const mockPO = {
        id: poId,
        po_number: 'PO-2024-005',
        vendor_name: 'Export Vendor',
        items: [
          {
            sku: 'SKU001',
            product_name: 'Product 1',
            quantity: 10,
            unit_cost: 5,
            total_cost: 50
          },
          {
            sku: 'SKU002',
            product_name: 'Product 2',
            quantity: 20,
            unit_cost: 3,
            total_cost: 60
          }
        ],
        total_amount: 110
      }

      const fromMock = supabase.from as jest.Mock
      fromMock.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPO, error: null })
      }))

      const request = new NextRequest(`http://localhost:3000/api/purchase-orders/${poId}/export?format=csv`)

      const response = await exportGET(request, { params: { id: poId } })
      
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/csv')
      expect(response.headers.get('Content-Disposition')).toContain('PO-2024-005.csv')
      
      const csvContent = await response.text()
      expect(csvContent).toContain('SKU,Product Name,Quantity,Unit Cost,Total Cost')
      expect(csvContent).toContain('SKU001,Product 1,10,5,50')
      expect(csvContent).toContain('SKU002,Product 2,20,3,60')
    })

    it('should export PO as JSON', async () => {
      const poId = 'po111'
      const mockPO = {
        id: poId,
        po_number: 'PO-2024-005',
        vendor_name: 'Export Vendor',
        items: []
      }

      const fromMock = supabase.from as jest.Mock
      fromMock.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPO, error: null })
      }))

      const request = new NextRequest(`http://localhost:3000/api/purchase-orders/${poId}/export?format=json`)

      const response = await exportGET(request, { params: { id: poId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(data.po_number).toBe('PO-2024-005')
    })

    it('should handle invalid export format', async () => {
      const request = new NextRequest('http://localhost:3000/api/purchase-orders/po111/export?format=xml')

      const response = await exportGET(request, { params: { id: 'po111' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid format')
    })
  })

  describe('POST /api/purchase-orders/[id]/send', () => {
    it('should send PO via email', async () => {
      const poId = 'po222'
      const mockPO = {
        id: poId,
        po_number: 'PO-2024-006',
        vendor_name: 'Email Vendor',
        vendor_email: 'vendor@example.com',
        items: [],
        total_amount: 100
      }

      const fromMock = supabase.from as jest.Mock
      fromMock.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPO, error: null }),
        update: jest.fn().mockReturnThis()
      }))

      // Mock email service
      jest.mock('@/app/lib/email-service', () => ({
        sendPurchaseOrder: jest.fn().mockResolvedValue(true)
      }))

      const request = new NextRequest(`http://localhost:3000/api/purchase-orders/${poId}/send`, {
        method: 'POST',
        body: JSON.stringify({
          recipient_email: 'vendor@example.com',
          cc_emails: ['manager@company.com'],
          message: 'Please process this order urgently'
        })
      })

      const response = await sendPOST(request, { params: { id: poId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('sent successfully')
    })

    it('should validate email addresses', async () => {
      const request = new NextRequest('http://localhost:3000/api/purchase-orders/po222/send', {
        method: 'POST',
        body: JSON.stringify({
          recipient_email: 'invalid-email',
          message: 'Test'
        })
      })

      const response = await sendPOST(request, { params: { id: 'po222' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid email')
    })
  })
})

describe('Performance Integration Tests', () => {
  it('should handle concurrent PO generation requests', async () => {
    const POGenerationService = require('@/app/lib/po-generation-service').POGenerationService
    POGenerationService.mockImplementation(() => ({
      generatePOSuggestions: jest.fn().mockResolvedValue([]),
      getDraftPurchaseOrders: jest.fn().mockResolvedValue([])
    }))

    const requests = Array.from({ length: 10 }, () => generateGET())
    const responses = await Promise.all(requests)
    
    responses.forEach(response => {
      expect(response.status).toBe(200)
    })
  })

  it('should process large PO with 100+ items efficiently', async () => {
    const largeItems = Array.from({ length: 150 }, (_, i) => ({
      sku: `SKU${i.toString().padStart(3, '0')}`,
      product_name: `Product ${i}`,
      quantity: Math.floor(Math.random() * 100) + 1,
      unit_cost: Math.random() * 100,
      total_cost: 0
    }))

    largeItems.forEach(item => {
      item.total_cost = item.quantity * item.unit_cost
    })

    const poData = {
      vendor_name: 'Large Vendor',
      vendor_email: 'large@vendor.com',
      items: largeItems,
      total_amount: largeItems.reduce((sum, item) => sum + item.total_cost, 0)
    }

    const fromMock = supabase.from as jest.Mock
    fromMock.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ 
        data: { ...poData, id: 'large-po', po_number: 'PO-2024-LARGE' },
        error: null 
      })
    })

    const request = new NextRequest('http://localhost:3000/api/purchase-orders/create', {
      method: 'POST',
      body: JSON.stringify(poData)
    })

    const startTime = Date.now()
    const response = await createPOST(request)
    const endTime = Date.now()

    expect(response.status).toBe(201)
    expect(endTime - startTime).toBeLessThan(2000) // Should complete within 2 seconds
  })
})