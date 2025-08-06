import { describe, it, expect } from '@jest/globals'
import {
  inventoryFilterSchema,
  inventoryUpdateSchema,
  purchaseOrderSchema,
  settingsUpdateSchema,
  syncRequestSchema,
  vendorCreateSchema,
  paginationSchema,
  safeSearchSchema
} from '../validation-schemas'

describe('Validation Schemas', () => {
  describe('inventoryFilterSchema', () => {
    it('should accept valid filter parameters', () => {
      const validFilter = {
        status: 'critical',
        vendor: 'Test Vendor',
        location: 'Main Warehouse',
        search: 'test product',
        minStock: 10,
        maxStock: 100,
        minPrice: 5.99,
        maxPrice: 99.99,
        salesVelocity: 'fast',
        page: 1,
        limit: 50,
        sortBy: 'sku',
        sortDirection: 'asc' as const
      }

      const result = inventoryFilterSchema.safeParse(validFilter)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toMatchObject(validFilter)
      }
    })

    it('should reject SQL injection attempts in search', () => {
      const maliciousFilter = {
        search: "'; DROP TABLE inventory; --"
      }

      const result = inventoryFilterSchema.safeParse(maliciousFilter)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid characters')
      }
    })

    it('should reject invalid status values', () => {
      const invalidFilter = {
        status: 'invalid_status'
      }

      const result = inventoryFilterSchema.safeParse(invalidFilter)
      expect(result.success).toBe(false)
    })

    it('should enforce numeric limits', () => {
      const invalidFilter = {
        page: -1,
        limit: 10000
      }

      const result = inventoryFilterSchema.safeParse(invalidFilter)
      expect(result.success).toBe(false)
    })

    it('should handle optional fields correctly', () => {
      const minimalFilter = {}
      const result = inventoryFilterSchema.safeParse(minimalFilter)
      expect(result.success).toBe(true)
    })
  })

  describe('inventoryUpdateSchema', () => {
    it('should accept valid inventory update data', () => {
      const validUpdate = {
        sku: 'TEST-001',
        product_name: 'Test Product',
        current_stock: 100,
        reorder_point: 20,
        reorder_quantity: 50,
        unit_cost: 9.99,
        unit_price: 19.99,
        vendor: 'Test Vendor',
        location: 'Main',
        hidden: false
      }

      const result = inventoryUpdateSchema.safeParse(validUpdate)
      expect(result.success).toBe(true)
    })

    it('should reject negative stock values', () => {
      const invalidUpdate = {
        current_stock: -10
      }

      const result = inventoryUpdateSchema.safeParse(invalidUpdate)
      expect(result.success).toBe(false)
    })

    it('should reject SQL injection in string fields', () => {
      const maliciousUpdate = {
        vendor: "'; UPDATE users SET admin=true; --"
      }

      const result = inventoryUpdateSchema.safeParse(maliciousUpdate)
      expect(result.success).toBe(false)
    })
  })

  describe('purchaseOrderSchema', () => {
    it('should accept valid purchase order data', () => {
      const validPO = {
        order_number: 'PO-2024-001',
        vendor: 'Test Vendor',
        status: 'pending',
        order_date: '2024-01-01',
        expected_date: '2024-01-15',
        items: [
          {
            sku: 'TEST-001',
            quantity: 10,
            unit_cost: 9.99
          }
        ],
        total_amount: 99.90,
        notes: 'Rush order'
      }

      const result = purchaseOrderSchema.safeParse(validPO)
      expect(result.success).toBe(true)
    })

    it('should reject invalid status values', () => {
      const invalidPO = {
        order_number: 'PO-001',
        status: 'invalid_status'
      }

      const result = purchaseOrderSchema.safeParse(invalidPO)
      expect(result.success).toBe(false)
    })

    it('should reject empty items array', () => {
      const invalidPO = {
        order_number: 'PO-001',
        items: []
      }

      const result = purchaseOrderSchema.safeParse(invalidPO)
      expect(result.success).toBe(false)
    })

    it('should validate item quantities', () => {
      const invalidPO = {
        items: [
          {
            sku: 'TEST-001',
            quantity: 0,
            unit_cost: 10
          }
        ]
      }

      const result = purchaseOrderSchema.safeParse(invalidPO)
      expect(result.success).toBe(false)
    })
  })

  describe('settingsUpdateSchema', () => {
    it('should accept valid settings', () => {
      const validSettings = {
        finale_api_key: 'test_key_123',
        finale_api_secret: 'test_secret_456',
        finale_account_path: 'testaccount',
        sendgrid_api_key: 'SG.test_key',
        alert_email: 'alerts@example.com',
        sync_enabled: true,
        sync_interval_hours: 6,
        low_stock_threshold: 10,
        critical_stock_threshold: 5
      }

      const result = settingsUpdateSchema.safeParse(validSettings)
      expect(result.success).toBe(true)
    })

    it('should validate email format', () => {
      const invalidSettings = {
        alert_email: 'not_an_email'
      }

      const result = settingsUpdateSchema.safeParse(invalidSettings)
      expect(result.success).toBe(false)
    })

    it('should validate sync interval range', () => {
      const invalidSettings = {
        sync_interval_hours: 0
      }

      const result = settingsUpdateSchema.safeParse(invalidSettings)
      expect(result.success).toBe(false)
    })

    it('should reject SQL injection in API keys', () => {
      const maliciousSettings = {
        finale_api_key: "'; DROP TABLE settings; --"
      }

      const result = settingsUpdateSchema.safeParse(maliciousSettings)
      expect(result.success).toBe(false)
    })
  })

  describe('syncRequestSchema', () => {
    it('should accept valid sync requests', () => {
      const validRequest = {
        type: 'full',
        force: true,
        year: 2024
      }

      const result = syncRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should reject invalid sync types', () => {
      const invalidRequest = {
        type: 'invalid_type'
      }

      const result = syncRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should validate year range', () => {
      const invalidRequest = {
        year: 1999
      }

      const result = syncRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })
  })

  describe('vendorCreateSchema', () => {
    it('should accept valid vendor data', () => {
      const validVendor = {
        name: 'Test Vendor Inc',
        contact_name: 'John Doe',
        email: 'vendor@example.com',
        phone: '555-1234',
        address: '123 Main St',
        city: 'Test City',
        state: 'TS',
        zip: '12345',
        country: 'USA',
        payment_terms: 'Net 30',
        tax_id: 'TAX123456',
        notes: 'Preferred vendor'
      }

      const result = vendorCreateSchema.safeParse(validVendor)
      expect(result.success).toBe(true)
    })

    it('should require vendor name', () => {
      const invalidVendor = {
        email: 'vendor@example.com'
      }

      const result = vendorCreateSchema.safeParse(invalidVendor)
      expect(result.success).toBe(false)
    })

    it('should validate email format', () => {
      const invalidVendor = {
        name: 'Test Vendor',
        email: 'invalid_email'
      }

      const result = vendorCreateSchema.safeParse(invalidVendor)
      expect(result.success).toBe(false)
    })

    it('should reject SQL injection in vendor fields', () => {
      const maliciousVendor = {
        name: "'; DELETE FROM vendors; --"
      }

      const result = vendorCreateSchema.safeParse(maliciousVendor)
      expect(result.success).toBe(false)
    })
  })

  describe('paginationSchema', () => {
    it('should accept valid pagination params', () => {
      const validPagination = {
        page: 1,
        limit: 50,
        offset: 0
      }

      const result = paginationSchema.safeParse(validPagination)
      expect(result.success).toBe(true)
    })

    it('should enforce minimum page number', () => {
      const invalidPagination = {
        page: 0
      }

      const result = paginationSchema.safeParse(invalidPagination)
      expect(result.success).toBe(false)
    })

    it('should enforce maximum limit', () => {
      const invalidPagination = {
        limit: 5000
      }

      const result = paginationSchema.safeParse(invalidPagination)
      expect(result.success).toBe(false)
    })

    it('should provide default values', () => {
      const emptyPagination = {}
      const result = paginationSchema.safeParse(emptyPagination)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(100)
      }
    })
  })

  describe('safeSearchSchema', () => {
    it('should accept valid search terms', () => {
      const validSearch = {
        query: 'test product 123',
        fields: ['sku', 'product_name']
      }

      const result = safeSearchSchema.safeParse(validSearch)
      expect(result.success).toBe(true)
    })

    it('should reject SQL injection in search query', () => {
      const maliciousSearch = {
        query: "' OR '1'='1"
      }

      const result = safeSearchSchema.safeParse(maliciousSearch)
      expect(result.success).toBe(false)
    })

    it('should validate search fields', () => {
      const invalidSearch = {
        fields: ['invalid_field']
      }

      const result = safeSearchSchema.safeParse(invalidSearch)
      expect(result.success).toBe(false)
    })

    it('should enforce minimum query length', () => {
      const shortSearch = {
        query: 'a'
      }

      const result = safeSearchSchema.safeParse(shortSearch)
      expect(result.success).toBe(false)
    })
  })
})