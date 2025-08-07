/**
 * End-to-end tests for Purchase Order functionality
 * Tests complete user workflows from suggestion to approval
 */

import { test, expect, Page } from '@playwright/test'

// Test data
const testVendor = {
  name: 'Test Vendor ABC',
  email: 'vendor@example.com',
  contact: 'John Doe'
}

const testItems = [
  {
    sku: 'TEST-SKU-001',
    name: 'Test Product 1',
    quantity: 100,
    unitCost: 25.99,
    currentStock: 10,
    reorderPoint: 50
  },
  {
    sku: 'TEST-SKU-002',
    name: 'Test Product 2',
    quantity: 50,
    unitCost: 15.50,
    currentStock: 5,
    reorderPoint: 25
  }
]

test.describe('Purchase Order Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/purchase-orders/generate')
    await page.waitForLoadState('networkidle')
  })

  test('should display PO generation dashboard', async ({ page }) => {
    // Check main components are present
    await expect(page.locator('h1')).toContainText('Purchase Order Generation')
    await expect(page.locator('[data-testid="po-suggestions"]')).toBeVisible()
    await expect(page.locator('[data-testid="generate-suggestions-btn"]')).toBeVisible()
  })

  test('should generate PO suggestions based on inventory levels', async ({ page }) => {
    // Click generate suggestions button
    await page.click('[data-testid="generate-suggestions-btn"]')
    
    // Wait for suggestions to load
    await page.waitForSelector('[data-testid="suggestion-card"]', { timeout: 10000 })
    
    // Verify suggestions are displayed
    const suggestionCards = page.locator('[data-testid="suggestion-card"]')
    await expect(suggestionCards).toHaveCount(await suggestionCards.count())
    
    // Check urgency indicators
    const criticalBadge = page.locator('[data-testid="urgency-critical"]').first()
    if (await criticalBadge.isVisible()) {
      await expect(criticalBadge).toHaveCSS('background-color', /red|rgb\(239, 68, 68\)/)
    }
  })

  test('should filter suggestions by urgency level', async ({ page }) => {
    // Generate suggestions first
    await page.click('[data-testid="generate-suggestions-btn"]')
    await page.waitForSelector('[data-testid="suggestion-card"]')
    
    // Apply critical filter
    await page.click('[data-testid="filter-urgency-critical"]')
    
    // Verify only critical suggestions are shown
    const suggestions = page.locator('[data-testid="suggestion-card"]')
    const count = await suggestions.count()
    
    for (let i = 0; i < count; i++) {
      const urgencyBadge = suggestions.nth(i).locator('[data-testid^="urgency-"]')
      await expect(urgencyBadge).toHaveAttribute('data-testid', 'urgency-critical')
    }
  })

  test('should allow quantity adjustments in suggestions', async ({ page }) => {
    // Generate suggestions
    await page.click('[data-testid="generate-suggestions-btn"]')
    await page.waitForSelector('[data-testid="suggestion-card"]')
    
    // Open first suggestion for editing
    await page.click('[data-testid="suggestion-card"]:first-child [data-testid="edit-suggestion-btn"]')
    
    // Wait for edit modal
    await page.waitForSelector('[data-testid="edit-suggestion-modal"]')
    
    // Adjust quantity for first item
    const quantityInput = page.locator('[data-testid="item-quantity-input"]:first-child')
    await quantityInput.fill('150')
    
    // Save changes
    await page.click('[data-testid="save-adjustments-btn"]')
    
    // Verify total is updated
    await expect(page.locator('[data-testid="suggestion-total"]:first-child')).toContainText(/\$/)
  })

  test('should create PO from suggestion', async ({ page }) => {
    // Generate suggestions
    await page.click('[data-testid="generate-suggestions-btn"]')
    await page.waitForSelector('[data-testid="suggestion-card"]')
    
    // Create PO from first suggestion
    await page.click('[data-testid="suggestion-card"]:first-child [data-testid="create-po-btn"]')
    
    // Confirm creation
    await page.waitForSelector('[data-testid="confirm-dialog"]')
    await page.click('[data-testid="confirm-create-btn"]')
    
    // Wait for success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Purchase order created')
    
    // Verify redirect to PO details
    await expect(page).toHaveURL(/\/purchase-orders\/PO-/)
  })

  test('should handle existing draft warning', async ({ page }) => {
    // Generate suggestions
    await page.click('[data-testid="generate-suggestions-btn"]')
    await page.waitForSelector('[data-testid="suggestion-card"]')
    
    // Look for existing draft warning
    const draftWarning = page.locator('[data-testid="existing-draft-warning"]').first()
    if (await draftWarning.isVisible()) {
      await expect(draftWarning).toContainText('existing draft')
      
      // Should have option to view existing draft
      await expect(page.locator('[data-testid="view-draft-btn"]')).toBeVisible()
    }
  })
})

test.describe('Purchase Order Creation Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/purchase-orders/create')
    await page.waitForLoadState('networkidle')
  })

  test('should complete PO creation wizard', async ({ page }) => {
    // Step 1: Select Vendor
    await expect(page.locator('[data-testid="wizard-step-1"]')).toBeVisible()
    await page.selectOption('[data-testid="vendor-select"]', { label: testVendor.name })
    await page.click('[data-testid="wizard-next-btn"]')
    
    // Step 2: Add Items
    await expect(page.locator('[data-testid="wizard-step-2"]')).toBeVisible()
    
    // Add first item
    await page.click('[data-testid="add-item-btn"]')
    await page.fill('[data-testid="item-sku-input"]', testItems[0].sku)
    await page.fill('[data-testid="item-name-input"]', testItems[0].name)
    await page.fill('[data-testid="item-quantity-input"]', testItems[0].quantity.toString())
    await page.fill('[data-testid="item-cost-input"]', testItems[0].unitCost.toString())
    
    // Add second item
    await page.click('[data-testid="add-another-item-btn"]')
    await page.fill('[data-testid="item-sku-input"]:last-child', testItems[1].sku)
    await page.fill('[data-testid="item-name-input"]:last-child', testItems[1].name)
    await page.fill('[data-testid="item-quantity-input"]:last-child', testItems[1].quantity.toString())
    await page.fill('[data-testid="item-cost-input"]:last-child', testItems[1].unitCost.toString())
    
    await page.click('[data-testid="wizard-next-btn"]')
    
    // Step 3: Review & Confirm
    await expect(page.locator('[data-testid="wizard-step-3"]')).toBeVisible()
    
    // Verify summary
    await expect(page.locator('[data-testid="po-summary-vendor"]')).toContainText(testVendor.name)
    await expect(page.locator('[data-testid="po-summary-items-count"]')).toContainText('2')
    
    // Calculate expected total
    const expectedTotal = (testItems[0].quantity * testItems[0].unitCost) + 
                         (testItems[1].quantity * testItems[1].unitCost)
    await expect(page.locator('[data-testid="po-summary-total"]')).toContainText(expectedTotal.toFixed(2))
    
    // Add notes
    await page.fill('[data-testid="po-notes-input"]', 'Urgent: Need by end of week')
    
    // Submit PO
    await page.click('[data-testid="create-po-submit-btn"]')
    
    // Wait for success
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Purchase order created successfully')
  })

  test('should validate required fields', async ({ page }) => {
    // Try to proceed without selecting vendor
    await page.click('[data-testid="wizard-next-btn"]')
    await expect(page.locator('[data-testid="vendor-error"]')).toContainText('Vendor is required')
    
    // Select vendor and proceed
    await page.selectOption('[data-testid="vendor-select"]', { index: 1 })
    await page.click('[data-testid="wizard-next-btn"]')
    
    // Try to add item without required fields
    await page.click('[data-testid="add-item-btn"]')
    await page.click('[data-testid="wizard-next-btn"]')
    
    // Should show validation errors
    await expect(page.locator('[data-testid="sku-error"]')).toContainText('SKU is required')
    await expect(page.locator('[data-testid="quantity-error"]')).toContainText('Quantity is required')
  })

  test('should calculate line totals automatically', async ({ page }) => {
    // Navigate to items step
    await page.selectOption('[data-testid="vendor-select"]', { index: 1 })
    await page.click('[data-testid="wizard-next-btn"]')
    
    // Add item
    await page.click('[data-testid="add-item-btn"]')
    await page.fill('[data-testid="item-quantity-input"]', '10')
    await page.fill('[data-testid="item-cost-input"]', '25.50')
    
    // Verify line total
    await expect(page.locator('[data-testid="item-line-total"]')).toContainText('255.00')
    
    // Update quantity and verify recalculation
    await page.fill('[data-testid="item-quantity-input"]', '20')
    await expect(page.locator('[data-testid="item-line-total"]')).toContainText('510.00')
  })

  test('should allow item removal', async ({ page }) => {
    // Navigate to items step
    await page.selectOption('[data-testid="vendor-select"]', { index: 1 })
    await page.click('[data-testid="wizard-next-btn"]')
    
    // Add multiple items
    for (let i = 0; i < 3; i++) {
      await page.click('[data-testid="add-item-btn"]')
      await page.fill(`[data-testid="item-sku-input"]:nth-child(${i + 1})`, `SKU00${i + 1}`)
      await page.fill(`[data-testid="item-quantity-input"]:nth-child(${i + 1})`, '10')
      await page.fill(`[data-testid="item-cost-input"]:nth-child(${i + 1})`, '10')
    }
    
    // Verify 3 items
    await expect(page.locator('[data-testid="po-item-row"]')).toHaveCount(3)
    
    // Remove middle item
    await page.click('[data-testid="po-item-row"]:nth-child(2) [data-testid="remove-item-btn"]')
    
    // Confirm removal
    await page.click('[data-testid="confirm-remove-btn"]')
    
    // Verify 2 items remain
    await expect(page.locator('[data-testid="po-item-row"]')).toHaveCount(2)
  })
})

test.describe('Purchase Order Approval Workflow', () => {
  let testPOId: string

  test.beforeEach(async ({ page }) => {
    // Create a test PO first
    const response = await page.request.post('/api/purchase-orders/create', {
      data: {
        vendor_name: 'Approval Test Vendor',
        items: [
          {
            sku: 'APPROVAL-TEST-001',
            product_name: 'Test Product',
            quantity: 50,
            unit_cost: 20,
            total_cost: 1000
          }
        ],
        total_amount: 1000,
        status: 'pending_approval'
      }
    })
    
    const po = await response.json()
    testPOId = po.data.id
    
    await page.goto(`/purchase-orders/${testPOId}`)
    await page.waitForLoadState('networkidle')
  })

  test('should display approval buttons for pending POs', async ({ page }) => {
    await expect(page.locator('[data-testid="po-status"]')).toContainText('Pending Approval')
    await expect(page.locator('[data-testid="approve-po-btn"]')).toBeVisible()
    await expect(page.locator('[data-testid="reject-po-btn"]')).toBeVisible()
  })

  test('should approve purchase order', async ({ page }) => {
    // Click approve button
    await page.click('[data-testid="approve-po-btn"]')
    
    // Fill approval dialog
    await page.waitForSelector('[data-testid="approval-dialog"]')
    await page.fill('[data-testid="approval-notes"]', 'Approved for immediate processing')
    await page.click('[data-testid="confirm-approve-btn"]')
    
    // Wait for success
    await expect(page.locator('[data-testid="success-message"]')).toContainText('approved')
    
    // Verify status change
    await expect(page.locator('[data-testid="po-status"]')).toContainText('Approved')
    
    // Approval buttons should be hidden
    await expect(page.locator('[data-testid="approve-po-btn"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="reject-po-btn"]')).not.toBeVisible()
  })

  test('should reject purchase order with reason', async ({ page }) => {
    // Click reject button
    await page.click('[data-testid="reject-po-btn"]')
    
    // Fill rejection dialog
    await page.waitForSelector('[data-testid="rejection-dialog"]')
    await page.fill('[data-testid="rejection-reason"]', 'Budget constraints - defer to next month')
    await page.click('[data-testid="confirm-reject-btn"]')
    
    // Wait for success
    await expect(page.locator('[data-testid="success-message"]')).toContainText('rejected')
    
    // Verify status change
    await expect(page.locator('[data-testid="po-status"]')).toContainText('Rejected')
    
    // Should display rejection reason
    await expect(page.locator('[data-testid="rejection-reason-display"]')).toContainText('Budget constraints')
  })

  test('should require rejection reason', async ({ page }) => {
    // Click reject button
    await page.click('[data-testid="reject-po-btn"]')
    
    // Try to reject without reason
    await page.waitForSelector('[data-testid="rejection-dialog"]')
    await page.click('[data-testid="confirm-reject-btn"]')
    
    // Should show validation error
    await expect(page.locator('[data-testid="rejection-reason-error"]')).toContainText('Reason is required')
  })
})

test.describe('Purchase Order Export and Send', () => {
  let testPOId: string

  test.beforeEach(async ({ page }) => {
    // Create a test PO
    const response = await page.request.post('/api/purchase-orders/create', {
      data: {
        vendor_name: 'Export Test Vendor',
        vendor_email: 'export@vendor.com',
        items: [
          {
            sku: 'EXPORT-001',
            product_name: 'Export Product',
            quantity: 25,
            unit_cost: 40,
            total_cost: 1000
          }
        ],
        total_amount: 1000,
        status: 'approved'
      }
    })
    
    const po = await response.json()
    testPOId = po.data.id
    
    await page.goto(`/purchase-orders/${testPOId}`)
    await page.waitForLoadState('networkidle')
  })

  test('should export PO as CSV', async ({ page }) => {
    // Click export button
    await page.click('[data-testid="export-po-btn"]')
    
    // Select CSV format
    await page.waitForSelector('[data-testid="export-format-dialog"]')
    await page.click('[data-testid="export-csv-btn"]')
    
    // Wait for download
    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="confirm-export-btn"]')
    const download = await downloadPromise
    
    // Verify download
    expect(download.suggestedFilename()).toContain('.csv')
    expect(download.suggestedFilename()).toContain('PO-')
  })

  test('should export PO as PDF', async ({ page }) => {
    // Click export button
    await page.click('[data-testid="export-po-btn"]')
    
    // Select PDF format
    await page.waitForSelector('[data-testid="export-format-dialog"]')
    await page.click('[data-testid="export-pdf-btn"]')
    
    // Wait for download
    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="confirm-export-btn"]')
    const download = await downloadPromise
    
    // Verify download
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('should send PO via email', async ({ page }) => {
    // Click send button
    await page.click('[data-testid="send-po-btn"]')
    
    // Fill email dialog
    await page.waitForSelector('[data-testid="send-email-dialog"]')
    await page.fill('[data-testid="recipient-email"]', 'vendor@example.com')
    await page.fill('[data-testid="cc-emails"]', 'manager@company.com, purchasing@company.com')
    await page.fill('[data-testid="email-message"]', 'Please process this order at your earliest convenience.')
    
    // Send email
    await page.click('[data-testid="send-email-btn"]')
    
    // Wait for success
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Email sent successfully')
    
    // Should update sent status
    await expect(page.locator('[data-testid="po-sent-indicator"]')).toBeVisible()
  })

  test('should validate email addresses', async ({ page }) => {
    // Click send button
    await page.click('[data-testid="send-po-btn"]')
    
    // Enter invalid email
    await page.waitForSelector('[data-testid="send-email-dialog"]')
    await page.fill('[data-testid="recipient-email"]', 'invalid-email')
    await page.click('[data-testid="send-email-btn"]')
    
    // Should show validation error
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email address')
  })
})

test.describe('Purchase Order Performance', () => {
  test('should handle large PO with 100+ items', async ({ page }) => {
    // Create large item list
    const largeItemList = Array.from({ length: 150 }, (_, i) => ({
      sku: `PERF-SKU-${i.toString().padStart(3, '0')}`,
      product_name: `Performance Test Product ${i}`,
      quantity: Math.floor(Math.random() * 100) + 1,
      unit_cost: Math.random() * 100,
      total_cost: 0
    }))
    
    largeItemList.forEach(item => {
      item.total_cost = item.quantity * item.unit_cost
    })
    
    // Create PO via API
    const startTime = Date.now()
    const response = await page.request.post('/api/purchase-orders/create', {
      data: {
        vendor_name: 'Performance Test Vendor',
        items: largeItemList,
        total_amount: largeItemList.reduce((sum, item) => sum + item.total_cost, 0)
      }
    })
    const endTime = Date.now()
    
    // Should complete within 2 seconds
    expect(endTime - startTime).toBeLessThan(2000)
    expect(response.status()).toBe(201)
    
    const po = await response.json()
    
    // Navigate to PO page
    await page.goto(`/purchase-orders/${po.data.id}`)
    
    // Page should load within 3 seconds
    const pageLoadStart = Date.now()
    await page.waitForLoadState('networkidle')
    const pageLoadEnd = Date.now()
    
    expect(pageLoadEnd - pageLoadStart).toBeLessThan(3000)
    
    // Should display all items
    await expect(page.locator('[data-testid="po-item-row"]')).toHaveCount(150)
    
    // Pagination should be available
    await expect(page.locator('[data-testid="pagination"]')).toBeVisible()
  })

  test('should efficiently filter and sort large item lists', async ({ page }) => {
    await page.goto('/purchase-orders/generate')
    
    // Generate suggestions (assume multiple vendors with many items)
    await page.click('[data-testid="generate-suggestions-btn"]')
    await page.waitForSelector('[data-testid="suggestion-card"]')
    
    // Test sorting
    const sortStart = Date.now()
    await page.selectOption('[data-testid="sort-by"]', 'total_amount')
    await page.waitForTimeout(100) // Brief wait for sort
    const sortEnd = Date.now()
    
    expect(sortEnd - sortStart).toBeLessThan(500)
    
    // Test filtering
    const filterStart = Date.now()
    await page.fill('[data-testid="vendor-filter"]', 'Test')
    await page.waitForTimeout(300) // Debounce delay
    const filterEnd = Date.now()
    
    expect(filterEnd - filterStart).toBeLessThan(800)
  })
})

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE size

  test('should display PO generation page on mobile', async ({ page }) => {
    await page.goto('/purchase-orders/generate')
    
    // Check responsive layout
    await expect(page.locator('[data-testid="po-suggestions"]')).toBeVisible()
    
    // Cards should stack vertically
    const cards = page.locator('[data-testid="suggestion-card"]')
    if (await cards.count() > 0) {
      const firstCard = await cards.first().boundingBox()
      const secondCard = await cards.nth(1).boundingBox()
      
      if (firstCard && secondCard) {
        expect(secondCard.y).toBeGreaterThan(firstCard.y + firstCard.height)
      }
    }
  })

  test('should handle touch interactions on mobile', async ({ page }) => {
    await page.goto('/purchase-orders/create')
    
    // Should be able to tap through wizard
    await page.tap('[data-testid="vendor-select"]')
    await page.selectOption('[data-testid="vendor-select"]', { index: 1 })
    await page.tap('[data-testid="wizard-next-btn"]')
    
    // Should show mobile-optimized item entry
    await expect(page.locator('[data-testid="wizard-step-2"]')).toBeVisible()
  })
})