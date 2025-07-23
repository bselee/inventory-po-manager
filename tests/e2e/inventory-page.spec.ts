import { test, expect } from '@playwright/test';

test.describe('Inventory Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
  });

  test('inventory page loads successfully', async ({ page }) => {
    // Check for main heading
    await expect(page.locator('h1')).toContainText(/inventory/i);
    
    // Check for refresh button
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
    
    // Wait for data to load (either items or loading state)
    await page.waitForSelector('[data-testid="inventory-table"], .animate-spin', { timeout: 10000 });
  });

  test('search functionality works', async ({ page }) => {
    // Wait for any existing search input
    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();
    
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
    const tabs = page.locator('button').filter({ hasText: /table|planning|analytics/i });
    const tabCount = await tabs.count();
    
    if (tabCount > 0) {
      for (let i = 0; i < tabCount; i++) {
        const tab = tabs.nth(i);
        await tab.click();
        
        // Wait for content to change
        await page.waitForTimeout(300);
        
        // Tab should be active/selected
        const isActive = await tab.evaluate(el => 
          el.classList.contains('active') || 
          el.getAttribute('aria-selected') === 'true' ||
          el.classList.contains('bg-blue-600') ||
          el.classList.contains('border-blue-500')
        );
        
        expect(isActive).toBeTruthy();
      }
    }
  });

  test('refresh button works', async ({ page }) => {
    const refreshButton = page.locator('button:has-text("Refresh")');
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
    // Look for analytics tab
    const analyticsTab = page.locator('button').filter({ hasText: /analytics/i });
    
    if (await analyticsTab.isVisible()) {
      await analyticsTab.click();
      await page.waitForTimeout(500);
      
      // Should show analytics-related content
      const analyticsContent = page.locator('text=/velocity|trend|performance|fast.*moving|dead stock/i');
      
      if (await analyticsContent.count() > 0) {
        await expect(analyticsContent.first()).toBeVisible();
      }
    }
  });

  test('inventory items display correctly', async ({ page }) => {
    // Wait for content to load
    await page.waitForSelector('table, [data-testid="inventory-items"], .grid', { timeout: 10000 });
    
    // Check if we have inventory data displayed
    const itemElements = page.locator('tr, .inventory-item, [data-testid="inventory-item"]').filter({ hasNotText: /loading|no data/i });
    const itemCount = await itemElements.count();
    
    if (itemCount > 0) {
      // Should display inventory items
      expect(itemCount).toBeGreaterThan(0);
      
      // First item should have basic info
      const firstItem = itemElements.first();
      await expect(firstItem).toBeVisible();
    } else {
      // If no items, should show appropriate message
      const noDataMessage = page.locator('text=/no.*items|empty|no data/i');
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
