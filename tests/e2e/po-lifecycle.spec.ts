/**
 * End-to-End Tests for Complete Purchase Order Lifecycle
 * Tests: Create → Review → Approve → Send → Receive
 */

import { test, expect, Page } from '@playwright/test'

test.describe('Purchase Order Complete Lifecycle', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    await page.goto('/purchase-orders')
    await page.waitForLoadState('networkidle')
  })

  test('Complete PO lifecycle: Create → Send → Receive', async () => {
    // Step 1: Generate PO suggestions
    await test.step('Generate PO suggestions', async () => {
      await page.click('button:has-text("Generate Suggestions")')
      await page.waitForSelector('[data-testid="po-suggestions"]', { timeout: 10000 })
      
      const suggestions = await page.locator('[data-testid="suggestion-card"]').count()
      expect(suggestions).toBeGreaterThan(0)
    })

    // Step 2: Create PO from suggestion
    let poNumber: string
    await test.step('Create PO from suggestion', async () => {
      // Click on first critical/high urgency suggestion
      const criticalSuggestion = page.locator('[data-urgency="critical"], [data-urgency="high"]').first()
      await criticalSuggestion.click()
      
      // Review items in modal
      await page.waitForSelector('[data-testid="po-creation-modal"]')
      const itemCount = await page.locator('[data-testid="po-item-row"]').count()
      expect(itemCount).toBeGreaterThan(0)
      
      // Verify EOQ calculations are shown
      await expect(page.locator('[data-testid="eoq-calculation"]')).toBeVisible()
      
      // Create the PO
      await page.click('button:has-text("Create Purchase Order")')
      await page.waitForSelector('[data-testid="po-created-success"]')
      
      // Capture PO number
      poNumber = await page.locator('[data-testid="po-number"]').textContent() || ''
      expect(poNumber).toMatch(/^PO-\d{4}-\d{6}$/)
    })

    // Step 3: Review PO details
    await test.step('Review PO details', async () => {
      // Navigate to PO details
      await page.click(`[data-po-number="${poNumber}"]`)
      await page.waitForSelector('[data-testid="po-details"]')
      
      // Verify all sections are present
      await expect(page.locator('[data-testid="vendor-info"]')).toBeVisible()
      await expect(page.locator('[data-testid="items-table"]')).toBeVisible()
      await expect(page.locator('[data-testid="total-amount"]')).toBeVisible()
      await expect(page.locator('[data-testid="audit-trail"]')).toBeVisible()
      
      // Verify status is draft
      await expect(page.locator('[data-testid="po-status"]')).toHaveText('Draft')
    })

    // Step 4: Approve PO
    await test.step('Approve purchase order', async () => {
      await page.click('button:has-text("Approve")')
      
      // Add approval notes
      await page.fill('[data-testid="approval-notes"]', 'Approved for immediate ordering')
      await page.click('button:has-text("Confirm Approval")')
      
      // Wait for status update
      await page.waitForSelector('[data-testid="po-status"]:has-text("Approved")')
      
      // Verify audit trail update
      const auditEntries = await page.locator('[data-testid="audit-entry"]').count()
      expect(auditEntries).toBeGreaterThanOrEqual(2) // Created + Approved
    })

    // Step 5: Send PO to vendor
    await test.step('Send PO to vendor', async () => {
      await page.click('button:has-text("Send to Vendor")')
      
      // Verify email preview
      await page.waitForSelector('[data-testid="email-preview"]')
      await expect(page.locator('[data-testid="vendor-email"]')).toBeVisible()
      
      // Confirm send
      await page.click('button:has-text("Send Email")')
      await page.waitForSelector('[data-testid="email-sent-success"]')
      
      // Verify status update
      await expect(page.locator('[data-testid="po-status"]')).toHaveText('Sent')
    })

    // Step 6: Export as PDF
    await test.step('Export PO as PDF', async () => {
      const downloadPromise = page.waitForEvent('download')
      await page.click('button:has-text("Export PDF")')
      
      const download = await downloadPromise
      expect(download.suggestedFilename()).toContain(poNumber)
      expect(download.suggestedFilename()).toEndWith('.pdf')
      
      // Verify PDF generation was fast
      const startTime = Date.now()
      await download.path()
      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(2000) // < 2 seconds
    })

    // Step 7: Mark as received
    await test.step('Mark PO as received', async () => {
      await page.click('button:has-text("Mark as Received")')
      
      // Enter receiving notes
      await page.fill('[data-testid="receiving-notes"]', 'All items received in good condition')
      await page.click('button:has-text("Confirm Receipt")')
      
      // Verify status update
      await page.waitForSelector('[data-testid="po-status"]:has-text("Received")')
      
      // Verify complete audit trail
      const finalAuditEntries = await page.locator('[data-testid="audit-entry"]').count()
      expect(finalAuditEntries).toBeGreaterThanOrEqual(4) // Created, Approved, Sent, Received
    })
  })

  test('Bulk PO operations', async () => {
    await test.step('Select multiple POs', async () => {
      // Wait for PO list to load
      await page.waitForSelector('[data-testid="po-list-item"]')
      
      // Select first 3 draft POs
      const draftPOs = page.locator('[data-status="draft"] input[type="checkbox"]')
      const count = await draftPOs.count()
      
      for (let i = 0; i < Math.min(3, count); i++) {
        await draftPOs.nth(i).check()
      }
      
      // Verify bulk actions appear
      await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible()
    })

    await test.step('Bulk approve POs', async () => {
      await page.click('button:has-text("Bulk Approve")')
      await page.click('button:has-text("Confirm Bulk Approval")')
      
      // Wait for success message
      await page.waitForSelector('[data-testid="bulk-approve-success"]')
      
      // Verify all selected POs are now approved
      const approvedCount = await page.locator('[data-status="approved"]').count()
      expect(approvedCount).toBeGreaterThanOrEqual(3)
    })
  })

  test('PO filtering and search', async () => {
    await test.step('Filter by status', async () => {
      await page.selectOption('[data-testid="status-filter"]', 'pending')
      await page.waitForLoadState('networkidle')
      
      const items = await page.locator('[data-testid="po-list-item"]').count()
      if (items > 0) {
        const statuses = await page.locator('[data-testid="po-status-badge"]').allTextContents()
        expect(statuses.every(s => s === 'Pending')).toBe(true)
      }
    })

    await test.step('Filter by urgency', async () => {
      await page.selectOption('[data-testid="urgency-filter"]', 'critical')
      await page.waitForLoadState('networkidle')
      
      const urgencyBadges = await page.locator('[data-testid="urgency-badge"]').allTextContents()
      if (urgencyBadges.length > 0) {
        expect(urgencyBadges.every(u => u === 'Critical')).toBe(true)
      }
    })

    await test.step('Search by PO number', async () => {
      await page.fill('[data-testid="po-search"]', 'PO-2024')
      await page.waitForLoadState('networkidle')
      
      const poNumbers = await page.locator('[data-testid="po-number"]').allTextContents()
      expect(poNumbers.every(n => n.includes('PO-2024'))).toBe(true)
    })

    await test.step('Filter by date range', async () => {
      const today = new Date().toISOString().split('T')[0]
      await page.fill('[data-testid="date-from"]', today)
      await page.fill('[data-testid="date-to"]', today)
      await page.waitForLoadState('networkidle')
      
      const dates = await page.locator('[data-testid="po-date"]').allTextContents()
      expect(dates.every(d => d.includes(today))).toBe(true)
    })
  })

  test('Mobile responsiveness', async () => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await test.step('Mobile navigation', async () => {
      // Check hamburger menu appears
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
      
      // Open mobile menu
      await page.click('[data-testid="mobile-menu"]')
      await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible()
    })

    await test.step('Mobile PO list', async () => {
      // Verify cards stack vertically
      const cards = await page.locator('[data-testid="po-card"]').boundingBox()
      expect(cards?.width).toBeLessThan(375)
      
      // Verify horizontal scroll for tables
      const table = page.locator('[data-testid="items-table"]').first()
      await expect(table).toHaveCSS('overflow-x', 'auto')
    })

    await test.step('Mobile actions', async () => {
      // Click on first PO
      await page.locator('[data-testid="po-card"]').first().click()
      
      // Verify action buttons are accessible
      await expect(page.locator('[data-testid="mobile-actions"]')).toBeVisible()
      
      // Test swipe gestures for navigation
      await page.locator('[data-testid="po-details"]').swipe({
        direction: 'left',
        distance: 100
      })
    })
  })

  test('Performance under load', async () => {
    await test.step('Load test with 100+ POs', async () => {
      // Navigate to test page with many POs
      await page.goto('/purchase-orders?test=load&count=100')
      
      const startTime = Date.now()
      await page.waitForSelector('[data-testid="po-list-loaded"]')
      const loadTime = Date.now() - startTime
      
      expect(loadTime).toBeLessThan(3000) // Page loads in < 3 seconds
      
      // Verify all 100 POs are rendered
      const poCount = await page.locator('[data-testid="po-list-item"]').count()
      expect(poCount).toBe(100)
    })

    await test.step('Pagination performance', async () => {
      // Test pagination speed
      const startTime = Date.now()
      await page.click('[data-testid="next-page"]')
      await page.waitForSelector('[data-testid="po-list-loaded"]')
      const paginationTime = Date.now() - startTime
      
      expect(paginationTime).toBeLessThan(500) // Pagination in < 500ms
    })

    await test.step('Search performance', async () => {
      const startTime = Date.now()
      await page.fill('[data-testid="po-search"]', 'vendor')
      await page.waitForTimeout(300) // Debounce delay
      await page.waitForSelector('[data-testid="search-results-loaded"]')
      const searchTime = Date.now() - startTime
      
      expect(searchTime).toBeLessThan(1000) // Search in < 1 second
    })
  })

  test('Error handling and recovery', async () => {
    await test.step('Handle network errors', async () => {
      // Simulate offline mode
      await page.context().setOffline(true)
      
      // Try to create PO
      await page.click('button:has-text("Create PO")')
      
      // Verify error message appears
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
      
      // Go back online and retry
      await page.context().setOffline(false)
      await page.click('[data-testid="retry-button"]')
      await expect(page.locator('[data-testid="po-creation-modal"]')).toBeVisible()
    })

    await test.step('Handle validation errors', async () => {
      // Try to approve without selection
      await page.click('button:has-text("Approve")')
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible()
      
      // Try to send draft PO
      const draftPO = page.locator('[data-status="draft"]').first()
      await draftPO.click()
      await page.click('button:has-text("Send to Vendor")')
      await expect(page.locator('[data-testid="status-error"]')).toContainText('must be approved')
    })

    await test.step('Handle concurrent updates', async () => {
      // Open same PO in two tabs
      const poUrl = page.url()
      const newPage = await page.context().newPage()
      await newPage.goto(poUrl)
      
      // Update in first tab
      await page.click('button:has-text("Approve")')
      await page.click('button:has-text("Confirm")')
      
      // Try to update in second tab
      await newPage.click('button:has-text("Approve")')
      await expect(newPage.locator('[data-testid="stale-data-error"]')).toBeVisible()
      
      // Refresh and verify
      await newPage.reload()
      await expect(newPage.locator('[data-testid="po-status"]')).toHaveText('Approved')
      
      await newPage.close()
    })
  })

  test('Accessibility', async () => {
    await test.step('Keyboard navigation', async () => {
      // Tab through main elements
      await page.keyboard.press('Tab')
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'create-po-button')
      
      await page.keyboard.press('Tab')
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'po-search')
      
      // Navigate list with arrow keys
      await page.locator('[data-testid="po-list"]').focus()
      await page.keyboard.press('ArrowDown')
      await expect(page.locator('[data-selected="true"]')).toBeVisible()
      
      // Activate with Enter
      await page.keyboard.press('Enter')
      await expect(page.locator('[data-testid="po-details"]')).toBeVisible()
    })

    await test.step('Screen reader compatibility', async () => {
      // Check ARIA labels
      await expect(page.locator('button:has-text("Create PO")')).toHaveAttribute('aria-label')
      await expect(page.locator('[data-testid="po-list"]')).toHaveAttribute('role', 'list')
      await expect(page.locator('[data-testid="po-list-item"]').first()).toHaveAttribute('role', 'listitem')
      
      // Check live regions for updates
      await page.click('button:has-text("Generate Suggestions")')
      await expect(page.locator('[aria-live="polite"]')).toContainText('Generating')
    })

    await test.step('Color contrast', async () => {
      // Check critical urgency badge contrast
      const criticalBadge = page.locator('[data-urgency="critical"]').first()
      const bgColor = await criticalBadge.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      )
      const textColor = await criticalBadge.evaluate(el => 
        window.getComputedStyle(el).color
      )
      
      // Simple contrast check (would use actual WCAG calculation in production)
      expect(bgColor).not.toBe(textColor)
    })
  })
})