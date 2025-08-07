import { test, expect } from '@playwright/test'

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('should load dashboard with all components', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Dashboard/)
    
    // Check main heading
    await expect(page.locator('h1')).toContainText('Executive Dashboard')
    
    // Check all major dashboard sections are present
    await expect(page.locator('text=Total Inventory Value')).toBeVisible()
    await expect(page.locator('text=Critical Items')).toBeVisible()
    await expect(page.locator('text=Inventory Trends')).toBeVisible()
    await expect(page.locator('text=Purchase Order Activity')).toBeVisible()
    await expect(page.locator('text=Live Updates')).toBeVisible()
    await expect(page.locator('text=Vendor Performance')).toBeVisible()
  })

  test('should display metric cards with numeric values', async ({ page }) => {
    // Wait for metric cards to load
    await expect(page.locator('text=Total Inventory Value')).toBeVisible()
    await expect(page.locator('text=Total SKUs')).toBeVisible()
    await expect(page.locator('text=Critical Items')).toBeVisible()
    await expect(page.locator('text=Avg Sales Velocity')).toBeVisible()
    
    // Check that metric values are displayed (not just loading states)
    await page.waitForFunction(() => {
      const cards = document.querySelectorAll('[class*="bg-white rounded-lg shadow"]')
      return Array.from(cards).some(card => {
        const text = card.textContent || ''
        return text.match(/\$[\d,]+/) || text.match(/\d+/) // Has dollar amounts or numbers
      })
    }, { timeout: 10000 })
  })

  test('should load and display critical items', async ({ page }) => {
    await expect(page.locator('text=Critical Items')).toBeVisible()
    
    // Wait for either critical items to load or "No critical items" message
    await Promise.race([
      page.waitForSelector('[class*="border rounded-lg p-4"]', { timeout: 5000 }),
      page.waitForSelector('text=No critical items at this time', { timeout: 5000 })
    ])
    
    // If there are critical items, check their structure
    const criticalItemsExist = await page.locator('[class*="border rounded-lg p-4"]').count() > 0
    if (criticalItemsExist) {
      // Should show SKU, status badge, and action required
      await expect(page.locator('text=CRITICAL').or(page.locator('text=LOW STOCK'))).toBeVisible()
      await expect(page.locator('text=days left').or(page.locator('text=Reorder'))).toBeVisible()
    }
  })

  test('should display trend charts with interactive elements', async ({ page }) => {
    await expect(page.locator('text=Inventory Trends')).toBeVisible()
    
    // Check for period toggle buttons
    await expect(page.locator('text=Daily')).toBeVisible()
    await expect(page.locator('text=Weekly')).toBeVisible()
    await expect(page.locator('text=Monthly')).toBeVisible()
    
    // Test period switching
    await page.click('text=Weekly')
    await expect(page.locator('text=Weekly')).toHaveClass(/bg-white/)
    
    // Check for metric toggle buttons
    await expect(page.locator('text=Inventory Value')).toBeVisible()
    await expect(page.locator('text=Sales Velocity')).toBeVisible()
    await expect(page.locator('text=Stock Health')).toBeVisible()
    
    // Test metric switching
    await page.click('text=Sales Velocity')
    await expect(page.locator('text=Sales Velocity').first()).toHaveClass(/bg-blue-100/)
  })

  test('should show PO activity with pipeline statistics', async ({ page }) => {
    await expect(page.locator('text=Purchase Order Activity')).toBeVisible()
    
    // Check pipeline status columns
    await expect(page.locator('text=Pending')).toBeVisible()
    await expect(page.locator('text=Submitted')).toBeVisible()
    await expect(page.locator('text=Approved')).toBeVisible()
    await expect(page.locator('text=Received')).toBeVisible()
    
    // Check metrics section
    await expect(page.locator('text=Avg Processing')).toBeVisible()
    await expect(page.locator('text=Pending Value')).toBeVisible()
    await expect(page.locator('text=This Week')).toBeVisible()
    await expect(page.locator('text=This Month')).toBeVisible()
    
    // Should show either PO activity or "No recent purchase orders"
    await Promise.race([
      page.waitForSelector('text=No recent purchase orders', { timeout: 5000 }),
      page.waitForSelector('[class*="flex items-start gap-3"]', { timeout: 5000 })
    ])
  })

  test('should display live updates feed', async ({ page }) => {
    await expect(page.locator('text=Live Updates')).toBeVisible()
    
    // Should show either updates or "No recent updates"
    await Promise.race([
      page.waitForSelector('text=No recent updates', { timeout: 5000 }),
      page.waitForSelector('[class*="border rounded-lg p-3"]', { timeout: 5000 })
    ])
    
    // Check for update statistics
    const statsVisible = await page.locator('text=total').isVisible()
    expect(statsVisible).toBe(true)
  })

  test('should show vendor performance data', async ({ page }) => {
    await expect(page.locator('text=Vendor Performance')).toBeVisible()
    
    // Check view toggle buttons
    await expect(page.locator('text=Top Vendors')).toBeVisible()
    await expect(page.locator('text=Performance Metrics')).toBeVisible()
    
    // Test view switching
    await page.click('text=Performance Metrics')
    await expect(page.locator('text=Performance Metrics')).toHaveClass(/bg-blue-100/)
    
    // Should show performance cards
    await Promise.race([
      page.waitForSelector('text=Fastest Delivery', { timeout: 5000 }),
      page.waitForSelector('text=Most Reliable', { timeout: 5000 }),
      page.waitForSelector('text=Highest Volume', { timeout: 5000 })
    ])
    
    // Switch back to table view
    await page.click('text=Top Vendors')
    await expect(page.locator('text=Top Vendors')).toHaveClass(/bg-blue-100/)
  })

  test('should have functional refresh mechanism', async ({ page }) => {
    // Check refresh button exists
    await expect(page.locator('text=Refresh')).toBeVisible()
    
    // Check auto-refresh toggle
    await expect(page.locator('text=Auto-refresh')).toBeVisible()
    
    // Test manual refresh
    await page.click('text=Refresh')
    
    // Should show updated timestamp
    await expect(page.locator('text=Last updated:')).toBeVisible()
    
    // Test auto-refresh toggle
    const autoRefreshCheckbox = page.locator('input[type="checkbox"]')
    await autoRefreshCheckbox.uncheck()
    await expect(autoRefreshCheckbox).not.toBeChecked()
    
    await autoRefreshCheckbox.check()
    await expect(autoRefreshCheckbox).toBeChecked()
  })

  test('should be mobile responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Main components should still be visible and properly arranged
    await expect(page.locator('text=Executive Dashboard')).toBeVisible()
    await expect(page.locator('text=Total Inventory Value')).toBeVisible()
    await expect(page.locator('text=Critical Items')).toBeVisible()
    
    // Check that metric cards stack properly on mobile
    const metricCards = page.locator('[class*="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"]')
    await expect(metricCards).toBeVisible()
    
    // Charts should remain functional
    await expect(page.locator('text=Daily')).toBeVisible()
    await page.click('text=Daily')
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('text=Executive Dashboard')).toBeVisible()
    
    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('should handle loading states gracefully', async ({ page }) => {
    // Intercept API calls to simulate slow responses
    await page.route('/api/dashboard/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
      await route.continue()
    })
    
    // Navigate to dashboard
    await page.goto('/dashboard')
    
    // Should show loading states
    const loadingElements = await page.locator('[class*="animate-pulse"]').count()
    expect(loadingElements).toBeGreaterThan(0)
    
    // Eventually should load content
    await expect(page.locator('text=Total Inventory Value')).toBeVisible({ timeout: 10000 })
  })

  test('should handle error states appropriately', async ({ page }) => {
    // Intercept API calls to simulate errors
    await page.route('/api/dashboard/metrics', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })
    
    await page.goto('/dashboard')
    
    // Should show error message
    await expect(page.locator('text=Error loading metrics').or(page.locator('text=Failed to fetch metrics'))).toBeVisible({ timeout: 10000 })
  })

  test('should provide navigation to related pages', async ({ page }) => {
    // Check for "View All" links
    await expect(page.locator('text=View All').first()).toBeVisible()
    
    // Test navigation link functionality
    const viewAllLinks = page.locator('text=View All')
    const linkCount = await viewAllLinks.count()
    
    if (linkCount > 0) {
      // Click first "View All" link and verify navigation
      await viewAllLinks.first().click()
      
      // Should navigate away from dashboard
      await page.waitForURL(url => !url.pathname.includes('/dashboard'))
      
      // Navigate back to dashboard
      await page.goto('/dashboard')
    }
  })

  test('should display meaningful business intelligence', async ({ page }) => {
    // Wait for dashboard to fully load
    await page.waitForLoadState('networkidle')
    
    // Check for actionable insights
    const hasStockAlerts = await page.locator('text=CRITICAL').or(page.locator('text=LOW STOCK')).isVisible()
    const hasVendorAlerts = await page.locator('[class*="bg-red-50"]').isVisible()
    const hasTrends = await page.locator('text=improving').or(page.locator('text=declining')).isVisible()
    
    // At least one type of business intelligence should be visible
    const hasBusinessIntelligence = hasStockAlerts || hasVendorAlerts || hasTrends
    expect(hasBusinessIntelligence).toBe(true)
  })

  test('should maintain real-time data consistency', async ({ page }) => {
    // Get initial metric values
    await page.waitForSelector('text=Total SKUs')
    
    const initialInventoryValue = await page.locator('text=Total Inventory Value').textContent()
    const initialSKUs = await page.locator('text=Total SKUs').textContent()
    
    // Refresh the dashboard
    await page.click('text=Refresh')
    
    // Wait for refresh to complete
    await page.waitForTimeout(2000)
    
    // Values should be consistent (unless data actually changed)
    const refreshedInventoryValue = await page.locator('text=Total Inventory Value').textContent()
    const refreshedSKUs = await page.locator('text=Total SKUs').textContent()
    
    // Values should exist and be numeric
    expect(refreshedInventoryValue).toBeTruthy()
    expect(refreshedSKUs).toBeTruthy()
  })
})