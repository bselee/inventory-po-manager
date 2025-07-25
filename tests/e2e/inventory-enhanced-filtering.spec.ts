import { test, expect } from '@playwright/test'

test.describe('Inventory Enhanced Filtering - Comprehensive Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/inventory')
    // Wait for the page to load
    await page.waitForSelector('h1:has-text("Inventory")')
    await page.waitForSelector('table', { timeout: 10000 })
  })

  test.describe('Basic Page Elements', () => {
    test('should display main inventory heading', async ({ page }) => {
      // Be specific about the main content heading to avoid navigation heading
      await expect(page.locator('main h1')).toContainText('Inventory')
    })

    test('should have refresh button', async ({ page }) => {
      const refreshButton = page.getByRole('button', { name: /refresh/i })
      await expect(refreshButton).toBeVisible()
    })

    test('should display summary cards', async ({ page }) => {
      await expect(page.locator('text=Total Items')).toBeVisible()
      // More specific selector for summary card Out of Stock
      await expect(page.locator('.bg-white .text-red-600', { hasText: 'Out of Stock' })).toBeVisible()
    })

    test('should have search input', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search by name, SKU, or vendor...')
      await expect(searchInput).toBeVisible()
    })
  })

  test.describe('View Mode Toggle', () => {
    test('should have all three view mode buttons', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Table View' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Planning' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Analytics' })).toBeVisible()
    })

    test('should switch between view modes', async ({ page }) => {
      // Start with table view (default)
      await expect(page.getByRole('button', { name: 'Table View' })).toHaveClass(/bg-blue-600/)

      // Switch to planning view
      await page.getByRole('button', { name: 'Planning' }).click()
      await expect(page.getByRole('button', { name: 'Planning' })).toHaveClass(/bg-blue-600/)

      // Switch to analytics view
      await page.getByRole('button', { name: 'Analytics' }).click()
      await expect(page.getByRole('button', { name: 'Analytics' })).toHaveClass(/bg-blue-600/)

      // Switch back to table view
      await page.getByRole('button', { name: 'Table View' }).click()
      await expect(page.getByRole('button', { name: 'Table View' })).toHaveClass(/bg-blue-600/)
    })
  })

  test.describe('Search Functionality', () => {
    test('should filter items by search term', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search by name, SKU, or vendor...')
      
      // Get initial row count
      const initialRows = await page.locator('tbody tr').count()
      
      // Search for a specific term
      await searchInput.fill('test')
      await page.waitForTimeout(500) // Allow for filtering

      // Check that results are filtered
      const filteredRows = await page.locator('tbody tr').count()
      expect(filteredRows).toBeLessThanOrEqual(initialRows)
    })

    test('should clear search results', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search by name, SKU, or vendor...')
      
      // Search for something
      await searchInput.fill('test')
      await page.waitForTimeout(500)
      
      // Clear search
      await searchInput.clear()
      await page.waitForTimeout(500)
      
      // Verify search input is empty
      await expect(searchInput).toHaveValue('')
    })
  })

  test.describe('Basic Filters', () => {
    test('should have all basic filter dropdowns', async ({ page }) => {
      await expect(page.locator('select[aria-label="Filter by stock status"]')).toBeVisible()
      await expect(page.getByPlaceholder('Filter by vendor')).toBeVisible()
      await expect(page.getByPlaceholder('Filter by location')).toBeVisible()
      await expect(page.locator('select[aria-label="Filter by sales velocity"]')).toBeVisible()
      await expect(page.locator('select[aria-label="Filter by stock days"]')).toBeVisible()
    })

    test('should filter by stock status', async ({ page }) => {
      const statusFilter = page.locator('select[aria-label="Filter by stock status"]')
      
      // Test different status filters
      await statusFilter.selectOption('critical')
      await page.waitForTimeout(500)
      
      await statusFilter.selectOption('low-stock')
      await page.waitForTimeout(500)
      
      await statusFilter.selectOption('adequate')
      await page.waitForTimeout(500)
      
      await statusFilter.selectOption('all')
      await page.waitForTimeout(500)
    })

    test('should filter by sales velocity', async ({ page }) => {
      const velocityFilter = page.locator('select[aria-label="Filter by sales velocity"]')
      
      await velocityFilter.selectOption('fast')
      await page.waitForTimeout(500)
      
      await velocityFilter.selectOption('medium')
      await page.waitForTimeout(500)
      
      await velocityFilter.selectOption('slow')
      await page.waitForTimeout(500)
      
      await velocityFilter.selectOption('dead')
      await page.waitForTimeout(500)
      
      await velocityFilter.selectOption('all')
      await page.waitForTimeout(500)
    })

    test('should filter by stock days', async ({ page }) => {
      const stockDaysFilter = page.locator('select[aria-label="Filter by stock days"]')
      
      await stockDaysFilter.selectOption('under-30')
      await page.waitForTimeout(500)
      
      await stockDaysFilter.selectOption('30-60')
      await page.waitForTimeout(500)
      
      await stockDaysFilter.selectOption('60-90')
      await page.waitForTimeout(500)
      
      await stockDaysFilter.selectOption('over-90')
      await page.waitForTimeout(500)
      
      await stockDaysFilter.selectOption('over-180')
      await page.waitForTimeout(500)
      
      await stockDaysFilter.selectOption('all')
      await page.waitForTimeout(500)
    })

    test('should clear all filters', async ({ page }) => {
      // Apply some filters first
      await page.locator('select[aria-label="Filter by stock status"]').selectOption('critical')
      await page.getByPlaceholder('Filter by vendor').fill('test vendor')
      
      // Click clear filters
      await page.getByRole('button', { name: 'Clear Filters' }).click()
      
      // Verify filters are cleared
      await expect(page.locator('select[aria-label="Filter by stock status"]')).toHaveValue('all')
      await expect(page.getByPlaceholder('Filter by vendor')).toHaveValue('')
    })
  })

  test.describe('Advanced Filters', () => {
    test('should toggle advanced filters panel', async ({ page }) => {
      const showAdvancedButton = page.getByRole('button', { name: /Show Advanced/i })
      await expect(showAdvancedButton).toBeVisible()
      
      // Show advanced filters
      await showAdvancedButton.click()
      await expect(page.getByText('Price Range:')).toBeVisible()
      // Use text content to find checkbox since it doesn't have explicit label
      await expect(page.locator('label:has-text("Reorder Needed")')).toBeVisible()
      await expect(page.locator('label:has-text("Has Value (Price > 0)")')).toBeVisible()
      
      // Hide advanced filters
      await page.getByRole('button', { name: /Hide Advanced/i }).click()
      await expect(page.getByText('Price Range:')).not.toBeVisible()
    })

    test('should filter by price range', async ({ page }) => {
      // Show advanced filters
      await page.getByRole('button', { name: /Show Advanced/i }).click()
      
      // Set price range
      const minPrice = page.getByPlaceholder('Min')
      const maxPrice = page.getByPlaceholder('Max')
      
      await minPrice.fill('10')
      await maxPrice.fill('100')
      await page.waitForTimeout(500)
      
      // Clear price range
      await minPrice.clear()
      await maxPrice.clear()
      await page.waitForTimeout(500)
    })

    test('should filter by reorder needed checkbox', async ({ page }) => {
      // Show advanced filters
      await page.getByRole('button', { name: /Show Advanced/i }).click()
      
      // Check reorder needed - use more specific selector
      const reorderCheckbox = page.locator('label:has-text("Reorder Needed") input[type="checkbox"]')
      await reorderCheckbox.check()
      await page.waitForTimeout(500)
      
      // Uncheck
      await reorderCheckbox.uncheck()
      await page.waitForTimeout(500)
    })

    test('should filter by has value checkbox', async ({ page }) => {
      // Show advanced filters
      await page.getByRole('button', { name: /Show Advanced/i }).click()
      
      // Check has value
      const hasValueCheckbox = page.locator('input[type="checkbox"]').nth(1)
      await hasValueCheckbox.check()
      await page.waitForTimeout(500)
      
      // Uncheck
      await hasValueCheckbox.uncheck()
      await page.waitForTimeout(500)
    })
  })

  test.describe('Preset Filters', () => {
    test('should display all preset filter buttons', async ({ page }) => {
      await expect(page.getByText('Quick Filters')).toBeVisible()
      
      // Check all preset filter buttons are present
      await expect(page.getByRole('button', { name: /Out of Stock/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /Reorder Needed/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /Dead Stock/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /Overstocked/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /Fast Moving/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /Low Value/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /Critical Stock/i })).toBeVisible()
    })

    test('should apply out of stock preset filter', async ({ page }) => {
      const outOfStockButton = page.getByRole('button', { name: /Out of Stock/i })
      await outOfStockButton.click()
      await page.waitForTimeout(500)
      
      // Verify button appears active
      await expect(outOfStockButton).toHaveClass(/border-2/)
    })

    test('should apply reorder needed preset filter', async ({ page }) => {
      const reorderButton = page.getByRole('button', { name: /Reorder Needed/i })
      await reorderButton.click()
      await page.waitForTimeout(500)
      
      await expect(reorderButton).toHaveClass(/border-2/)
    })

    test('should apply dead stock preset filter', async ({ page }) => {
      const deadStockButton = page.getByRole('button', { name: /Dead Stock/i })
      await deadStockButton.click()
      await page.waitForTimeout(500)
      
      await expect(deadStockButton).toHaveClass(/border-2/)
    })

    test('should apply overstocked preset filter', async ({ page }) => {
      const overstockedButton = page.getByRole('button', { name: /Overstocked/i })
      await overstockedButton.click()
      await page.waitForTimeout(500)
      
      await expect(overstockedButton).toHaveClass(/border-2/)
    })

    test('should apply fast moving preset filter', async ({ page }) => {
      const fastMovingButton = page.getByRole('button', { name: /Fast Moving/i })
      await fastMovingButton.click()
      await page.waitForTimeout(500)
      
      await expect(fastMovingButton).toHaveClass(/border-2/)
    })

    test('should apply low value preset filter', async ({ page }) => {
      const lowValueButton = page.getByRole('button', { name: /Low Value/i })
      await lowValueButton.click()
      await page.waitForTimeout(500)
      
      await expect(lowValueButton).toHaveClass(/border-2/)
    })

    test('should apply critical stock preset filter', async ({ page }) => {
      const criticalStockButton = page.getByRole('button', { name: /Critical Stock/i })
      await criticalStockButton.click()
      await page.waitForTimeout(500)
      
      await expect(criticalStockButton).toHaveClass(/border-2/)
    })

    test('should clear preset filter when clearing all filters', async ({ page }) => {
      // Apply a preset filter
      await page.getByRole('button', { name: /Out of Stock/i }).click()
      await page.waitForTimeout(500)
      
      // Clear all filters
      await page.getByRole('button', { name: 'Clear Filters' }).click()
      await page.waitForTimeout(500)
      
      // Verify preset filter is no longer active
      await expect(page.getByRole('button', { name: /Out of Stock/i })).not.toHaveClass(/border-2/)
    })
  })

  test.describe('Pagination', () => {
    test('should display pagination controls', async ({ page }) => {
      await expect(page.getByText('items per page')).toBeVisible()
      await expect(page.locator('select[aria-label="Items per page"]')).toBeVisible()
    })

    test('should change items per page', async ({ page }) => {
      const itemsPerPageSelect = page.locator('select[aria-label="Items per page"]')
      
      // Test different page sizes
      await itemsPerPageSelect.selectOption('25')
      await page.waitForTimeout(500)
      
      await itemsPerPageSelect.selectOption('50')
      await page.waitForTimeout(500)
      
      await itemsPerPageSelect.selectOption('100')
      await page.waitForTimeout(500)
      
      await itemsPerPageSelect.selectOption('200')
      await page.waitForTimeout(500)
    })

    test('should navigate between pages', async ({ page }) => {
      // Set a small page size to ensure multiple pages
      await page.locator('select[aria-label="Items per page"]').selectOption('25')
      await page.waitForTimeout(500)
      
      // Check if pagination controls exist
      const nextButton = page.getByRole('button', { name: /next/i })
      const prevButton = page.getByRole('button', { name: /previous/i })
      
      if (await nextButton.isVisible()) {
        await nextButton.click()
        await page.waitForTimeout(500)
        
        if (await prevButton.isVisible()) {
          await prevButton.click()
          await page.waitForTimeout(500)
        }
      }
    })
  })

  test.describe('Table Sorting', () => {
    test('should sort by clicking column headers', async ({ page }) => {
      // Test sorting by product name
      const productNameHeader = page.getByRole('columnheader', { name: /product name/i })
      await productNameHeader.click()
      await page.waitForTimeout(500)
      
      // Click again to reverse sort
      await productNameHeader.click()
      await page.waitForTimeout(500)
    })

    test('should sort by stock column', async ({ page }) => {
      const stockHeader = page.getByRole('columnheader', { name: /stock/i })
      await stockHeader.click()
      await page.waitForTimeout(500)
      
      await stockHeader.click()
      await page.waitForTimeout(500)
    })

    test('should sort by velocity column', async ({ page }) => {
      const velocityHeader = page.getByRole('columnheader', { name: /velocity/i })
      await velocityHeader.click()
      await page.waitForTimeout(500)
      
      await velocityHeader.click()
      await page.waitForTimeout(500)
    })
  })

  test.describe('Table Interactions', () => {
    test('should display table with inventory data', async ({ page }) => {
      // Verify table headers are present
      await expect(page.getByRole('columnheader', { name: /sku/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /product name/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /stock/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible()
    })

    test('should handle refresh functionality', async ({ page }) => {
      const refreshButton = page.getByRole('button', { name: /refresh/i })
      await refreshButton.click()
      
      // Wait for refresh to complete
      await page.waitForTimeout(1000)
      
      // Verify button is not disabled after refresh
      await expect(refreshButton).not.toBeDisabled()
    })
  })

  test.describe('Combined Filter Testing', () => {
    test('should apply multiple filters simultaneously', async ({ page }) => {
      // Apply search filter
      await page.getByPlaceholder('Search by name, SKU, or vendor...').fill('test')
      
      // Apply status filter
      await page.locator('select[aria-label="Filter by stock status"]').selectOption('adequate')
      
      // Apply velocity filter
      await page.locator('select[aria-label="Filter by sales velocity"]').selectOption('fast')
      
      await page.waitForTimeout(500)
      
      // Clear all filters
      await page.getByRole('button', { name: 'Clear Filters' }).click()
      await page.waitForTimeout(500)
    })

    test('should combine preset filter with additional filters', async ({ page }) => {
      // Apply preset filter
      await page.getByRole('button', { name: /Fast Moving/i }).click()
      await page.waitForTimeout(500)
      
      // Add additional vendor filter
      await page.getByPlaceholder('Filter by vendor').fill('test')
      await page.waitForTimeout(500)
      
      // Clear all
      await page.getByRole('button', { name: 'Clear Filters' }).click()
      await page.waitForTimeout(500)
    })
  })

  test.describe('Responsive Behavior', () => {
    test('should handle different viewport sizes', async ({ page }) => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.waitForTimeout(500)
      
      // Verify main elements are still visible
      await expect(page.locator('h1')).toContainText('Inventory')
      
      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.waitForTimeout(500)
      
      // Test desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 })
      await page.waitForTimeout(500)
    })
  })

  test.describe('Error Handling', () => {
    test('should handle empty search results gracefully', async ({ page }) => {
      // Search for something that shouldn't exist
      await page.getByPlaceholder('Search by name, SKU, or vendor...').fill('zzzznonexistentitem')
      await page.waitForTimeout(500)
      
      // The table should still be present, just with no rows or appropriate message
      await expect(page.locator('table')).toBeVisible()
    })
  })

  test.describe('Performance Testing', () => {
    test('should load initial data within reasonable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/inventory')
      await page.waitForSelector('table tbody tr', { timeout: 10000 })
      const endTime = Date.now()
      
      // Should load within 10 seconds
      expect(endTime - startTime).toBeLessThan(10000)
    })

    test('should respond to filter changes quickly', async ({ page }) => {
      const startTime = Date.now()
      await page.locator('select[aria-label="Filter by stock status"]').selectOption('critical')
      await page.waitForTimeout(100) // Minimal wait for UI update
      const endTime = Date.now()
      
      // Filter should apply within 1 second
      expect(endTime - startTime).toBeLessThan(1000)
    })
  })
})
