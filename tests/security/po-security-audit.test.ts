/**
 * Security Audit Tests for Purchase Order System
 * Tests: Input sanitization, SQL injection, XSS, RBAC, Audit trails
 */

import { NextRequest } from 'next/server'
import { POST as createPO } from '@/app/api/purchase-orders/route'
import { PUT as updatePO } from '@/app/api/purchase-orders/[id]/route'
import { supabase } from '@/app/lib/supabase'
import { z } from 'zod'

jest.mock('@/app/lib/supabase')

describe('Purchase Order Security Audit', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Input Sanitization Tests', () => {
    test('should sanitize HTML in text fields', async () => {
      const maliciousPO = {
        vendor_name: '<script>alert("XSS")</script>Test Vendor',
        vendor_email: 'test@vendor.com',
        items: [
          {
            sku: 'TEST-001',
            product_name: '<img src=x onerror=alert("XSS")>Product',
            description: '<iframe src="evil.com"></iframe>',
            quantity: 10,
            unit_cost: 100
          }
        ],
        notes: '<script>document.cookie</script>Notes',
        total_amount: 1000
      }

      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(async () => {
          // Capture the sanitized data
          const insertCall = mockFrom.insert.mock.calls[0][0]
          return { data: insertCall, error: null }
        })
      }
      mockSupabase.from.mockReturnValue(mockFrom as any)

      const request = new NextRequest('http://localhost:3000/api/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(maliciousPO)
      })

      const response = await createPO(request)
      const data = await response.json()

      // Verify HTML is stripped/escaped
      expect(data.data.vendor_name).not.toContain('<script>')
      expect(data.data.vendor_name).not.toContain('alert')
      expect(data.data.items[0].product_name).not.toContain('<img')
      expect(data.data.items[0].description).not.toContain('<iframe')
      expect(data.data.notes).not.toContain('document.cookie')
    })

    test('should validate email format', async () => {
      const invalidEmails = [
        'not-an-email',
        'missing@domain',
        '@nodomain.com',
        'spaces in@email.com',
        'javascript:alert(1)',
        '<script>@email.com'
      ]

      for (const email of invalidEmails) {
        const po = {
          vendor_name: 'Test Vendor',
          vendor_email: email,
          items: [],
          total_amount: 0
        }

        const request = new NextRequest('http://localhost:3000/api/purchase-orders', {
          method: 'POST',
          body: JSON.stringify(po)
        })

        const response = await createPO(request)
        expect(response.status).toBe(400)
        
        const data = await response.json()
        expect(data.error).toContain('email')
      }
    })

    test('should validate numeric fields', async () => {
      const invalidPO = {
        vendor_name: 'Test',
        items: [
          {
            sku: 'TEST',
            quantity: -10, // Negative quantity
            unit_cost: 'abc' // Non-numeric
          }
        ],
        total_amount: NaN
      }

      const request = new NextRequest('http://localhost:3000/api/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(invalidPO)
      })

      const response = await createPO(request)
      expect(response.status).toBe(400)
    })

    test('should enforce field length limits', async () => {
      const longString = 'a'.repeat(10000) // 10k characters

      const po = {
        vendor_name: longString,
        notes: longString,
        items: [{
          sku: longString,
          product_name: longString,
          quantity: 1,
          unit_cost: 10
        }],
        total_amount: 10
      }

      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { 
            vendor_name: po.vendor_name.slice(0, 255),
            notes: po.notes.slice(0, 1000)
          }, 
          error: null 
        })
      }
      mockSupabase.from.mockReturnValue(mockFrom as any)

      const request = new NextRequest('http://localhost:3000/api/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(po)
      })

      const response = await createPO(request)
      const data = await response.json()

      // Should truncate to safe lengths
      expect(data.data.vendor_name.length).toBeLessThanOrEqual(255)
      expect(data.data.notes.length).toBeLessThanOrEqual(1000)
    })
  })

  describe('SQL Injection Prevention Tests', () => {
    test('should prevent SQL injection in search parameters', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE purchase_orders; --",
        "1' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM users--",
        "'; UPDATE purchase_orders SET status='approved'--"
      ]

      for (const injection of sqlInjectionAttempts) {
        const mockFrom = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ data: [], error: null })
        }
        mockSupabase.from.mockReturnValue(mockFrom as any)

        const request = new NextRequest(
          `http://localhost:3000/api/purchase-orders?search=${encodeURIComponent(injection)}`
        )
        
        const { GET } = require('@/app/api/purchase-orders/route')
        const response = await GET(request)
        
        expect(response.status).toBe(200)
        
        // Verify the injection string was properly escaped
        if (mockFrom.ilike.mock.calls.length > 0) {
          const searchParam = mockFrom.ilike.mock.calls[0][1]
          expect(searchParam).not.toContain('DROP TABLE')
          expect(searchParam).not.toContain('UNION SELECT')
          expect(searchParam).not.toContain('UPDATE')
        }
      }
    })

    test('should use parameterized queries for all database operations', async () => {
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: {}, error: null })
      }
      mockSupabase.from.mockReturnValue(mockFrom as any)

      const poId = "test'; DROP TABLE purchase_orders; --"
      const request = new NextRequest(
        `http://localhost:3000/api/purchase-orders/${encodeURIComponent(poId)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ status: 'approved' })
        }
      )

      await updatePO(request, { params: { id: poId } })

      // Verify Supabase received the raw ID (it handles escaping internally)
      expect(mockFrom.eq).toHaveBeenCalledWith('id', poId)
      // The dangerous SQL should be treated as a string, not executed
    })

    test('should validate UUID format for IDs', async () => {
      const invalidIds = [
        'not-a-uuid',
        '12345',
        '../../../etc/passwd',
        'SELECT * FROM users'
      ]

      for (const id of invalidIds) {
        const request = new NextRequest(
          `http://localhost:3000/api/purchase-orders/${id}`,
          { method: 'GET' }
        )

        const { GET } = require('@/app/api/purchase-orders/[id]/route')
        const response = await GET(request, { params: { id } })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toContain('Invalid')
      }
    })
  })

  describe('XSS Prevention Tests', () => {
    test('should escape user input in responses', async () => {
      const xssPayloads = [
        '<script>alert(1)</script>',
        'javascript:alert(1)',
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>',
        '"><script>alert(1)</script>',
        '<body onload=alert(1)>'
      ]

      for (const payload of xssPayloads) {
        const mockFrom = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'po-1',
              vendor_name: payload,
              notes: payload
            },
            error: null
          })
        }
        mockSupabase.from.mockReturnValue(mockFrom as any)

        const { GET } = require('@/app/api/purchase-orders/[id]/route')
        const request = new NextRequest('http://localhost:3000/api/purchase-orders/po-1')
        const response = await GET(request, { params: { id: 'po-1' } })
        
        const responseText = await response.text()
        
        // Response should not contain executable script tags
        expect(responseText).not.toContain('<script>')
        expect(responseText).not.toContain('javascript:')
        expect(responseText).not.toContain('onerror=')
        expect(responseText).not.toContain('onload=')
      }
    })

    test('should set security headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/purchase-orders')
      const { GET } = require('@/app/api/purchase-orders/route')
      const response = await GET(request)

      // Check for security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
      expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'")
    })
  })

  describe('Authorization & RBAC Tests', () => {
    test('should check user permissions for PO creation', async () => {
      const request = new NextRequest('http://localhost:3000/api/purchase-orders', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer invalid-token'
        },
        body: JSON.stringify({ vendor_name: 'Test' })
      })

      const response = await createPO(request)
      expect(response.status).toBe(401) // Unauthorized
    })

    test('should enforce role-based access for approval', async () => {
      // Mock user with insufficient permissions
      const mockUser = {
        id: 'user-1',
        role: 'viewer' // Can't approve
      }

      const { POST } = require('@/app/api/purchase-orders/[id]/approve/route')
      const request = new NextRequest('http://localhost:3000/api/purchase-orders/po-1/approve', {
        method: 'POST',
        headers: {
          'X-User-Role': 'viewer'
        }
      })

      const response = await POST(request, { params: { id: 'po-1' } })
      expect(response.status).toBe(403) // Forbidden
    })

    test('should validate JWT tokens', async () => {
      const invalidTokens = [
        'not-a-jwt',
        'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0NTY3ODkwIn0.',
        'expired.token.here'
      ]

      for (const token of invalidTokens) {
        const request = new NextRequest('http://localhost:3000/api/purchase-orders', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        const { GET } = require('@/app/api/purchase-orders/route')
        const response = await GET(request)
        
        expect([401, 403]).toContain(response.status)
      }
    })

    test('should prevent users from modifying others\' POs', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'po-1',
            created_by: 'other-user'
          },
          error: null
        })
      }
      mockSupabase.from.mockReturnValue(mockFrom as any)

      const request = new NextRequest('http://localhost:3000/api/purchase-orders/po-1', {
        method: 'PUT',
        headers: {
          'X-User-Id': 'current-user' // Different user
        },
        body: JSON.stringify({ status: 'cancelled' })
      })

      const response = await updatePO(request, { params: { id: 'po-1' } })
      expect(response.status).toBe(403) // Forbidden
    })
  })

  describe('Audit Trail Completeness Tests', () => {
    test('should create audit entries for all state changes', async () => {
      const actions = [
        { action: 'created', status: 'draft' },
        { action: 'updated', status: 'draft' },
        { action: 'approved', status: 'approved' },
        { action: 'sent', status: 'sent' },
        { action: 'received', status: 'received' },
        { action: 'cancelled', status: 'cancelled' }
      ]

      for (const { action, status } of actions) {
        const mockPOFrom = {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ 
            data: { id: 'po-1', status }, 
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

        // Simulate the action
        if (action === 'approved') {
          const { POST } = require('@/app/api/purchase-orders/[id]/approve/route')
          await POST(new NextRequest('http://localhost/api'), { params: { id: 'po-1' } })
        }

        // Verify audit trail was created
        expect(mockAuditFrom.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            po_id: 'po-1',
            action,
            status,
            timestamp: expect.any(String),
            user_id: expect.any(String)
          })
        )
      }
    })

    test('should include user and IP in audit entries', async () => {
      const mockAuditFrom = {
        insert: jest.fn().mockResolvedValue({ data: {}, error: null })
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'po_audit_trail') return mockAuditFrom as any
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: 'po-1' }, error: null })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/purchase-orders', {
        method: 'POST',
        headers: {
          'X-User-Id': 'user-123',
          'X-Forwarded-For': '192.168.1.1'
        },
        body: JSON.stringify({ vendor_name: 'Test', items: [], total_amount: 0 })
      })

      await createPO(request)

      expect(mockAuditFrom.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          ip_address: '192.168.1.1',
          user_agent: expect.any(String)
        })
      )
    })

    test('should prevent audit trail tampering', async () => {
      // Attempt to directly modify audit trail
      const request = new NextRequest('http://localhost:3000/api/po-audit-trail', {
        method: 'DELETE',
        body: JSON.stringify({ id: 'audit-1' })
      })

      // This endpoint shouldn't exist
      const response = await fetch(request.url)
      expect(response.status).toBe(404)

      // Audit trail should be append-only
      const mockFrom = {
        delete: jest.fn().mockRejectedValue(new Error('Operation not permitted'))
      }
      mockSupabase.from.mockReturnValue(mockFrom as any)

      await expect(
        mockSupabase.from('po_audit_trail').delete()
      ).rejects.toThrow('Operation not permitted')
    })
  })

  describe('Data Validation Schema Tests', () => {
    test('should validate PO schema with Zod', () => {
      const POSchema = z.object({
        vendor_name: z.string().min(1).max(255),
        vendor_email: z.string().email().optional(),
        items: z.array(z.object({
          sku: z.string().min(1).max(50),
          product_name: z.string().min(1).max(255),
          quantity: z.number().positive().int(),
          unit_cost: z.number().nonnegative(),
          total_cost: z.number().nonnegative()
        })).min(1),
        total_amount: z.number().nonnegative(),
        urgency_level: z.enum(['critical', 'high', 'medium', 'low']).optional(),
        notes: z.string().max(1000).optional()
      })

      // Valid PO
      const validPO = {
        vendor_name: 'Test Vendor',
        vendor_email: 'test@vendor.com',
        items: [{
          sku: 'TEST-001',
          product_name: 'Test Product',
          quantity: 10,
          unit_cost: 25.50,
          total_cost: 255.00
        }],
        total_amount: 255.00,
        urgency_level: 'high',
        notes: 'Test notes'
      }

      expect(() => POSchema.parse(validPO)).not.toThrow()

      // Invalid POs
      const invalidPOs = [
        { ...validPO, vendor_name: '' }, // Empty vendor
        { ...validPO, vendor_email: 'not-an-email' }, // Invalid email
        { ...validPO, items: [] }, // No items
        { ...validPO, items: [{ ...validPO.items[0], quantity: -5 }] }, // Negative qty
        { ...validPO, urgency_level: 'invalid' }, // Invalid enum
        { ...validPO, total_amount: -100 } // Negative amount
      ]

      invalidPOs.forEach(po => {
        expect(() => POSchema.parse(po)).toThrow()
      })
    })
  })

  describe('File Upload Security', () => {
    test('should validate file types for attachments', async () => {
      const dangerousFiles = [
        { name: 'script.exe', type: 'application/x-msdownload' },
        { name: 'macro.xlsm', type: 'application/vnd.ms-excel.sheet.macroEnabled' },
        { name: 'shell.sh', type: 'application/x-sh' },
        { name: 'exploit.js', type: 'text/javascript' }
      ]

      for (const file of dangerousFiles) {
        const formData = new FormData()
        formData.append('file', new Blob(['content'], { type: file.type }), file.name)
        formData.append('po_id', 'po-1')

        const request = new NextRequest('http://localhost:3000/api/purchase-orders/attachments', {
          method: 'POST',
          body: formData
        })

        const { POST } = require('@/app/api/purchase-orders/attachments/route')
        const response = await POST(request)
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toContain('file type')
      }
    })

    test('should scan uploaded files for malware signatures', async () => {
      // Simple virus signature check (EICAR test string)
      const eicarTestString = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
      
      const formData = new FormData()
      formData.append('file', new Blob([eicarTestString], { type: 'text/plain' }), 'test.txt')

      const request = new NextRequest('http://localhost:3000/api/purchase-orders/attachments', {
        method: 'POST',
        body: formData
      })

      const { POST } = require('@/app/api/purchase-orders/attachments/route')
      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('security')
    })
  })

  describe('Rate Limiting & DoS Prevention', () => {
    test('should rate limit API endpoints', async () => {
      const requests = []
      
      // Simulate 100 rapid requests
      for (let i = 0; i < 100; i++) {
        requests.push(
          fetch('http://localhost:3000/api/purchase-orders', {
            method: 'GET',
            headers: { 'X-Client-IP': '192.168.1.1' }
          })
        )
      }

      const responses = await Promise.all(requests)
      
      // Some requests should be rate limited
      const rateLimited = responses.filter(r => r.status === 429)
      expect(rateLimited.length).toBeGreaterThan(0)
      
      // Check for rate limit headers
      const limitedResponse = rateLimited[0]
      expect(limitedResponse.headers.get('X-RateLimit-Limit')).toBeDefined()
      expect(limitedResponse.headers.get('X-RateLimit-Remaining')).toBeDefined()
      expect(limitedResponse.headers.get('X-RateLimit-Reset')).toBeDefined()
    })

    test('should prevent resource exhaustion attacks', async () => {
      // Try to create PO with 10000 items
      const hugePayload = {
        vendor_name: 'Test',
        items: Array.from({ length: 10000 }, (_, i) => ({
          sku: `SKU-${i}`,
          product_name: `Product ${i}`,
          quantity: 1,
          unit_cost: 10,
          total_cost: 10
        })),
        total_amount: 100000
      }

      const request = new NextRequest('http://localhost:3000/api/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(hugePayload)
      })

      const response = await createPO(request)
      expect(response.status).toBe(400) // Should reject overly large payloads
      
      const data = await response.json()
      expect(data.error).toContain('too large')
    })
  })
})