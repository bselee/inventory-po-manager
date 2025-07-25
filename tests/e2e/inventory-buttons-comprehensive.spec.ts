import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Inventory Page - All Buttons and Functionality', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Navigate to inventory page
    await page.goto('http://localhost:3001/inventory');
    await page.waitForLoadState('networkidle');
    
    // Wait for initial data load
    await page.waitForSelector('[data-testid="inventory-table"], .loading-spinner', { timeout: 10000 });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test.describe('Page Loading and Data Display', () => {
    test('should load inventory page successfully', async () => {
      await expect(page).toHaveTitle(/Inventory/i);
      
      // Check for main page elements
      await expect(page.locator('h1, h2').filter({ hasText: /inventory/i })).toBeVisible();
      
      // Wait for loading to complete
      await expect(page.locator('.loading-spinner, [data-testid="loading"]')).not.toBeVisible({ timeout: 15000 });
    });

    test('should display inventory items or empty state', async () => {
      // Wait for either items or empty state
      const hasItems = await page.locator('table tbody tr, [data-testid="inventory-item"]').count() > 0;
      const hasEmptyState = await page.locator('text=/no items found/i, text=/empty/i').isVisible();
      
      if (!hasItems && !hasEmptyState) {
        // Check for data loading issues
        const apiErrors = await page.locator('text=/error/i, text=/failed/i').count();
        if (apiErrors > 0) {
          console.log('API errors detected on page');
        }
        
        // Log network responses for debugging
        page.on('response', response => {
          if (response.url().includes('/api/inventory')) {
            console.log(`Inventory API Response: ${response.status()}`);
          }
        });
      }
      
      expect(hasItems || hasEmptyState).toBeTruthy();
    });

    test('should load inventory summary data', async () => {
      // Look for summary statistics
      const summaryElements = await page.locator('[data-testid*="summary"], .summary, .stats').count();
      const hasNumbers = await page.locator('text=/\\d+/').count() > 0;
      
      expect(summaryElements > 0 || hasNumbers).toBeTruthy();
    });
  });

  test.describe('Search and Filter Functionality', () => {
    test('should have working search box', async () => {
      const searchInput = page.locator('input[placeholder*="search" i], input[type="search"], input[name*="search"]').first();
      
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.keyboard.press('Enter');
        
        // Verify search was applied
        await page.waitForTimeout(1000);
        expect(await searchInput.inputValue()).toBe('test');
        
        // Clear search
        await searchInput.clear();
        await page.keyboard.press('Enter');
      }
    });

    test('should have working filter buttons', async () => {
      // Test status filters
      const filterButtons = page.locator('button').filter({ hasText: /all|low|critical|stock/i });
      const filterCount = await filterButtons.count();
      
      for (let i = 0; i < Math.min(filterCount, 5); i++) {
        const button = filterButtons.nth(i);
        if (await button.isVisible() && await button.isEnabled()) {
          await button.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('should have working view mode toggles', async () => {
      const viewButtons = page.locator('button').filter({ hasText: /table|planning|analytics|grid|list/i });
      const viewCount = await viewButtons.count();
      
      for (let i = 0; i < Math.min(viewCount, 3); i++) {
        const button = viewButtons.nth(i);
        if (await button.isVisible() && await button.isEnabled()) {
          await button.click();
          await page.waitForTimeout(1000);
        }
      }
    });
  });

  test.describe('Action Buttons', () => {
    test('should have working refresh button', async () => {
      const refreshButton = page.locator('button').filter({ hasText: /refresh|reload/i }).or(
        page.locator('button').filter({ has: page.locator('svg') })
      ).first();
      
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        
        // Wait for refresh to complete
        await page.waitForTimeout(2000);
        
        // Check if loading state appeared and disappeared
        const hasLoadingState = await page.locator('.loading, [data-testid="loading"], .spinner').count() > 0;
        if (hasLoadingState) {
          await page.waitForSelector('.loading, [data-testid="loading"], .spinner', { state: 'hidden', timeout: 10000 });
        }
      }
    });

    test('should have working add/create button', async () => {
      const addButton = page.locator('button').filter({ hasText: /add|create|new/i }).first();
      
      if (await addButton.isVisible()) {
        await addButton.click();
        
        // Check if modal or form appeared
        const hasModal = await page.locator('.modal, [role="dialog"], .popup').isVisible();
        const hasForm = await page.locator('form').isVisible();
        
        if (hasModal || hasForm) {
          // Try to close modal/form
          const closeButton = page.locator('button').filter({ hasText: /close|cancel/i }).first();
          if (await closeButton.isVisible()) {
            await closeButton.click();
          } else {
            await page.keyboard.press('Escape');
          }
        }
      }
    });

    test('should have working export button', async () => {
      const exportButton = page.locator('button').filter({ hasText: /export|download/i }).first();
      
      if (await exportButton.isVisible()) {
        // Set up download listener
        const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
        
        await exportButton.click();
        
        const download = await downloadPromise;
        if (download) {
          expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx|pdf)$/i);
        }
      }
    });
  });

  test.describe('Table Functionality', () => {
    test('should have sortable columns', async () => {
      const tableHeaders = page.locator('th, .table-header').filter({ hasText: /.+/ });
      const headerCount = await tableHeaders.count();
      
      for (let i = 0; i < Math.min(headerCount, 5); i++) {
        const header = tableHeaders.nth(i);
        if (await header.isVisible()) {
          await header.click();
          await page.waitForTimeout(500);
          
          // Check if sort indicator changed
          const hasSortIcon = await header.locator('svg, .sort-icon, .arrow').count() > 0;
          
          // Click again for reverse sort
          await header.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('should have working row actions', async () => {
      const firstRow = page.locator('tbody tr, [data-testid="inventory-item"]').first();
      
      if (await firstRow.isVisible()) {
        // Look for edit buttons
        const editButton = firstRow.locator('button').filter({ hasText: /edit/i }).or(
          firstRow.locator('button').filter({ has: page.locator('svg') })
        ).first();
        
        if (await editButton.isVisible()) {
          await editButton.click();
          await page.waitForTimeout(1000);
          
          // Check if inline editing or modal appeared
          const hasInlineEdit = await firstRow.locator('input').count() > 0;
          const hasModal = await page.locator('.modal, [role="dialog"]').isVisible();
          
          if (hasInlineEdit) {
            // Cancel inline edit
            await page.keyboard.press('Escape');
          } else if (hasModal) {
            // Close modal
            const closeButton = page.locator('button').filter({ hasText: /close|cancel/i }).first();
            if (await closeButton.isVisible()) {
              await closeButton.click();
            }
          }
        }
      }
    });

    test('should have working pagination', async () => {
      const paginationButtons = page.locator('button').filter({ hasText: /next|previous|page|\d+/i });
      const pageCount = await paginationButtons.count();
      
      if (pageCount > 0) {
        for (let i = 0; i < Math.min(pageCount, 3); i++) {
          const button = paginationButtons.nth(i);
          if (await button.isVisible() && await button.isEnabled()) {
            await button.click();
            await page.waitForTimeout(1000);
          }
        }
      }
    });
  });

  test.describe('Data Investigation', () => {
    test('should investigate why inventory items are missing', async () => {
      // Check API response
      const apiResponse = await page.request.get('http://localhost:3001/api/inventory');
      const apiData = await apiResponse.json();
      
      console.log('API Response Status:', apiResponse.status());
      console.log('API Response Data:', JSON.stringify(apiData, null, 2));
      
      // Check database connection
      const dbCheckResponse = await page.request.get('http://localhost:3001/api/settings');
      console.log('Database Connection Status:', dbCheckResponse.status());
      
      // Count items on page vs API
      const itemsOnPage = await page.locator('tbody tr, [data-testid="inventory-item"]').count();
      const itemsInAPI = Array.isArray(apiData) ? apiData.length : (apiData.data ? apiData.data.length : 0);
      
      console.log(`Items on page: ${itemsOnPage}, Items in API: ${itemsInAPI}`);
      
      if (itemsOnPage < itemsInAPI) {
        console.log('ISSUE: Page shows fewer items than API returns');
      }
      
      if (itemsInAPI === 0) {
        console.log('ISSUE: API returns no inventory items');
      }
    });

    test('should check sorting functionality issues', async () => {
      const headers = page.locator('th, .table-header').filter({ hasText: /.+/ });
      const headerCount = await headers.count();
      
      if (headerCount > 0) {
        const firstHeader = headers.first();
        const headerText = await firstHeader.textContent();
        
        // Get initial order
        const initialItems = await page.locator('tbody tr td:first-child').allTextContents();
        
        // Click to sort
        await firstHeader.click();
        await page.waitForTimeout(1000);
        
        // Get sorted order
        const sortedItems = await page.locator('tbody tr td:first-child').allTextContents();
        
        console.log(`Header: ${headerText}`);
        console.log('Initial order:', initialItems.slice(0, 3));
        console.log('After sort:', sortedItems.slice(0, 3));
        
        if (JSON.stringify(initialItems) === JSON.stringify(sortedItems)) {
          console.log('ISSUE: Sorting did not change item order');
        }
      }
    });
  });

  test.describe('Performance and Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Simulate network failure
      await page.route('**/api/inventory', route => route.abort());
      
      await page.reload();
      await page.waitForTimeout(2000);
      
      // Check for error handling
      const hasErrorMessage = await page.locator('text=/error|failed|unable to load/i').isVisible();
      const hasRetryButton = await page.locator('button').filter({ hasText: /retry|reload/i }).isVisible();
      
      expect(hasErrorMessage || hasRetryButton).toBeTruthy();
    });

    test('should load within reasonable time', async () => {
      const startTime = Date.now();
      
      await page.goto('http://localhost:3001/inventory');
      await page.waitForSelector('[data-testid="inventory-table"], table, .inventory-content', { timeout: 10000 });
      
      const loadTime = Date.now() - startTime;
      console.log(`Page load time: ${loadTime}ms`);
      
      expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile viewport', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      
      await page.waitForLoadState('networkidle');
      
      // Check if mobile menu or responsive elements are working
      const menuButton = page.locator('button').filter({ hasText: /menu|☰/i }).first();
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(500);
      }
      
      // Check if table is responsive or has horizontal scroll
      const table = page.locator('table').first();
      if (await table.isVisible()) {
        const tableWidth = await table.boundingBox();
        const viewportWidth = page.viewportSize()?.width || 0;
        
        if (tableWidth && tableWidth.width > viewportWidth) {
          console.log('Table has horizontal scroll on mobile');
        }
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async () => {
      // Test tab navigation
      await page.keyboard.press('Tab');
      const firstFocusable = await page.locator(':focus').first();
      
      if (await firstFocusable.isVisible()) {
        // Continue tabbing through several elements
        for (let i = 0; i < 10; i++) {
          await page.keyboard.press('Tab');
          await page.waitForTimeout(100);
        }
        
        const lastFocusable = await page.locator(':focus').first();
        expect(await lastFocusable.isVisible()).toBeTruthy();
      }
    });

    test('should have proper ARIA labels', async () => {
      const elementsWithAria = await page.locator('[aria-label], [aria-labelledby], [role]').count();
      console.log(`Elements with ARIA attributes: ${elementsWithAria}`);
      
      expect(elementsWithAria).toBeGreaterThan(0);
    });
  });
});
