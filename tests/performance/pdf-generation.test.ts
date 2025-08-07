/**
 * Performance Tests for PDF Generation
 * Requirement: PDF generation must complete in < 2 seconds
 */

import { generatePOPDF } from '@/app/lib/pdf-generator'
import { performance } from 'perf_hooks'

describe('PDF Generation Performance Tests', () => {
  const mockPurchaseOrder = {
    id: 'po-test-1',
    po_number: 'PO-2024-000001',
    vendor_name: 'Test Vendor Inc.',
    vendor_address: '123 Main St, City, State 12345',
    vendor_email: 'vendor@test.com',
    vendor_phone: '555-0100',
    ship_to_address: '456 Warehouse Rd, City, State 67890',
    created_at: new Date().toISOString(),
    delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    payment_terms: 'Net 30',
    shipping_method: 'Ground',
    notes: 'Please deliver to loading dock B',
    items: [],
    subtotal: 0,
    tax_amount: 0,
    shipping_cost: 0,
    total_amount: 0
  }

  describe('Single Item PO Performance', () => {
    test('should generate PDF with 1 item in < 500ms', async () => {
      const po = {
        ...mockPurchaseOrder,
        items: [
          {
            sku: 'TEST-001',
            product_name: 'Test Product',
            description: 'High quality test product for testing',
            quantity: 100,
            unit_cost: 25.99,
            total_cost: 2599.00
          }
        ],
        subtotal: 2599.00,
        tax_amount: 207.92,
        total_amount: 2806.92
      }

      const startTime = performance.now()
      const pdfBuffer = await generatePOPDF(po)
      const endTime = performance.now()
      const duration = endTime - startTime

      expect(pdfBuffer).toBeInstanceOf(Buffer)
      expect(pdfBuffer.length).toBeGreaterThan(1000) // PDF should have content
      expect(duration).toBeLessThan(500) // Should complete in < 500ms
    })
  })

  describe('Standard PO Performance (10-20 items)', () => {
    test('should generate PDF with 10 items in < 1 second', async () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        sku: `TEST-${i.toString().padStart(3, '0')}`,
        product_name: `Test Product ${i}`,
        description: `Description for product ${i}`,
        quantity: 10 + i * 5,
        unit_cost: 10.00 + i * 2.50,
        total_cost: (10 + i * 5) * (10.00 + i * 2.50)
      }))

      const subtotal = items.reduce((sum, item) => sum + item.total_cost, 0)
      const po = {
        ...mockPurchaseOrder,
        items,
        subtotal,
        tax_amount: subtotal * 0.08,
        total_amount: subtotal * 1.08
      }

      const startTime = performance.now()
      const pdfBuffer = await generatePOPDF(po)
      const endTime = performance.now()
      const duration = endTime - startTime

      expect(pdfBuffer).toBeInstanceOf(Buffer)
      expect(duration).toBeLessThan(1000) // Should complete in < 1 second
    })

    test('should generate PDF with 20 items in < 1.5 seconds', async () => {
      const items = Array.from({ length: 20 }, (_, i) => ({
        sku: `PROD-${i.toString().padStart(4, '0')}`,
        product_name: `Product Name ${i}`,
        description: `Detailed description for product ${i} with specifications`,
        quantity: Math.floor(Math.random() * 100) + 1,
        unit_cost: Math.random() * 100,
        total_cost: 0 // Will calculate
      }))

      items.forEach(item => {
        item.total_cost = item.quantity * item.unit_cost
      })

      const subtotal = items.reduce((sum, item) => sum + item.total_cost, 0)
      const po = {
        ...mockPurchaseOrder,
        items,
        subtotal,
        tax_amount: subtotal * 0.08,
        total_amount: subtotal * 1.08
      }

      const startTime = performance.now()
      const pdfBuffer = await generatePOPDF(po)
      const endTime = performance.now()
      const duration = endTime - startTime

      expect(pdfBuffer).toBeInstanceOf(Buffer)
      expect(duration).toBeLessThan(1500) // Should complete in < 1.5 seconds
    })
  })

  describe('Large PO Performance (50+ items)', () => {
    test('should generate PDF with 50 items in < 2 seconds', async () => {
      const items = Array.from({ length: 50 }, (_, i) => ({
        sku: `BULK-${i.toString().padStart(5, '0')}`,
        product_name: `Bulk Product ${i}`,
        description: `Extended description for bulk product ${i} including all specifications and requirements`,
        quantity: Math.floor(Math.random() * 500) + 10,
        unit_cost: Math.random() * 200,
        total_cost: 0
      }))

      items.forEach(item => {
        item.total_cost = item.quantity * item.unit_cost
      })

      const subtotal = items.reduce((sum, item) => sum + item.total_cost, 0)
      const po = {
        ...mockPurchaseOrder,
        vendor_notes: 'Large order - please confirm availability',
        special_instructions: 'Ship in multiple containers if necessary',
        items,
        subtotal,
        tax_amount: subtotal * 0.08,
        shipping_cost: 250.00,
        total_amount: subtotal * 1.08 + 250.00
      }

      const startTime = performance.now()
      const pdfBuffer = await generatePOPDF(po)
      const endTime = performance.now()
      const duration = endTime - startTime

      expect(pdfBuffer).toBeInstanceOf(Buffer)
      expect(duration).toBeLessThan(2000) // MUST complete in < 2 seconds
      
      // Verify PDF is properly paginated
      expect(pdfBuffer.length).toBeGreaterThan(10000) // Large PDF
    })

    test('should handle 100 items efficiently', async () => {
      const items = Array.from({ length: 100 }, (_, i) => ({
        sku: `MEGA-${i.toString().padStart(6, '0')}`,
        product_name: `Mega Product ${i}`,
        description: `Description ${i}`,
        quantity: 10,
        unit_cost: 10.00,
        total_cost: 100.00
      }))

      const po = {
        ...mockPurchaseOrder,
        items,
        subtotal: 10000.00,
        tax_amount: 800.00,
        total_amount: 10800.00
      }

      const startTime = performance.now()
      const pdfBuffer = await generatePOPDF(po)
      const endTime = performance.now()
      const duration = endTime - startTime

      expect(pdfBuffer).toBeInstanceOf(Buffer)
      expect(duration).toBeLessThan(3000) // Should still be reasonably fast
    })
  })

  describe('Concurrent PDF Generation', () => {
    test('should handle 5 concurrent PDF generations', async () => {
      const createPO = (id: number) => ({
        ...mockPurchaseOrder,
        po_number: `PO-2024-${id.toString().padStart(6, '0')}`,
        items: Array.from({ length: 10 }, (_, i) => ({
          sku: `CONC-${id}-${i}`,
          product_name: `Concurrent Product ${i}`,
          quantity: 10,
          unit_cost: 25.00,
          total_cost: 250.00
        })),
        total_amount: 2500.00
      })

      const startTime = performance.now()
      const pdfPromises = Array.from({ length: 5 }, (_, i) => 
        generatePOPDF(createPO(i))
      )
      
      const pdfs = await Promise.all(pdfPromises)
      const endTime = performance.now()
      const duration = endTime - startTime

      expect(pdfs).toHaveLength(5)
      pdfs.forEach(pdf => {
        expect(pdf).toBeInstanceOf(Buffer)
        expect(pdf.length).toBeGreaterThan(1000)
      })
      
      // All 5 PDFs should generate in < 3 seconds total
      expect(duration).toBeLessThan(3000)
      
      // Average time per PDF should still be < 2 seconds
      const avgTime = duration / 5
      expect(avgTime).toBeLessThan(2000)
    })

    test('should handle 10 concurrent PDF generations without memory issues', async () => {
      const createPO = (id: number) => ({
        ...mockPurchaseOrder,
        po_number: `PO-STRESS-${id}`,
        items: Array.from({ length: 20 }, (_, i) => ({
          sku: `STRESS-${id}-${i}`,
          product_name: `Stress Test Product ${i}`,
          quantity: 50,
          unit_cost: 15.00,
          total_cost: 750.00
        })),
        total_amount: 15000.00
      })

      // Monitor memory usage
      const memBefore = process.memoryUsage().heapUsed

      const pdfPromises = Array.from({ length: 10 }, (_, i) => 
        generatePOPDF(createPO(i))
      )
      
      const pdfs = await Promise.all(pdfPromises)
      
      const memAfter = process.memoryUsage().heapUsed
      const memIncrease = (memAfter - memBefore) / 1024 / 1024 // Convert to MB

      expect(pdfs).toHaveLength(10)
      // Memory increase should be reasonable (< 100MB for 10 PDFs)
      expect(memIncrease).toBeLessThan(100)
    })
  })

  describe('Complex Content Performance', () => {
    test('should handle long product descriptions efficiently', async () => {
      const longDescription = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(10)
      
      const items = Array.from({ length: 20 }, (_, i) => ({
        sku: `LONG-${i}`,
        product_name: `Product with Long Description ${i}`,
        description: longDescription,
        specifications: `Spec 1: Value\nSpec 2: Value\nSpec 3: Value`,
        quantity: 25,
        unit_cost: 50.00,
        total_cost: 1250.00
      }))

      const po = {
        ...mockPurchaseOrder,
        items,
        notes: longDescription,
        special_instructions: longDescription,
        total_amount: 25000.00
      }

      const startTime = performance.now()
      const pdfBuffer = await generatePOPDF(po)
      const endTime = performance.now()
      const duration = endTime - startTime

      expect(pdfBuffer).toBeInstanceOf(Buffer)
      expect(duration).toBeLessThan(2000) // Still < 2 seconds with complex content
    })

    test('should handle special characters and Unicode', async () => {
      const items = [
        {
          sku: 'UNICODE-001',
          product_name: 'Produit Français™',
          description: 'Descripción en Español: ñáéíóú',
          quantity: 10,
          unit_cost: 25.50,
          total_cost: 255.00
        },
        {
          sku: 'UNICODE-002',
          product_name: '日本製品 (Japanese Product)',
          description: 'Contains special chars: €£¥₹',
          quantity: 5,
          unit_cost: 100.00,
          total_cost: 500.00
        },
        {
          sku: 'UNICODE-003',
          product_name: 'Product with Emoji 🚀',
          description: 'Mathematical symbols: ∑∏∫√∞',
          quantity: 15,
          unit_cost: 30.00,
          total_cost: 450.00
        }
      ]

      const po = {
        ...mockPurchaseOrder,
        vendor_name: 'International Vendor GmbH',
        items,
        total_amount: 1205.00
      }

      const startTime = performance.now()
      const pdfBuffer = await generatePOPDF(po)
      const endTime = performance.now()
      const duration = endTime - startTime

      expect(pdfBuffer).toBeInstanceOf(Buffer)
      expect(duration).toBeLessThan(1000) // Fast even with Unicode
    })
  })

  describe('Memory and Resource Management', () => {
    test('should not leak memory after multiple generations', async () => {
      const po = {
        ...mockPurchaseOrder,
        items: Array.from({ length: 10 }, (_, i) => ({
          sku: `MEM-${i}`,
          product_name: `Memory Test Product ${i}`,
          quantity: 10,
          unit_cost: 10.00,
          total_cost: 100.00
        }))
      }

      // Force garbage collection if available
      if (global.gc) global.gc()
      
      const memStart = process.memoryUsage().heapUsed

      // Generate 20 PDFs sequentially
      for (let i = 0; i < 20; i++) {
        const pdf = await generatePOPDF({ ...po, po_number: `PO-MEM-${i}` })
        expect(pdf).toBeInstanceOf(Buffer)
      }

      // Force garbage collection if available
      if (global.gc) global.gc()
      
      const memEnd = process.memoryUsage().heapUsed
      const memIncrease = (memEnd - memStart) / 1024 / 1024 // MB

      // Memory increase should be minimal (< 50MB) after 20 generations
      expect(memIncrease).toBeLessThan(50)
    })

    test('should handle errors gracefully without performance degradation', async () => {
      const invalidPO = {
        ...mockPurchaseOrder,
        items: null as any, // Invalid items
        total_amount: 'invalid' as any // Invalid amount
      }

      const startTime = performance.now()
      
      await expect(generatePOPDF(invalidPO)).rejects.toThrow()
      
      const endTime = performance.now()
      const duration = endTime - startTime

      // Error should be thrown quickly
      expect(duration).toBeLessThan(100)
    })
  })

  describe('Optimization Benchmarks', () => {
    test('should progressively optimize with caching', async () => {
      const po = {
        ...mockPurchaseOrder,
        items: Array.from({ length: 15 }, (_, i) => ({
          sku: `CACHE-${i}`,
          product_name: `Cached Product ${i}`,
          quantity: 20,
          unit_cost: 35.00,
          total_cost: 700.00
        }))
      }

      const times: number[] = []

      // Generate same PO structure 5 times
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now()
        await generatePOPDF({ ...po, po_number: `PO-CACHE-${i}` })
        const endTime = performance.now()
        times.push(endTime - startTime)
      }

      // Later generations should be faster due to internal optimizations
      const firstTime = times[0]
      const lastTime = times[times.length - 1]
      
      // Last generation should be at least 10% faster than first
      expect(lastTime).toBeLessThan(firstTime * 0.9)
      
      // All generations should still be < 2 seconds
      times.forEach(time => {
        expect(time).toBeLessThan(2000)
      })
    })
  })
})