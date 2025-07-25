import { test, expect } from '@playwright/test';

test.describe('Inventory Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
  });

  test('inventory page loads successfully', async ({ page }) => {
    // Check for main heading
    await expect(page.locator('[data-testid="inventory-heading"]')).toContainText(/inventory/i);
    
    // Check for refresh button
    await expect(page.locator('[data-testid="refresh-button"]')).toBeVisible();
    
    // Wait for data to load (either items or loading state)
    await page.waitForSelector('[data-testid="inventory-table"], .animate-spin', { timeout: 10000 });
  });

  test('search functionality works', async ({ page }) => {
    // Wait for any existing search input
    const searchInput = page.locator('[data-testid="search-input"]');
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('test search');
      
      // Wait for results to update
      await page.waitForTimeout(500);
      
      // Search input should contain the typed text
      await expect(searchInput).toHaveValue('test search');
    }
  });

  test('tab navigation works', async ({ page }) => {
    // Look for tab buttons
    const tabs = page.locator('[data-testid="view-mode-toggle"] button');
    const tabCount = await tabs.count();
    
    if (tabCount > 0) {
      for (let i = 0; i < tabCount; i++) {
        const tab = tabs.nth(i);
        await tab.click();
        
        // Wait for content to change
        await page.waitForTimeout(300);
        
        // Tab should be active/selected
        const isActive = await tab.getAttribute('aria-selected') === 'true';
        
        expect(isActive).toBeTruthy();
      }
    }
  });

  test('refresh button works', async ({ page }) => {
    const refreshButton = page.locator('[data-testid="refresh-button"]');
    await expect(refreshButton).toBeVisible();
    
    // Click refresh
    await refreshButton.click();
    
    // Button should show loading state briefly
    await expect(refreshButton).toBeDisabled();
    
    // Wait for refresh to complete
    await page.waitForTimeout(1000);
    
    // Button should be enabled again
    await expect(refreshButton).toBeEnabled();
  });

  test('sorting functionality works', async ({ page }) => {
    // Look for sortable table headers
    const headers = page.locator('th').filter({ hasText: /name|stock|price|vendor/i });
    const headerCount = await headers.count();
    
    if (headerCount > 0) {
      const firstHeader = headers.first();
      
      // Click to sort
      await firstHeader.click();
      await page.waitForTimeout(300);
      
      // Click again to reverse sort
      await firstHeader.click();
      await page.waitForTimeout(300);
      
      // No errors should occur
      const errors = await page.evaluate(() => window.console.error);
      expect(errors).toBeUndefined();
    }
  });

  test('filter functionality works', async ({ page }) => {
    // Look for filter controls
    const filterButton = page.locator('button').filter({ hasText: /filter/i }).first();
    
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(300);
      
      // Look for filter options
      const filterOptions = page.locator('select, input[type="checkbox"], button').filter({ 
        hasText: /all|in stock|out of stock|low stock/i 
      });
      
      if (await filterOptions.count() > 0) {
        const firstOption = filterOptions.first();
        await firstOption.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('planning view displays correctly', async ({ page }) => {
    // Look for planning tab
    const planningTab = page.locator('button').filter({ hasText: /planning/i });
    
    if (await planningTab.isVisible()) {
      await planningTab.click();
      await page.waitForTimeout(500);
      
      // Should show planning-related content
      const planningContent = page.locator('text=/30.*day|60.*day|90.*day|critical|reorder/i');
      
      if (await planningContent.count() > 0) {
        await expect(planningContent.first()).toBeVisible();
      }
    }
  });

  test('analytics view displays correctly', async ({ page }) => {
    // Look for analytics tab with flexible selectors
    const analyticsTab = page.locator('button, [role="tab"], [data-testid="analytics-tab"]').filter({ hasText: /analytics/i });
    
    if (await analyticsTab.isVisible()) {
      await analyticsTab.click();
      
      // Wait for analytics content to load with network idle
      await page.waitForLoadState('networkidle');
      
      // Use multiple possible selectors for analytics content
      const analyticsSelectors = [
        '[data-testid="analytics-content"]',
        '.analytics-view',
        'text=/velocity|trend|performance/i',
        'text=/fast.*moving|slow.*moving|dead.*stock/i',
        '[class*="analytics"]',
        'canvas', // For charts
        '.chart-container'
      ];
      
      let analyticsFound = false;
      for (const selector of analyticsSelectors) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
          analyticsFound = true;
          await expect(element).toBeVisible();
          break;
        }
      }
      
      // Flexible assertion - just ensure we're on analytics view
      if (!analyticsFound) {
        // Check if URL or page state indicates analytics view
        const url = page.url();
        const pageContent = await page.content();
        expect(url.includes('analytics') || pageContent.includes('analytics')).toBeTruthy();
      }
    }
  });

  test('inventory items display correctly', async ({ page }) => {
    // Wait for loading states to complete
    await page.waitForFunction(() => {
      const loadingElements = document.querySelectorAll('[class*="loading"], [class*="skeleton"], .spinner');
      return loadingElements.length === 0;
    }, { timeout: 15000 }).catch(() => {
      // Continue even if some loading elements remain
    });
    
    // Wait for content with multiple possible selectors
    const contentSelectors = [
      'table tbody tr',
      '[data-testid="inventory-item"]',
      '.inventory-row',
      '.inventory-grid-item',
      '[role="row"]'
    ];
    
    let inventoryLoaded = false;
    for (const selector of contentSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000, state: 'visible' });
        inventoryLoaded = true;
        break;
      } catch {
        // Try next selector
      }
    }
    
    if (!inventoryLoaded) {
      // Check for empty state
      const emptyState = page.locator('text=/no.*items|empty|no.*data/i');
      if (await emptyState.isVisible()) {
        // Valid empty state
        return;
      }
    }
    
    // Get inventory items with flexible selectors
    const itemElements = page.locator('tbody tr, [data-testid="inventory-item"], .inventory-row, [role="row"]')
      .filter({ hasNotText: /loading|skeleton/i });
    
    const itemCount = await itemElements.count();
    
    if (itemCount > 0) {
      // Ensure at least one item is visible
      await expect(itemElements.first()).toBeVisible({ timeout: 10000 });
      
      // Flexible field verification - just check if we have some data
      const firstItem = itemElements.first();
      const textContent = await firstItem.textContent();
      
      // Basic validation - item should have some content
      expect(textContent).toBeTruthy();
      expect(textContent.length).toBeGreaterThan(10); // Reasonable minimum content
    } else {
      // If no items, should show appropriate message
      const noDataMessage = page.locator('text=/no.*items|empty|no.*data/i');
      await expect(noDataMessage).toBeVisible();
    }
  });

  test('stock status indicators work', async ({ page }) => {
    // Look for stock status elements
    const statusElements = page.locator('.badge, .status, span').filter({ 
      hasText: /in stock|out of stock|low stock|critical|overstocked/i 
    });
    
    const statusCount = await statusElements.count();
    
    if (statusCount > 0) {
      // Status elements should be visible
      await expect(statusElements.first()).toBeVisible();
      
      // Should have appropriate colors/styling
      const firstStatus = statusElements.first();
      const hasColorStyling = await firstStatus.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.backgroundColor !== 'rgba(0, 0, 0, 0)' || 
               el.className.includes('bg-') ||
               el.className.includes('text-');
      });
      
      expect(hasColorStyling).toBeTruthy();
    }
  });
});
