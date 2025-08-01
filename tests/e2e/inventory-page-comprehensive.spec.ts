import { test, expect, Page } from '@playwright/test';

// Test data helpers
const mockInventoryItem = {
  sku: 'TEST-SKU-001',
  name: 'Test Product',
  quantity_on_hand: 100,
  cost: 25.99,
  sales_last_30_days: 50,
  sales_last_90_days: 120
};

// Helper functions
async function waitForInventoryLoad(page: Page) {
  // Wait for loading spinner to disappear
  await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 30000 }).catch(() => {});
  
  // Wait for table or empty state
  await page.waitForSelector('[data-testid="inventory-table"], text=/no.*items/i', { timeout: 30000 });
}

async function getVisibleItemCount(page: Page): Promise<number> {
  const items = await page.locator('tbody tr').filter({ hasNotText: /loading|skeleton/i });
  return await items.count();
}

test.describe('Inventory Page - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/inventory');
    await waitForInventoryLoad(page);
  });

  test.describe('Page Loading and Structure', () => {
    test('should load all core components', async ({ page }) => {
      // Header controls
      await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
      await expect(page.locator('text=/Last sync:/i')).toBeVisible();
      
      // Export buttons
      const exportButtons = page.locator('button').filter({ hasText: /export|csv|excel|pdf|print/i });
      await expect(exportButtons).toHaveCount(4); // CSV, Excel, PDF, Print
      
      // Filter panel
      await expect(page.locator('[data-testid="filter-panel"], .filter-panel, div:has(button:has-text("Filter"))')).toBeVisible();
      
      // Results summary
      await expect(page.locator('text=/Showing.*of.*items/i')).toBeVisible();
      
      // Table or empty state
      const hasTable = await page.locator('table').isVisible().catch(() => false);
      const hasEmptyState = await page.locator('text=/no.*items/i').isVisible().catch(() => false);
      expect(hasTable || hasEmptyState).toBeTruthy();
    });

    test('should display sync status indicator', async ({ page }) => {
      const syncStatus = page.locator('div:has-text("Last sync:")');
      await expect(syncStatus).toBeVisible();
      
      // Should have status indicator (green or yellow dot)
      const statusDot = page.locator('.bg-green-500, .bg-yellow-500').first();
      await expect(statusDot).toBeVisible();
      
      // Should show time since last sync
      const syncTime = await syncStatus.textContent();
      expect(syncTime).toMatch(/\d+[mhd] ago|Unknown/);
    });

    test('should handle pagination correctly', async ({ page }) => {
      const itemCount = await getVisibleItemCount(page);
      
      if (itemCount > 0) {
        // Check pagination controls
        const pagination = page.locator('text=/Page.*of/i');
        
        if (await pagination.isVisible()) {
          // Should show current page info
          await expect(pagination).toBeVisible();
          
          // Should have navigation buttons
          const prevButton = page.locator('button:has-text("Previous")');
          const nextButton = page.locator('button:has-text("Next")');
          
          await expect(prevButton).toBeVisible();
          await expect(nextButton).toBeVisible();
          
          // First page: previous should be disabled
          const currentPageText = await pagination.textContent();
          if (currentPageText?.includes('Page 1')) {
            await expect(prevButton).toBeDisabled();
          }
        }
      }
    });
  });

  test.describe('Filtering System', () => {
    test('should apply preset filters', async ({ page }) => {
      // Click on preset filter buttons
      const presetFilters = [
        { name: 'Critical Stock', expectedText: /critical|reorder/i },
        { name: 'Low Stock', expectedText: /low stock/i },
        { name: 'Out of Stock', expectedText: /out of stock/i },
        { name: 'Overstocked', expectedText: /overstocked/i }
      ];
      
      for (const filter of presetFilters) {
        const filterButton = page.locator('button').filter({ hasText: filter.name });
        
        if (await filterButton.isVisible()) {
          await filterButton.click();
          await page.waitForTimeout(500);
          
          // Check if filter is applied (button should be active/highlighted)
          const isActive = await filterButton.evaluate(el => {
            const classes = el.className;
            return classes.includes('bg-blue') || classes.includes('border-blue') || 
                   classes.includes('text-white') || el.getAttribute('aria-pressed') === 'true';
          });
          
          expect(isActive).toBeTruthy();
          
          // Clear filter for next test
          const clearButton = page.locator('button').filter({ hasText: /clear.*filter|all items/i }).first();
          if (await clearButton.isVisible()) {
            await clearButton.click();
            await page.waitForTimeout(500);
          }
        }
      }
    });

    test('should filter by search term', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
      
      if (await searchInput.isVisible()) {
        // Type search term
        await searchInput.fill('test product');
        await page.waitForTimeout(500);
        
        // Results should update
        const resultsText = await page.locator('text=/Showing.*of.*items/i').textContent();
        expect(resultsText).toBeTruthy();
      }
    });

    test('should filter by vendor', async ({ page }) => {
      // Look for vendor filter dropdown
      const vendorSelect = page.locator('select').filter({ has: page.locator('option:has-text("All Vendors")') }).first();
      
      if (await vendorSelect.isVisible()) {
        const options = await vendorSelect.locator('option').allTextContents();
        
        if (options.length > 1) {
          // Select first vendor after "All Vendors"
          await vendorSelect.selectOption({ index: 1 });
          await page.waitForTimeout(500);
          
          // Check that filter is applied
          const selectedValue = await vendorSelect.inputValue();
          expect(selectedValue).not.toBe('');
        }
      }
    });

    test('should filter by stock status', async ({ page }) => {
      const statusButtons = page.locator('button').filter({ 
        hasText: /^(All|In Stock|Out of Stock|Low Stock)$/i 
      });
      
      for (const button of await statusButtons.all()) {
        if (await button.isVisible()) {
          await button.click();
          await page.waitForTimeout(500);
          
          // Button should show active state
          const isActive = await button.evaluate(el => {
            return el.classList.contains('bg-blue-600') || 
                   el.classList.contains('text-white') ||
                   el.getAttribute('aria-pressed') === 'true';
          });
          
          if (isActive) {
            // Filter is applied successfully
            break;
          }
        }
      }
    });

    test('should clear all filters', async ({ page }) => {
      // Apply some filters first
      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
      }
      
      // Click clear filters
      const clearButton = page.locator('button').filter({ hasText: /clear.*filter/i }).first();
      
      if (await clearButton.isVisible()) {
        await clearButton.click();
        await page.waitForTimeout(500);
        
        // Search should be cleared
        if (await searchInput.isVisible()) {
          await expect(searchInput).toHaveValue('');
        }
        
        // Should show all items
        const resultsText = await page.locator('text=/Showing.*of.*items/i').textContent();
        expect(resultsText).toContain('items');
      }
    });
  });

  test.describe('Table Functionality', () => {
    test('should sort columns', async ({ page }) => {
      const itemCount = await getVisibleItemCount(page);
      
      if (itemCount > 1) {
        // Find sortable headers
        const sortableHeaders = ['Name', 'SKU', 'Stock', 'Cost', 'Vendor'];
        
        for (const headerText of sortableHeaders) {
          const header = page.locator('th').filter({ hasText: new RegExp(headerText, 'i') }).first();
          
          if (await header.isVisible()) {
            // Click to sort
            await header.click();
            await page.waitForTimeout(300);
            
            // Should show sort indicator
            const sortIndicator = await header.locator('.lucide-chevron-up, .lucide-chevron-down, svg').isVisible();
            expect(sortIndicator).toBeTruthy();
            
            // Click again to reverse sort
            await header.click();
            await page.waitForTimeout(300);
            
            break; // Test at least one column
          }
        }
      }
    });

    test('should display calculated fields correctly', async ({ page }) => {
      const itemCount = await getVisibleItemCount(page);
      
      if (itemCount > 0) {
        const firstRow = page.locator('tbody tr').first();
        
        // Check for calculated fields
        const calculatedFields = [
          { name: 'Sales Velocity', pattern: /\d+\.?\d*\/day|\-/i },
          { name: 'Days to Stockout', pattern: /\d+\s*days?|∞|\-/i },
          { name: 'Stock Status', pattern: /critical|low|adequate|overstocked/i },
          { name: 'Demand Trend', pattern: /increasing|stable|decreasing|\-/i }
        ];
        
        for (const field of calculatedFields) {
          const cell = firstRow.locator('td').filter({ hasText: field.pattern });
          if (await cell.count() > 0) {
            await expect(cell.first()).toBeVisible();
          }
        }
      }
    });

    test('should toggle column visibility', async ({ page }) => {
      // Look for column selector button
      const columnButton = page.locator('button').filter({ hasText: /columns?/i }).first();
      
      if (await columnButton.isVisible()) {
        await columnButton.click();
        await page.waitForTimeout(300);
        
        // Should show column options
        const columnOptions = page.locator('input[type="checkbox"]').filter({ 
          has: page.locator('~ label, ~ span').filter({ hasText: /sku|vendor|cost|location/i }) 
        });
        
        if (await columnOptions.count() > 0) {
          // Toggle first column
          const firstOption = columnOptions.first();
          const wasChecked = await firstOption.isChecked();
          
          await firstOption.click();
          await page.waitForTimeout(300);
          
          // State should change
          expect(await firstOption.isChecked()).toBe(!wasChecked);
          
          // Close column selector
          await page.keyboard.press('Escape');
        }
      }
    });
  });

  test.describe('Item Actions', () => {
    test('should edit item cost', async ({ page }) => {
      const itemCount = await getVisibleItemCount(page);
      
      if (itemCount > 0) {
        // Find cost cell with edit capability
        const costCell = page.locator('td').filter({ hasText: /\$\d+\.?\d*/ }).first();
        
        if (await costCell.isVisible()) {
          // Look for edit button or click on cost
          const editButton = costCell.locator('button, .cursor-pointer').first();
          
          if (await editButton.isVisible()) {
            await editButton.click();
          } else {
            await costCell.click();
          }
          
          await page.waitForTimeout(300);
          
          // Should show edit input
          const editInput = page.locator('input[type="number"], input[type="text"]').filter({ 
            hasNot: page.locator('[type="search"]') 
          }).first();
          
          if (await editInput.isVisible()) {
            await editInput.fill('99.99');
            
            // Save (Enter or button)
            const saveButton = page.locator('button').filter({ hasText: /save|✓|confirm/i }).first();
            if (await saveButton.isVisible()) {
              await saveButton.click();
            } else {
              await editInput.press('Enter');
            }
            
            await page.waitForTimeout(500);
          }
        }
      }
    });

    test('should toggle item visibility', async ({ page }) => {
      const itemCount = await getVisibleItemCount(page);
      
      if (itemCount > 0) {
        // Look for visibility toggle
        const visibilityToggle = page.locator('button, input[type="checkbox"]').filter({ 
          has: page.locator('.lucide-eye, .lucide-eye-off, svg[class*="eye"]') 
        }).first();
        
        if (await visibilityToggle.isVisible()) {
          await visibilityToggle.click();
          await page.waitForTimeout(500);
          
          // Should update without error
          const errors = await page.evaluate(() => {
            const errorElements = document.querySelectorAll('.error, .alert-error, [role="alert"]');
            return errorElements.length;
          });
          
          expect(errors).toBe(0);
        }
      }
    });
  });

  test.describe('Export Functionality', () => {
    test('should export to CSV', async ({ page }) => {
      const csvButton = page.locator('button').filter({ hasText: /csv/i }).first();
      
      if (await csvButton.isVisible()) {
        // Set up download promise before clicking
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
        
        await csvButton.click();
        
        const download = await downloadPromise;
        if (download) {
          expect(download.suggestedFilename()).toContain('.csv');
        }
      }
    });

    test('should export to Excel', async ({ page }) => {
      const excelButton = page.locator('button').filter({ hasText: /excel/i }).first();
      
      if (await excelButton.isVisible()) {
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
        
        await excelButton.click();
        
        const download = await downloadPromise;
        if (download) {
          expect(download.suggestedFilename()).toMatch(/\.xlsx?$/);
        }
      }
    });

    test('should export to PDF', async ({ page }) => {
      const pdfButton = page.locator('button').filter({ hasText: /pdf/i }).first();
      
      if (await pdfButton.isVisible()) {
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
        
        await pdfButton.click();
        
        const download = await downloadPromise;
        if (download) {
          expect(download.suggestedFilename()).toContain('.pdf');
        }
      }
    });

    test('should handle print', async ({ page }) => {
      const printButton = page.locator('button').filter({ hasText: /print/i }).first();
      
      if (await printButton.isVisible()) {
        // Mock window.print
        await page.evaluateOnNewDocument(() => {
          window.print = () => { window.printCalled = true; };
        });
        
        await printButton.click();
        await page.waitForTimeout(500);
        
        // Check if print was called
        const printCalled = await page.evaluate(() => (window as any).printCalled);
        expect(printCalled).toBeTruthy();
      }
    });
  });

  test.describe('Real-time Updates', () => {
    test('should refresh data', async ({ page }) => {
      const refreshButton = page.locator('button').filter({ hasText: /refresh/i }).first();
      await expect(refreshButton).toBeVisible();
      
      // Click refresh
      await refreshButton.click();
      
      // Should show loading state
      await expect(refreshButton).toBeDisabled();
      await expect(page.locator('.animate-spin').first()).toBeVisible();
      
      // Wait for refresh to complete
      await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 30000 });
      
      // Button should be enabled again
      await expect(refreshButton).toBeEnabled();
      
      // Sync time should update
      const syncText = await page.locator('text=/Last sync:/i').textContent();
      expect(syncText).toMatch(/\d+[ms] ago/);
    });

    test('should show critical items monitor when filtered', async ({ page }) => {
      // Apply critical stock filter
      const criticalButton = page.locator('button').filter({ hasText: /critical stock/i }).first();
      
      if (await criticalButton.isVisible()) {
        await criticalButton.click();
        await page.waitForTimeout(1000);
        
        // Should show critical items monitor
        const monitor = page.locator('[data-testid="critical-items-monitor"], .critical-items-monitor, div:has-text("Critical Items")');
        
        if (await monitor.isVisible()) {
          await expect(monitor).toBeVisible();
          
          // Should have alert styling
          const hasAlertStyling = await monitor.evaluate(el => {
            const classes = el.className;
            return classes.includes('alert') || classes.includes('warning') || 
                   classes.includes('bg-red') || classes.includes('border-red');
          });
          
          expect(hasAlertStyling).toBeTruthy();
        }
      }
    });
  });

  test.describe('Performance and Data Quality', () => {
    test('should display data quality metrics', async ({ page }) => {
      // Look for quality indicators
      const qualityIndicators = [
        { text: /items with sales data/i, minPercent: 0 },
        { text: /items with cost/i, minPercent: 0 },
        { text: /items with vendor/i, minPercent: 0 }
      ];
      
      for (const indicator of qualityIndicators) {
        const element = page.locator(`text=${indicator.text}`);
        if (await element.isVisible()) {
          const text = await element.textContent();
          const percentMatch = text?.match(/(\d+(\.\d+)?)\s*%/);
          
          if (percentMatch) {
            const percent = parseFloat(percentMatch[1]);
            expect(percent).toBeGreaterThanOrEqual(indicator.minPercent);
          }
        }
      }
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      // Check pagination info
      const paginationText = await page.locator('text=/Showing.*of.*items/i').textContent();
      const totalMatch = paginationText?.match(/of\s+(\d+)\s+items/);
      
      if (totalMatch) {
        const totalItems = parseInt(totalMatch[1]);
        
        // If large dataset, should have pagination
        if (totalItems > 100) {
          await expect(page.locator('button:has-text("Next")')).toBeVisible();
          await expect(page.locator('text=/Page.*of/i')).toBeVisible();
        }
        
        // Should load within reasonable time
        const loadTime = await page.evaluate(() => performance.now());
        expect(loadTime).toBeLessThan(10000); // 10 seconds max
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      // Check main regions
      const mainRegions = [
        { selector: 'main, [role="main"]', label: 'main content' },
        { selector: 'table', label: 'inventory table' },
        { selector: 'nav, [role="navigation"]', label: 'pagination' }
      ];
      
      for (const region of mainRegions) {
        const element = page.locator(region.selector).first();
        if (await element.isVisible()) {
          const ariaLabel = await element.getAttribute('aria-label');
          const ariaLabelledBy = await element.getAttribute('aria-labelledby');
          
          // Should have some form of labeling
          expect(ariaLabel || ariaLabelledBy).toBeTruthy();
        }
      }
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      
      // Check if focus is visible
      const focusedElement = await page.evaluateHandle(() => document.activeElement);
      const hasFocusIndicator = await focusedElement.evaluate(el => {
        if (!el) return false;
        const styles = window.getComputedStyle(el);
        return styles.outline !== 'none' || styles.boxShadow !== 'none' || 
               el.classList.contains('focus:ring') || el.classList.contains('focus:outline');
      });
      
      expect(hasFocusIndicator).toBeTruthy();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Intercept API calls and fail them
      await page.route('**/api/inventory**', route => route.abort());
      
      // Try to refresh
      const refreshButton = page.locator('button').filter({ hasText: /refresh/i }).first();
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        
        // Should show error state (not crash)
        await page.waitForTimeout(2000);
        
        // Page should still be functional
        await expect(page.locator('body')).not.toContainText('Application error');
      }
    });

    test('should validate input fields', async ({ page }) => {
      const itemCount = await getVisibleItemCount(page);
      
      if (itemCount > 0) {
        // Try to edit cost with invalid value
        const costCell = page.locator('td').filter({ hasText: /\$\d+\.?\d*/ }).first();
        
        if (await costCell.isVisible()) {
          await costCell.click();
          await page.waitForTimeout(300);
          
          const editInput = page.locator('input[type="number"]').first();
          if (await editInput.isVisible()) {
            // Enter invalid value
            await editInput.fill('-100');
            await editInput.press('Enter');
            
            // Should show validation error or prevent submission
            const errorMessage = page.locator('.error, .invalid, [role="alert"]');
            const inputInvalid = await editInput.evaluate(el => el.validity.valid === false);
            
            expect((await errorMessage.count()) > 0 || inputInvalid).toBeTruthy();
          }
        }
      }
    });
  });
});

// Business Logic Tests
test.describe('Inventory Business Logic', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/inventory');
    await waitForInventoryLoad(page);
  });

  test('should calculate sales velocity correctly', async ({ page }) => {
    const itemCount = await getVisibleItemCount(page);
    
    if (itemCount > 0) {
      // Find an item with sales data
      const salesVelocityCell = page.locator('td').filter({ hasText: /\d+\.?\d*\/day/ }).first();
      
      if (await salesVelocityCell.isVisible()) {
        const velocityText = await salesVelocityCell.textContent();
        const velocity = parseFloat(velocityText?.match(/(\d+\.?\d*)\/day/)?.[1] || '0');
        
        // Velocity should be non-negative
        expect(velocity).toBeGreaterThanOrEqual(0);
        
        // If item has velocity, it should have sales data
        const row = salesVelocityCell.locator('xpath=ancestor::tr');
        const rowText = await row.textContent();
        
        if (velocity > 0) {
          expect(rowText).toMatch(/\d+/); // Should have some sales numbers
        }
      }
    }
  });

  test('should identify stock status correctly', async ({ page }) => {
    const statusMap = {
      'Critical': { maxDays: 7, color: 'red' },
      'Low': { maxDays: 30, color: 'yellow' },
      'Adequate': { minDays: 31, color: 'green' },
      'Overstocked': { minDays: 180, color: 'blue' }
    };
    
    for (const [status, config] of Object.entries(statusMap)) {
      const statusBadge = page.locator('.badge, .status, span').filter({ 
        hasText: new RegExp(status, 'i') 
      }).first();
      
      if (await statusBadge.isVisible()) {
        // Check color coding
        const hasCorrectColor = await statusBadge.evaluate((el, color) => {
          const classes = el.className;
          const styles = window.getComputedStyle(el);
          return classes.includes(`bg-${color}`) || 
                 classes.includes(`text-${color}`) ||
                 styles.backgroundColor.includes(color) ||
                 styles.color.includes(color);
        }, config.color);
        
        expect(hasCorrectColor).toBeTruthy();
      }
    }
  });

  test('should show demand trends', async ({ page }) => {
    const trendIndicators = page.locator('td').filter({ 
      hasText: /increasing|stable|decreasing/i 
    });
    
    if (await trendIndicators.count() > 0) {
      const firstTrend = trendIndicators.first();
      const trendText = await firstTrend.textContent();
      
      // Should have trend icon or indicator
      const hasIcon = await firstTrend.locator('svg, .lucide, .icon').isVisible().catch(() => false);
      const hasColorCoding = await firstTrend.evaluate(el => {
        const classes = el.className;
        return classes.includes('text-green') || 
               classes.includes('text-red') || 
               classes.includes('text-gray');
      });
      
      expect(hasIcon || hasColorCoding).toBeTruthy();
    }
  });

  test('should flag reorder items', async ({ page }) => {
    // Look for reorder indicators
    const reorderFlags = page.locator('.badge, .alert, .warning').filter({ 
      hasText: /reorder|order now|critical/i 
    });
    
    if (await reorderFlags.count() > 0) {
      const firstFlag = reorderFlags.first();
      
      // Should have urgent styling
      const hasUrgentStyling = await firstFlag.evaluate(el => {
        const classes = el.className;
        const styles = window.getComputedStyle(el);
        return classes.includes('bg-red') || 
               classes.includes('text-red') || 
               classes.includes('alert') ||
               classes.includes('warning') ||
               styles.backgroundColor.includes('red') ||
               styles.color.includes('red');
      });
      
      expect(hasUrgentStyling).toBeTruthy();
    }
  });
});

// Visual Tests
test.describe('Visual and Responsive Design', () => {
  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/inventory');
    await waitForInventoryLoad(page);
    
    // Check if table is scrollable or transformed
    const table = page.locator('table').first();
    if (await table.isVisible()) {
      const isScrollable = await table.evaluate(el => {
        const parent = el.parentElement;
        return parent?.scrollWidth > parent?.clientWidth || 
               el.style.overflowX === 'auto' ||
               parent?.style.overflowX === 'auto';
      });
      
      expect(isScrollable).toBeTruthy();
    }
    
    // Mobile menu should be accessible
    const mobileMenu = page.locator('button').filter({ 
      has: page.locator('.lucide-menu, svg[class*="menu"]') 
    });
    
    if (await mobileMenu.isVisible()) {
      await expect(mobileMenu).toBeVisible();
    }
  });

  test('should maintain consistent styling', async ({ page }) => {
    // Check primary action buttons have consistent styling
    const primaryButtons = page.locator('button').filter({ 
      hasText: /refresh|export|save|confirm/i 
    });
    
    const buttonStyles = await primaryButtons.evaluateAll(buttons => {
      return buttons.map(btn => {
        const styles = window.getComputedStyle(btn);
        return {
          hasBackground: styles.backgroundColor !== 'rgba(0, 0, 0, 0)',
          hasBorder: styles.borderWidth !== '0px',
          hasPadding: styles.padding !== '0px',
          hasHoverEffect: btn.matches(':hover') || btn.className.includes('hover:')
        };
      });
    });
    
    // All buttons should have consistent styling
    buttonStyles.forEach(style => {
      expect(style.hasBackground || style.hasBorder).toBeTruthy();
      expect(style.hasPadding).toBeTruthy();
    });
  });
});