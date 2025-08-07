/**
 * Comprehensive Integration Tests for Purchase Order API Endpoints
 * Tests all 7 endpoints with complete scenarios
 */

import { NextRequest, NextResponse } from 'next/server'
import { GET as listPOs, POST as createPO } from '../route'
import { GET as getPO, PUT as updatePO, DELETE as deletePO } from '../[id]/route'
import { POST as approvePO } from '../[id]/approve/route'
import { POST as rejectPO } from '../[id]/reject/route'
import { POST as sendPO } from '../[id]/send/route'
import { GET as exportPO } from '../[id]/export/route'
import { POST as generatePOs } from '../generate/route'
import { GET as getSuggestions } from '../suggestions/route'
import { supabase } from '@/app/lib/supabase'

// Mock dependencies
jest.mock('@/app/lib/supabase')
jest.mock('@/app/lib/email-service')
jest.mock('@/app/lib/pdf-generator')

describe('Purchase Orders API - Comprehensive Integration Tests', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset all mocks
    mockSupabase.from = jest.fn()
  })

  describe('GET /api/purchase-orders - List POs', () => {
    test('should list all purchase orders with pagination', async () => {
      const mockPOs = Array.from({ length: 25 }, (_, i) => ({
        id: `po-${i}`,
        po_number: `PO-2024-${i.toString().padStart(6, '0')}`,
        vendor_name: `Vendor ${i % 5}`,
        status: ['draft', 'pending', 'approved', 'sent', 'received'][i % 5],
        total_amount: 1000 + i * 100,
        created_at: new Date(Date.now() - i * 86400000).toISOString(),
        urgency_level: ['critical', 'high', 'medium', 'low'][i % 4]
      }))

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ 
          data: mockPOs.slice(0, 10), 
          error: null,
          count: 25 
        })
      }
      mockSupabase.from.mockReturnValue(mockFrom as any)

      const request = new NextRequest('http://localhost:3000/api/purchase-orders?page=1&limit=10')
      const response = await listPOs(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(10)
      expect(data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3
      })
    })

    test('should filter by status', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ 
          data: [], 
          error: null,
          count: 0 
        })
      }
      mockSupabase.from.mockReturnValue(mockFrom as any)

      const request = new NextRequest('http://localhost:3000/api/purchase-orders?status=pending')
      await listPOs(request)

      expect(mockFrom.eq).toHaveBeenCalledWith('status', 'pending')
    })

    test('should filter by vendor', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ 
          data: [], 
          error: null,
          count: 0 
        })
      }
      mockSupabase.from.mockReturnValue(mockFrom as any)

      const request = new NextRequest('http://localhost:3000/api/purchase-orders?vendor_id=vendor-1')
      await listPOs(request)

      expect(mockFrom.eq).toHaveBeenCalledWith('vendor_id', 'vendor-1')
    })

    test('should handle database errors', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ 
          data: null, 
          error: new Error('Database error') 
        })
      }
      mockSupabase.from.mockReturnValue(mockFrom as any)

      const request = new NextRequest('http://localhost:3000/api/purchase-orders')
      const response = await listPOs(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch purchase orders')
    })
  })

  describe('POST /api/purchase-orders - Create PO', () => {
    test('should create a new purchase order', async () => {
      const newPO = {
        vendor_id: 'vendor-1',
        vendor_name: 'Test Vendor',
        items: [
          {
            sku: 'TEST-001',
            product_name: 'Test Product',
            quantity: 100,
            unit_cost: 10,
            total_cost: 1000
          }
        ],
        total_amount: 1000,
        urgency_level: 'high'
      }

      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { 
            id: 'new-po-1',
            po_number: 'PO-2024-000001',
            ...newPO,
            status: 'draft',
            created_at: new Date().toISOString()
          }, 
          error: null 
        })
      }
      mockSupabase.from.mockReturnValue(mockFrom as any)

      const request = new NextRequest('http://localhost:3000/api/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(newPO)
      })
      const response = await createPO(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.po_number).toMatch(/^PO-\d{4}-\d{6}$/)
      expect(data.data.status).toBe('draft')
    })

    test('should validate required fields', async () => {
      const invalidPO = {
        vendor_name: 'Test Vendor'
        // Missing required fields
      }

      const request = new NextRequest('http://localhost:3000/api/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(invalidPO)
      })
      const response = await createPO(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('validation')
    })

    test('should create audit trail entry', async () => {
      const newPO = {
        vendor_id: 'vendor-1',
        vendor_name: 'Test Vendor',
        items: [],
        total_amount: 0
      }

      const mockPOFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { id: 'po-1', ...newPO }, 
          error: null 
        })
      }

      const mockAuditFrom = {
        insert: jest.fn().mockResolvedValue({ data: {}, error: null })
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'purchase_orders') return mockPOFrom as any
        if (table === 'po_audit_trail') return mockAuditFrom as any
        return {} as any
      })

      const request = new NextRequest('http://localhost:3000/api/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(newPO)
      })
      await createPO(request)

      expect(mockAuditFrom.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          po_id: 'po-1',
          action: 'created',
          status: 'draft'
        })
      )
    })
  })

  describe('GET /api/purchase-orders/[id] - Get Single PO', () => {
    test('should retrieve a purchase order by ID', async () => {
      const mockPO = {
        id: 'po-1',
        po_number: 'PO-2024-000001',
        vendor_name: 'Test Vendor',
        status: 'approved',
        items: [
          { sku: 'TEST-001', quantity: 100, unit_cost: 10 }
        ],
        total_amount: 1000,
        audit_trail: [
          { action: 'created', timestamp: '2024-01-01T00:00:00Z' },
          { action: 'approved', timestamp: '2024-01-02T00:00:00Z' }
        ]
      }

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPO, error: null })
      }
      mockSupabase.from.mockReturnValue(mockFrom as any)

      const request = new NextRequest('http://localhost:3000/api/purchase-orders/po-1')
      const response = await getPO(request, { params: { id: 'po-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.id).toBe('po-1')
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'po-1')
    })

    test('should return 404 for non-existent PO', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      }
      mockSupabase.from.mockReturnValue(mockFrom as any)

      const request = new NextRequest('http://localhost:3000/api/purchase-orders/invalid-id')
      const response = await getPO(request, { params: { id: 'invalid-id' } })
      
      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/purchase-orders/[id]/approve - Approve PO', () => {
    test('should approve a pending purchase order', async () => {
      const mockPO = {
        id: 'po-1',
        status: 'pending',
        po_number: 'PO-2024-000001'
      }

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPO, error: null }),
        update: jest.fn().mockReturnThis()
      }
      
      mockSupabase.from.mockReturnValue(mockFrom as any)

      const request = new NextRequest('http://localhost:3000/api/purchase-orders/po-1/approve', {
        method: 'POST',
        body: JSON.stringify({ approver_notes: 'Approved for immediate order' })
      })
      const response = await approvePO(request, { params: { id: 'po-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockFrom.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved',
          approved_at: expect.any(String),
          approver_notes: 'Approved for immediate order'
        })
      )
    })

    test('should not approve already approved PO', async () => {
      const mockPO = {
        id: 'po-1',
        status: 'approved'
      }

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPO, error: null })
      }
      mockSupabase.from.mockReturnValue(mockFrom as any)

      const request = new NextRequest('http://localhost:3000/api/purchase-orders/po-1/approve', {
        method: 'POST'
      })
      const response = await approvePO(request, { params: { id: 'po-1' } })

      expect(response.status).toBe(400)
    })

    test('should create audit trail for approval', async () => {
      const mockPO = { id: 'po-1', status: 'pending' }

      const mockPOFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPO, error: null }),
        update: jest.fn().mockReturnThis()
      }

      const mockAuditFrom = {
        insert: jest.fn().mockResolvedValue({ data: {}, error: null })
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'purchase_orders') return mockPOFrom as any
        if (table === 'po_audit_trail') return mockAuditFrom as any
        return {} as any
      })

      const request = new NextRequest('http://localhost:3000/api/purchase-orders/po-1/approve', {
        method: 'POST'
      })
      await approvePO(request, { params: { id: 'po-1' } })

      expect(mockAuditFrom.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          po_id: 'po-1',
          action: 'approved',
          status: 'approved'
        })
      )
    })
  })

  describe('POST /api/purchase-orders/[id]/send - Send PO', () => {
    test('should send PO via email to vendor', async () => {
      const mockPO = {
        id: 'po-1',
        po_number: 'PO-2024-000001',
        status: 'approved',
        vendor_email: 'vendor@test.com',
        vendor_name: 'Test Vendor',
        items: [],
        total_amount: 1000
      }

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPO, error: null }),
        update: jest.fn().mockReturnThis()
      }
      mockSupabase.from.mockReturnValue(mockFrom as any)

      // Mock email service
      const { sendPurchaseOrderEmail } = require('@/app/lib/email-service')
      sendPurchaseOrderEmail.mockResolvedValue({ success: true })

      const request = new NextRequest('http://localhost:3000/api/purchase-orders/po-1/send', {
        method: 'POST'
      })
      const response = await sendPO(request, { params: { id: 'po-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(sendPurchaseOrderEmail).toHaveBeenCalledWith(mockPO)
      expect(mockFrom.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'sent',
          sent_at: expect.any(String)
        })
      )
    })

    test('should only send approved POs', async () => {
      const mockPO = {
        id: 'po-1',
        status: 'draft'
      }

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPO, error: null })
      }
      mockSupabase.from.mockReturnValue(mockFrom as any)

      const request = new NextRequest('http://localhost:3000/api/purchase-orders/po-1/send', {
        method: 'POST'
      })
      const response = await sendPO(request, { params: { id: 'po-1' } })

      expect(response.status).toBe(400)
    })

    test('should handle email failures gracefully', async () => {
      const mockPO = {
        id: 'po-1',
        status: 'approved',
        vendor_email: 'vendor@test.com'
      }

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPO, error: null })
      }
      mockSupabase.from.mockReturnValue(mockFrom as any)

      const { sendPurchaseOrderEmail } = require('@/app/lib/email-service')
      sendPurchaseOrderEmail.mockRejectedValue(new Error('Email service down'))

      const request = new NextRequest('http://localhost:3000/api/purchase-orders/po-1/send', {
        method: 'POST'
      })
      const response = await sendPO(request, { params: { id: 'po-1' } })

      expect(response.status).toBe(500)
    })
  })

  describe('GET /api/purchase-orders/[id]/export - Export as PDF', () => {
    test('should generate PDF for purchase order', async () => {
      const mockPO = {
        id: 'po-1',
        po_number: 'PO-2024-000001',
        vendor_name: 'Test Vendor',
        items: [
          { sku: 'TEST-001', product_name: 'Test Product', quantity: 100, unit_cost: 10 }
        ],
        total_amount: 1000
      }

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPO, error: null })
      }
      mockSupabase.from.mockReturnValue(mockFrom as any)

      // Mock PDF generator
      const { generatePOPDF } = require('@/app/lib/pdf-generator')
      generatePOPDF.mockResolvedValue(Buffer.from('PDF content'))

      const request = new NextRequest('http://localhost:3000/api/purchase-orders/po-1/export')
      const response = await exportPO(request, { params: { id: 'po-1' } })

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('application/pdf')
      expect(response.headers.get('content-disposition')).toContain('PO-2024-000001.pdf')
    })

    test('should measure PDF generation performance', async () => {
      const mockPO = {
        id: 'po-1',
        po_number: 'PO-2024-000001',
        items: Array.from({ length: 50 }, (_, i) => ({
          sku: `TEST-${i}`,
          product_name: `Product ${i}`,
          quantity: 10,
          unit_cost: 20
        }))
      }

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPO, error: null })
      }
      mockSupabase.from.mockReturnValue(mockFrom as any)

      const { generatePOPDF } = require('@/app/lib/pdf-generator')
      
      // Simulate PDF generation with delay
      generatePOPDF.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(Buffer.from('PDF')), 500))
      )

      const startTime = Date.now()
      const request = new NextRequest('http://localhost:3000/api/purchase-orders/po-1/export')
      await exportPO(request, { params: { id: 'po-1' } })
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(2000) // Must be < 2 seconds
    })
  })

  describe('POST /api/purchase-orders/generate - Auto-generate POs', () => {
    test('should generate POs from suggestions', async () => {
      const mockSuggestions = [
        {
          vendor_id: 'vendor-1',
          vendor_name: 'Vendor 1',
          items: [
            { sku: 'LOW-001', quantity: 100, unit_cost: 10 }
          ],
          total_amount: 1000,
          urgency_level: 'critical'
        }
      ]

      // Mock POGenerationService
      const POGenerationService = require('@/app/lib/po-generation-service').default
      POGenerationService.prototype.generatePOSuggestions = jest.fn().mockResolvedValue(mockSuggestions)
      POGenerationService.prototype.createPurchaseOrder = jest.fn().mockResolvedValue({
        id: 'new-po-1',
        po_number: 'PO-2024-000001'
      })

      const request = new NextRequest('http://localhost:3000/api/purchase-orders/generate', {
        method: 'POST',
        body: JSON.stringify({ auto_approve: false })
      })
      const response = await generatePOs(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.created).toBe(1)
      expect(data.data.purchase_orders).toHaveLength(1)
    })

    test('should auto-approve if requested', async () => {
      const mockSuggestions = [
        {
          vendor_id: 'vendor-1',
          vendor_name: 'Vendor 1',
          items: [],
          total_amount: 1000,
          urgency_level: 'high'
        }
      ]

      const POGenerationService = require('@/app/lib/po-generation-service').default
      POGenerationService.prototype.generatePOSuggestions = jest.fn().mockResolvedValue(mockSuggestions)
      POGenerationService.prototype.createPurchaseOrder = jest.fn().mockResolvedValue({
        id: 'new-po-1',
        po_number: 'PO-2024-000001'
      })

      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { id: 'new-po-1', status: 'approved' }, 
          error: null 
        })
      }
      mockSupabase.from.mockReturnValue(mockFrom as any)

      const request = new NextRequest('http://localhost:3000/api/purchase-orders/generate', {
        method: 'POST',
        body: JSON.stringify({ auto_approve: true })
      })
      const response = await generatePOs(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockFrom.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved'
        })
      )
    })
  })

  describe('Performance Tests', () => {
    test('should handle 100+ POs efficiently', async () => {
      const mockPOs = Array.from({ length: 100 }, (_, i) => ({
        id: `po-${i}`,
        po_number: `PO-2024-${i.toString().padStart(6, '0')}`,
        vendor_name: `Vendor ${i % 10}`,
        status: 'pending',
        total_amount: 1000 + i * 100,
        items: Array.from({ length: 10 }, (_, j) => ({
          sku: `SKU-${i}-${j}`,
          quantity: 10,
          unit_cost: 10
        }))
      }))

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ 
          data: mockPOs, 
          error: null,
          count: 100 
        })
      }
      mockSupabase.from.mockReturnValue(mockFrom as any)

      const startTime = Date.now()
      const request = new NextRequest('http://localhost:3000/api/purchase-orders?limit=100')
      const response = await listPOs(request)
      const endTime = Date.now()

      expect(response.status).toBe(200)
      expect(endTime - startTime).toBeLessThan(200) // Should respond in < 200ms
    })

    test('should handle concurrent requests', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ 
          data: [], 
          error: null,
          count: 0 
        })
      }
      mockSupabase.from.mockReturnValue(mockFrom as any)

      const requests = Array.from({ length: 10 }, () => 
        new NextRequest('http://localhost:3000/api/purchase-orders')
      )

      const startTime = Date.now()
      const responses = await Promise.all(requests.map(req => listPOs(req)))
      const endTime = Date.now()

      expect(responses.every(r => r.status === 200)).toBe(true)
      expect(endTime - startTime).toBeLessThan(500) // Concurrent requests in < 500ms
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/purchase-orders', {
        method: 'POST',
        body: 'invalid json'
      })
      const response = await createPO(request)

      expect(response.status).toBe(400)
    })

    test('should handle missing vendor email for send', async () => {
      const mockPO = {
        id: 'po-1',
        status: 'approved',
        vendor_name: 'Test Vendor'
        // Missing vendor_email
      }

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPO, error: null })
      }
      mockSupabase.from.mockReturnValue(mockFrom as any)

      const request = new NextRequest('http://localhost:3000/api/purchase-orders/po-1/send', {
        method: 'POST'
      })
      const response = await sendPO(request, { params: { id: 'po-1' } })

      expect(response.status).toBe(400)
    })

    test('should validate PO status transitions', async () => {
      const mockPO = {
        id: 'po-1',
        status: 'received' // Final status
      }

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPO, error: null })
      }
      mockSupabase.from.mockReturnValue(mockFrom as any)

      const request = new NextRequest('http://localhost:3000/api/purchase-orders/po-1/approve', {
        method: 'POST'
      })
      const response = await approvePO(request, { params: { id: 'po-1' } })

      expect(response.status).toBe(400)
    })
  })
})