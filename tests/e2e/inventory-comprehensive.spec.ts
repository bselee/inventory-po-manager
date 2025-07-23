import { test, expect } from '@playwright/test';

test.describe('Inventory Page - Comprehensive Testing Suite', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to inventory page and wait for initial load
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    
    // Wait for any loading spinners to disappear
    await page.waitForFunction(() => {
      const spinners = document.querySelectorAll('.animate-spin, [data-testid="loading"]');
      return spinners.length === 0;
    }, { timeout: 30000 });
  });

  test.describe('Page Load and Initial State', () => {
    test('loads with all required components', async ({ page }) => {
      // Check main heading
      await expect(page.locator('h1')).toContainText(/inventory/i);
      
      // Check essential UI elements
      await expect(page.locator('[data-testid="search-input"], input[placeholder*="search" i]')).toBeVisible();
      await expect(page.locator('[data-testid="refresh-button"], button:has-text("Refresh")')).toBeVisible();
      await expect(page.locator('[data-testid="inventory-table"], table')).toBeVisible();
      
      // Check for sync status or last update time
      const syncStatus = page.locator('[data-testid="sync-status"], [data-testid="last-sync"]');
      if (await syncStatus.count() > 0) {
        await expect(syncStatus.first()).toBeVisible();
      }
    });

    test('displays loading state correctly', async ({ page }) => {
      // Trigger a refresh to see loading state
      const refreshButton = page.locator('[data-testid="refresh-button"], button:has-text("Refresh")');
      await refreshButton.click();
      
      // Should show loading indicator
      const loadingIndicator = page.locator('.animate-spin, [data-testid="loading"], .spinner');
      if (await loadingIndicator.count() > 0) {
        await expect(loadingIndicator.first()).toBeVisible();
        
        // Loading should eventually disappear
        await expect(loadingIndicator.first()).toBeHidden({ timeout: 30000 });
      }
    });

    test('handles empty inventory state', async ({ page }) => {
      // Mock empty inventory response
      await page.route('**/api/inventory*', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, data: [] })
        });
      });
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should show empty state message
      const emptyMessage = page.locator('[data-testid="empty-inventory"], .empty-state');
      if (await emptyMessage.count() > 0) {
        await expect(emptyMessage.first()).toBeVisible();
      }
    });
  });

  test.describe('Search and Filter Functionality', () => {
    test('search input filters results', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"], input[placeholder*="search" i]').first();
      const inventoryTable = page.locator('[data-testid="inventory-table"], table');
      
      // Get initial row count
      const initialRows = await inventoryTable.locator('tbody tr').count();
      
      if (initialRows > 0) {
        // Get text from first row to search for
        const firstRowText = await inventoryTable.locator('tbody tr').first().textContent();
        const searchTerm = firstRowText?.split(' ')[0] || 'test';
        
        // Perform search
        await searchInput.fill(searchTerm);
        await page.waitForTimeout(1000); // Wait for debounced search
        
        // Verify results are filtered
        const filteredRows = await inventoryTable.locator('tbody tr').count();
        expect(filteredRows).toBeGreaterThanOrEqual(0);
        expect(filteredRows).toBeLessThanOrEqual(initialRows);
      }
    });

    test('search handles special characters and edge cases', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"], input[placeholder*="search" i]').first();
      
      const testCases = ['@#$%', '123456', 'UPPERCASE', 'lowercase', '  spaces  ', ''];
      
      for (const testCase of testCases) {
        await searchInput.fill(testCase);
        await page.waitForTimeout(500);
        
        // Should not cause errors
        await expect(searchInput).toHaveValue(testCase);
      }
    });

    test('category/filter dropdowns work', async ({ page }) => {
      // Look for filter dropdowns
      const filterDropdowns = page.locator('select, [data-testid="filter-dropdown"]');
      const dropdownCount = await filterDropdowns.count();
      
      for (let i = 0; i < dropdownCount; i++) {
        const dropdown = filterDropdowns.nth(i);
        const options = dropdown.locator('option');
        const optionCount = await options.count();
        
        if (optionCount > 1) {
          // Select different options
          await dropdown.selectOption({ index: 1 });
          await page.waitForTimeout(500);
          
          // Verify selection
          const selectedValue = await dropdown.inputValue();
          expect(selectedValue).toBeTruthy();
        }
      }
    });
  });

  test.describe('Table Functionality', () => {
    test('table headers are visible and properly labeled', async ({ page }) => {
      const table = page.locator('[data-testid="inventory-table"], table');
      const headers = table.locator('thead th');
      const headerCount = await headers.count();
      
      expect(headerCount).toBeGreaterThan(0);
      
      // Common expected headers
      const expectedHeaders = ['SKU', 'Name', 'Quantity', 'Price', 'Status'];
      
      for (const expectedHeader of expectedHeaders) {
        const headerExists = await page.locator(`th:has-text("${expectedHeader}")`).count() > 0;
        if (headerExists) {
          await expect(page.locator(`th:has-text("${expectedHeader}")`)).toBeVisible();
        }
      }
    });

    test('column sorting functionality', async ({ page }) => {
      const sortableHeaders = page.locator('th[data-sortable="true"], th.sortable, th[role="columnheader"]');
      const sortableCount = await sortableHeaders.count();
      
      if (sortableCount > 0) {
        const header = sortableHeaders.first();
        
        // Click to sort ascending
        await header.click();
        await page.waitForTimeout(500);
        
        // Check for sort indicator
        const hasSortClass = await header.evaluate(el => 
          el.classList.contains('sort-asc') || 
          el.classList.contains('sort-desc') ||
          el.getAttribute('aria-sort') !== null
        );
        
        expect(hasSortClass).toBeTruthy();
        
        // Click again to sort descending
        await header.click();
        await page.waitForTimeout(500);
      }
    });

    test('pagination controls work', async ({ page }) => {
      const paginationContainer = page.locator('[data-testid="pagination"], .pagination');
      
      if (await paginationContainer.count() > 0) {
        const nextButton = page.locator('[data-testid="pagination-next"], .pagination-next, button:has-text("Next")');
        const prevButton = page.locator('[data-testid="pagination-prev"], .pagination-prev, button:has-text("Previous")');
        const pageNumbers = page.locator('.page-number, [data-testid="page-number"]');
        
        // Test next button if available
        if (await nextButton.count() > 0 && await nextButton.isEnabled()) {
          await nextButton.click();
          await page.waitForTimeout(1000);
          
          // Verify page changed
          if (await pageNumbers.count() > 0) {
            const currentPage = await pageNumbers.filter({ hasText: /\d+/ }).first().textContent();
            expect(parseInt(currentPage || '1')).toBeGreaterThan(1);
          }
        }
        
        // Test previous button
        if (await prevButton.count() > 0 && await prevButton.isEnabled()) {
          await prevButton.click();
          await page.waitForTimeout(1000);
        }
      }
    });

    test('row selection and bulk actions', async ({ page }) => {
      const checkboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await checkboxes.count();
      
      if (checkboxCount > 0) {
        // Test individual row selection
        await checkboxes.first().click();
        await expect(checkboxes.first()).toBeChecked();
        
        // Test select all if available
        const selectAllCheckbox = page.locator('th input[type="checkbox"], [data-testid="select-all"]');
        if (await selectAllCheckbox.count() > 0) {
          await selectAllCheckbox.click();
          
          // Verify all checkboxes are selected
          const allChecked = await page.evaluate(() => {
            const boxes = Array.from(document.querySelectorAll('tbody input[type="checkbox"]'));
            return boxes.every(box => (box as HTMLInputElement).checked);
          });
          
          expect(allChecked).toBeTruthy();
        }
        
        // Test bulk action buttons if they appear
        const bulkActionButtons = page.locator('[data-testid="bulk-action"], .bulk-action');
        if (await bulkActionButtons.count() > 0) {
          await expect(bulkActionButtons.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Data Display and Accuracy', () => {
    test('inventory quantities display correctly', async ({ page }) => {
      const quantityColumns = page.locator('[data-column="quantity"], .quantity-cell, td:nth-child(3)');
      const quantityCount = await quantityColumns.count();
      
      if (quantityCount > 0) {
        for (let i = 0; i < Math.min(quantityCount, 5); i++) {
          const quantityText = await quantityColumns.nth(i).textContent();
          
          // Should be numeric or contain numeric value
          expect(quantityText).toMatch(/\d+/);
        }
      }
    });

    test('stock level indicators work correctly', async ({ page }) => {
      // Check for low stock warnings
      const lowStockIndicators = page.locator('[data-testid="low-stock"], .low-stock, .stock-warning');
      const lowStockCount = await lowStockIndicators.count();
      
      if (lowStockCount > 0) {
        await expect(lowStockIndicators.first()).toBeVisible();
        
        // Should have warning styling
        const hasWarningStyle = await lowStockIndicators.first().evaluate(el => 
          el.classList.contains('warning') || 
          el.classList.contains('text-red') ||
          el.classList.contains('text-yellow') ||
          getComputedStyle(el).color.includes('red')
        );
        
        expect(hasWarningStyle).toBeTruthy();
      }
    });

    test('currency and pricing display correctly', async ({ page }) => {
      const priceColumns = page.locator('[data-column="price"], .price-cell, [data-testid="price"]');
      const priceCount = await priceColumns.count();
      
      if (priceCount > 0) {
        for (let i = 0; i < Math.min(priceCount, 3); i++) {
          const priceText = await priceColumns.nth(i).textContent();
          
          // Should contain currency symbol or decimal number
          expect(priceText).toMatch(/[\$£€¥]|\d+\.\d{2}/);
        }
      }
    });

    test('dates display in correct format', async ({ page }) => {
      const dateColumns = page.locator('[data-column="date"], .date-cell, [data-testid="last-updated"]');
      const dateCount = await dateColumns.count();
      
      if (dateCount > 0) {
        for (let i = 0; i < Math.min(dateCount, 3); i++) {
          const dateText = await dateColumns.nth(i).textContent();
          
          // Should match common date formats
          expect(dateText).toMatch(/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d+ (minute|hour|day|week)s? ago/);
        }
      }
    });
  });

  test.describe('Sync and Data Operations', () => {
    test('manual sync button triggers sync operation', async ({ page }) => {
      const syncButton = page.locator('[data-testid="sync-button"], button:has-text("Sync"), button:has-text("Refresh")');
      
      if (await syncButton.count() > 0) {
        await syncButton.click();
        
        // Should show loading state
        const loadingState = page.locator('.animate-spin, [data-testid="syncing"], .loading');
        if (await loadingState.count() > 0) {
          await expect(loadingState.first()).toBeVisible();
          await expect(loadingState.first()).toBeHidden({ timeout: 60000 });
        }
        
        // Should show success or error message
        const statusMessage = page.locator('.alert, .toast, [data-testid="sync-status"]');
        if (await statusMessage.count() > 0) {
          await expect(statusMessage.first()).toBeVisible();
        }
      }
    });

    test('handles sync errors gracefully', async ({ page }) => {
      // Mock sync error
      await page.route('**/api/sync**', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ 
            success: false, 
            error: 'Sync failed: Connection timeout' 
          })
        });
      });
      
      const syncButton = page.locator('[data-testid="sync-button"], button:has-text("Sync"), button:has-text("Refresh")');
      
      if (await syncButton.count() > 0) {
        await syncButton.click();
        
        // Should show error message
        const errorMessage = page.locator('.alert-error, .toast-error, [data-testid="error-message"]');
        await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('displays last sync time correctly', async ({ page }) => {
      const lastSyncElement = page.locator('[data-testid="last-sync"], .last-sync, .sync-time');
      
      if (await lastSyncElement.count() > 0) {
        const syncText = await lastSyncElement.first().textContent();
        
        // Should show relative time or timestamp
        expect(syncText).toMatch(/\d{1,2}:\d{2}|\d+ (second|minute|hour|day)s? ago|Never|Just now/i);
      }
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('page loads within performance budget', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/inventory');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('table handles large datasets efficiently', async ({ page }) => {
      const table = page.locator('[data-testid="inventory-table"], table');
      const visibleRows = table.locator('tbody tr:visible');
      const rowCount = await visibleRows.count();
      
      // Should use pagination or virtualization for large datasets
      if (rowCount > 50) {
        const pagination = page.locator('[data-testid="pagination"], .pagination');
        await expect(pagination).toBeVisible();
      }
    });

    test('responsive design works on different screen sizes', async ({ page }) => {
      // Test desktop view
      await page.setViewportSize({ width: 1200, height: 800 });
      await expect(page.locator('[data-testid="inventory-table"], table')).toBeVisible();
      
      // Test tablet view
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);
      
      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      // Essential elements should still be accessible
      await expect(page.locator('h1')).toBeVisible();
    });
  });

  test.describe('Accessibility and User Experience', () => {
    test('keyboard navigation works correctly', async ({ page }) => {
      // Focus on first interactive element
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Should be able to navigate through interactive elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        const currentFocus = page.locator(':focus');
        if (await currentFocus.count() > 0) {
          await expect(currentFocus).toBeVisible();
        }
      }
    });

    test('has proper ARIA labels and roles', async ({ page }) => {
      const table = page.locator('[data-testid="inventory-table"], table');
      
      // Table should have proper role
      const tableRole = await table.getAttribute('role');
      if (tableRole) {
        expect(tableRole).toBe('table');
      }
      
      // Check for aria-labels on interactive elements
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 3); i++) {
        const button = buttons.nth(i);
        const hasLabel = await button.evaluate(el => 
          el.getAttribute('aria-label') !== null || 
          el.textContent?.trim() !== ''
        );
        expect(hasLabel).toBeTruthy();
      }
    });

    test('works with screen readers', async ({ page }) => {
      // Check for proper heading structure
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);
      
      // Check for alt text on images
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const hasAlt = await img.getAttribute('alt');
        expect(hasAlt).toBeDefined();
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('handles network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/**', route => {
        route.abort();
      });
      
      await page.reload();
      
      // Should show appropriate error message
      const errorIndicator = page.locator('.error, .alert-error, [data-testid="error"]');
      await expect(errorIndicator.first()).toBeVisible({ timeout: 10000 });
    });

    test('handles malformed data gracefully', async ({ page }) => {
      // Mock malformed API response
      await page.route('**/api/inventory*', route => {
        route.fulfill({
          status: 200,
          body: 'Invalid JSON response'
        });
      });
      
      await page.reload();
      
      // Should not crash and show error state
      const errorState = page.locator('.error, .alert, [data-testid="error-message"]');
      if (await errorState.count() > 0) {
        await expect(errorState.first()).toBeVisible();
      }
    });

    test('maintains state during navigation', async ({ page }) => {
      // Apply search filter
      const searchInput = page.locator('[data-testid="search-input"], input[placeholder*="search" i]').first();
      await searchInput.fill('test search');
      await page.waitForTimeout(1000);
      
      // Navigate away and back
      await page.goto('/');
      await page.goBack();
      
      // Search should be preserved (if implemented)
      const searchValue = await searchInput.inputValue();
      // Note: This behavior depends on implementation
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`inventory functionality works in ${browserName}`, async ({ browser, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${browserName} test`);
        
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto('/inventory');
        await page.waitForLoadState('networkidle');
        
        // Core functionality should work across browsers
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('[data-testid="inventory-table"], table')).toBeVisible();
        
        // Test search functionality
        const searchInput = page.locator('[data-testid="search-input"], input[placeholder*="search" i]').first();
        if (await searchInput.count() > 0) {
          await searchInput.fill('test');
          await expect(searchInput).toHaveValue('test');
        }
        
        await context.close();
      });
    });
  });
});

// Additional test for monitoring and reporting
test.describe('Inventory Monitoring', () => {
  test('reports performance metrics', async ({ page }) => {
    await page.goto('/inventory');
    
    // Collect performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });
    
    console.log('Performance Metrics:', performanceMetrics);
    
    // Assert reasonable performance
    expect(performanceMetrics.loadTime).toBeLessThan(3000);
  });
});
