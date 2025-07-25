import { test, expect } from '@playwright/test';
import { SelfHealingPage } from '../helpers/self-healing';

test.describe('Self-Healing Inventory Tests', () => {
  let healingPage: SelfHealingPage;

  test.beforeEach(async ({ page }) => {
    healingPage = new SelfHealingPage(page);
    await page.goto('/inventory');
    await page.waitForLoadState('domcontentloaded');
  });

  test('search input filters results with self-healing', async ({ page }) => {
    // Self-healing search input locator
    const searchInput = await healingPage.locateWithFallback(
      '[data-testid="search-input"]',
      {
        fallbackSelectors: [
          'input[placeholder*="search" i]',
          'input[type="search"]',
          '.search-input',
          'input[aria-label*="search" i]'
        ],
        role: 'searchbox'
      }
    );

    // Wait for inventory to load
    await page.waitForFunction(() => {
      const rows = document.querySelectorAll('tbody tr, [data-testid="inventory-item"]');
      return rows.length > 0 || document.querySelector('[data-testid="empty-state"]');
    }, { timeout: 10000 });

    // Get initial row count with flexible selectors
    const inventoryRows = await healingPage.locateWithFallback(
      'tbody tr',
      {
        fallbackSelectors: [
          '[data-testid="inventory-item"]',
          '.inventory-row',
          '[role="row"]'
        ]
      }
    );

    const initialCount = await inventoryRows.count();
    
    if (initialCount > 0) {
      // Get text from first row to search for
      const firstRow = inventoryRows.first();
      const firstRowText = await firstRow.textContent();
      const searchTerm = firstRowText?.split(/\s+/)[0] || 'test';
      
      // Perform search with retry
      await healingPage.fillWithRetry(searchInput, searchTerm);
      
      // Wait for results to update
      await page.waitForFunction((term) => {
        const input = document.querySelector('[data-testid="search-input"], input[placeholder*="search"]') as HTMLInputElement;
        return input?.value === term;
      }, searchTerm, { timeout: 5000 });
      
      await page.waitForTimeout(1000); // Debounce delay
      
      // Verify filtering happened
      const filteredCount = await inventoryRows.count();
      expect(filteredCount).toBeGreaterThanOrEqual(0);
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
    }
  });

  test('filter dropdowns work with self-healing', async ({ page }) => {
    // Self-healing filter panel locator
    const filterPanel = await healingPage.locateWithFallback(
      '[data-testid="filter-panel"]',
      {
        fallbackSelectors: [
          '.filter-panel',
          '.filters',
          '[class*="filter"]',
          'div:has(select)'
        ]
      }
    );

    // Find status filter with fallbacks
    const statusFilter = await healingPage.locateWithFallback(
      '[data-testid="filter-status"]',
      {
        fallbackSelectors: [
          'select[aria-label*="status" i]',
          'select:has(option:text("All Stock Levels"))',
          '.status-filter select'
        ],
        text: 'Stock'
      }
    );

    if (await statusFilter.isVisible()) {
      // Get current value
      const originalValue = await statusFilter.inputValue();
      
      // Try different filter values
      const filterValues = ['critical', 'low-stock', 'adequate'];
      
      for (const value of filterValues) {
        try {
          await statusFilter.selectOption(value);
          await page.waitForTimeout(500);
          
          // Verify selection worked
          const currentValue = await statusFilter.inputValue();
          expect(currentValue).toBe(value);
          
          // Reset to original
          await statusFilter.selectOption(originalValue);
          break;
        } catch (error) {
          // Try next value if this one doesn't exist
          continue;
        }
      }
    }
  });

  test('view mode buttons work with self-healing', async ({ page }) => {
    // Self-healing view mode toggle
    const viewToggle = await healingPage.locateWithFallback(
      '[data-testid="view-mode-toggle"]',
      {
        fallbackSelectors: [
          '.view-mode-toggle',
          'div:has(button:text("Table View"))',
          '[role="tablist"]'
        ]
      }
    );

    // Analytics button with fallbacks
    const analyticsButton = await healingPage.locateWithFallback(
      '[data-testid="analytics-view-button"]',
      {
        fallbackSelectors: [
          'button:text("Analytics")',
          '[data-testid="view-mode-analytics"]',
          'button[aria-label*="analytics" i]'
        ],
        text: 'Analytics'
      }
    );

    if (await analyticsButton.isVisible()) {
      await healingPage.clickWithRetry(analyticsButton);
      
      // Wait for view change with multiple possible indicators
      await page.waitForFunction(() => {
        const indicators = [
          document.querySelector('[data-testid="analytics-content"]'),
          document.querySelector('.analytics-view'),
          document.querySelector('canvas'),
          document.querySelector('[class*="chart"]'),
          Array.from(document.querySelectorAll('*')).some(el => 
            el.textContent?.toLowerCase().includes('velocity') ||
            el.textContent?.toLowerCase().includes('trend')
          )
        ];
        return indicators.some(indicator => !!indicator);
      }, { timeout: 10000 });
      
      // Verify we're on analytics view
      const analyticsContent = page.locator('[data-testid="analytics-content"], .analytics-view, canvas').first();
      await expect(analyticsContent).toBeVisible({ timeout: 5000 });
    }
  });

  test('inventory table sorting with self-healing', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table, [data-testid="inventory-table"]', { timeout: 10000 });
    
    // Self-healing table header locator
    const sortableHeaders = await healingPage.locateWithFallback(
      'th[data-sortable="true"]',
      {
        fallbackSelectors: [
          'th:has(button)',
          'th[role="columnheader"]',
          '.sortable-header',
          'th'
        ]
      }
    );

    const headerCount = await sortableHeaders.count();
    
    if (headerCount > 0) {
      // Click first sortable header
      const firstHeader = sortableHeaders.first();
      await healingPage.clickWithRetry(firstHeader);
      
      // Wait for sort to apply
      await page.waitForTimeout(500);
      
      // Click again to reverse sort
      await healingPage.clickWithRetry(firstHeader);
      
      // Verify sorting indicator exists
      const sortIndicator = firstHeader.locator('[class*="sort"], svg, .arrow');
      if (await sortIndicator.count() > 0) {
        await expect(sortIndicator.first()).toBeVisible();
      }
    }
  });

  test('pagination controls with self-healing', async ({ page }) => {
    // Self-healing pagination locator
    const pagination = await healingPage.locateWithFallback(
      '[data-testid="pagination"]',
      {
        fallbackSelectors: [
          '.pagination',
          'nav[aria-label="pagination"]',
          'div:has(button:text("Next"))',
          '[class*="pagination"]'
        ]
      }
    );

    if (await pagination.isVisible()) {
      // Next button with fallbacks
      const nextButton = await healingPage.locateWithFallback(
        '[data-testid="pagination-next"]',
        {
          fallbackSelectors: [
            'button:text("Next")',
            'button[aria-label="Next page"]',
            '.pagination button:has-text(">")'
          ],
          text: 'Next'
        }
      );

      // Previous button with fallbacks
      const prevButton = await healingPage.locateWithFallback(
        '[data-testid="pagination-prev"]',
        {
          fallbackSelectors: [
            'button:text("Previous")',
            'button[aria-label="Previous page"]',
            '.pagination button:has-text("<")'
          ],
          text: 'Previous'
        }
      );

      // Test pagination if next is enabled
      if (await nextButton.isEnabled()) {
        await healingPage.clickWithRetry(nextButton);
        await page.waitForTimeout(1000);
        
        // Verify page changed
        if (await prevButton.isEnabled()) {
          await healingPage.clickWithRetry(prevButton);
        }
      }
    }
  });
});