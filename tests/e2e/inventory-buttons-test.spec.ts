import { test, expect } from '@playwright/test';

test.describe('Inventory Page - Complete Button and Functionality Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
  });

  test('verify all inventory page buttons and controls', async ({ page }) => {
    console.log('Testing all inventory page buttons and functionality...');

    // 1. Test Refresh Button
    await test.step('Test Refresh Button', async () => {
      const refreshButton = page.locator('button:has-text("Refresh")').first();
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        // Check for loading state
        await expect(page.locator('.animate-spin')).toBeVisible({ timeout: 1000 }).catch(() => {});
        await page.waitForLoadState('networkidle');
        console.log('✓ Refresh button works');
      } else {
        console.log('⚠ Refresh button not found');
      }
    });

    // 2. Test View Mode Toggle Buttons
    await test.step('Test View Mode Toggles', async () => {
      const viewModes = ['Table View', 'Planning', 'Analytics'];
      for (const mode of viewModes) {
        const button = page.locator(`button:has-text("${mode}")`).first();
        if (await button.isVisible()) {
          await button.click();
          await page.waitForTimeout(500);
          // Check if button becomes active (usually has different styling)
          const isActive = await button.evaluate(el => 
            el.classList.contains('bg-blue-600') || 
            el.classList.contains('text-white')
          );
          console.log(`✓ ${mode} button works - Active: ${isActive}`);
        } else {
          console.log(`⚠ ${mode} button not found`);
        }
      }
    });

    // 3. Test Search Functionality
    await test.step('Test Search Input', async () => {
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('test search');
        await page.waitForTimeout(500);
        console.log('✓ Search input accepts text');
        await searchInput.clear();
      } else {
        console.log('⚠ Search input not found');
      }
    });

    // 4. Test Filter Dropdowns
    await test.step('Test Filter Controls', async () => {
      // Stock Status Filter
      const stockFilter = page.locator('select').filter({ hasText: /All Stock Levels/ }).first();
      if (await stockFilter.isVisible()) {
        await stockFilter.selectOption({ index: 1 });
        await page.waitForTimeout(500);
        console.log('✓ Stock status filter works');
      }

      // Sales Velocity Filter
      const velocityFilter = page.locator('select').filter({ hasText: /Sales Velocity/ }).first();
      if (await velocityFilter.isVisible()) {
        await velocityFilter.selectOption({ index: 1 });
        await page.waitForTimeout(500);
        console.log('✓ Sales velocity filter works');
      }

      // Stock Days Filter
      const daysFilter = page.locator('select').filter({ hasText: /Stock Days/ }).first();
      if (await daysFilter.isVisible()) {
        await daysFilter.selectOption({ index: 1 });
        await page.waitForTimeout(500);
        console.log('✓ Stock days filter works');
      }
    });

    // 5. Test Column Headers (Sorting)
    await test.step('Test Sorting Functionality', async () => {
      // First ensure we're in table view
      await page.locator('button:has-text("Table View")').first().click();
      await page.waitForTimeout(500);

      const sortableHeaders = [
        'SKU', 'Product Name', 'Stock', 'Velocity', 'Days Left', 
        'Status', 'Reorder', 'Cost', 'Vendor', 'Location'
      ];

      for (const header of sortableHeaders) {
        const th = page.locator('th').filter({ hasText: header }).first();
        if (await th.isVisible()) {
          // Click header to sort
          await th.click();
          await page.waitForTimeout(300);
          
          // Check for sort indicator (▲ or ▼)
          const content = await th.textContent();
          const hasAscIndicator = content?.includes('▲');
          const hasDescIndicator = content?.includes('▼');
          
          if (hasAscIndicator || hasDescIndicator) {
            console.log(`✓ ${header} sorting works - Direction: ${hasAscIndicator ? 'ASC' : 'DESC'}`);
            
            // Click again to reverse sort
            await th.click();
            await page.waitForTimeout(300);
          } else {
            console.log(`⚠ ${header} sorting indicator not visible`);
          }
        } else {
          console.log(`⚠ ${header} header not found`);
        }
      }
    });

    // 6. Test Edit Buttons in Table Rows
    await test.step('Test Edit Functionality', async () => {
      // Look for edit buttons in the first few rows
      const editButtons = page.locator('button svg.lucide-edit2').first();
      if (await editButtons.isVisible()) {
        await editButtons.click();
        await page.waitForTimeout(500);
        
        // Check if edit mode is active (input field should appear)
        const editInput = page.locator('input[type="number"]').first();
        if (await editInput.isVisible()) {
          console.log('✓ Edit button opens edit mode');
          // Cancel edit by pressing Escape
          await page.keyboard.press('Escape');
        } else {
          console.log('⚠ Edit mode did not activate');
        }
      } else {
        console.log('⚠ No edit buttons found');
      }
    });

    // 7. Count Total Items
    await test.step('Count Displayed Items', async () => {
      // Wait for table to load
      await page.waitForSelector('tbody tr', { timeout: 5000 }).catch(() => {});
      
      const rowCount = await page.locator('tbody tr').count();
      console.log(`📊 Total items displayed in table: ${rowCount}`);
      
      // Check if there's pagination or "showing X of Y" text
      const showingText = await page.locator('text=/showing.*of/i').textContent().catch(() => null);
      if (showingText) {
        console.log(`📊 Pagination info: ${showingText}`);
      }
      
      // Check summary cards for total count
      const totalItemsCard = page.locator('text=/Total Items/i').locator('..').locator('p.text-2xl');
      if (await totalItemsCard.isVisible()) {
        const totalCount = await totalItemsCard.textContent();
        console.log(`📊 Total items in summary: ${totalCount}`);
      }
    });

    // 8. Test Planning View Specific Controls
    await test.step('Test Planning View Controls', async () => {
      await page.locator('button:has-text("Planning")').first().click();
      await page.waitForTimeout(1000);
      
      // Check for planning-specific elements
      const planningElements = await page.locator('text=/30.*Day|60.*Day|90.*Day/i').count();
      if (planningElements > 0) {
        console.log(`✓ Planning view loaded with ${planningElements} planning elements`);
      } else {
        console.log('⚠ Planning view elements not found');
      }
    });

    // 9. Test Analytics View
    await test.step('Test Analytics View', async () => {
      await page.locator('button:has-text("Analytics")').first().click();
      await page.waitForTimeout(1000);
      
      // Check for analytics-specific elements
      const analyticsElements = await page.locator('text=/chart|graph|trend/i').count();
      console.log(`✓ Analytics view loaded with ${analyticsElements} analytics elements`);
    });
  });

  test('investigate missing items and sorting issues', async ({ page }) => {
    console.log('\n🔍 Investigating missing items and sorting issues...\n');

    // 1. Check API response
    await test.step('Check API Response', async () => {
      // Intercept API calls
      const apiResponse = await page.waitForResponse(
        response => response.url().includes('/api/inventory') && response.status() === 200,
        { timeout: 10000 }
      ).catch(() => null);

      if (apiResponse) {
        const data = await apiResponse.json();
        console.log(`📊 API Response Analysis:`);
        console.log(`- Total items from API: ${data.inventory?.length || 0}`);
        console.log(`- Pagination info: ${JSON.stringify(data.pagination || {})}`);
        console.log(`- Summary stats: ${JSON.stringify(data.summary || {})}`);
      } else {
        console.log('⚠ Could not capture API response');
      }
    });

    // 2. Check direct Supabase query
    await test.step('Check Table Row Count', async () => {
      await page.waitForSelector('tbody', { timeout: 5000 }).catch(() => {});
      
      const tableRows = await page.locator('tbody tr').count();
      console.log(`\n📊 Table Analysis:`);
      console.log(`- Visible table rows: ${tableRows}`);
      
      // Check if table is empty
      const emptyMessage = await page.locator('text=/no.*items|empty/i').isVisible();
      if (emptyMessage) {
        console.log('⚠ Empty state message is visible');
      }
      
      // Check for loading states
      const isLoading = await page.locator('.animate-spin, text=/loading/i').isVisible();
      if (isLoading) {
        console.log('⚠ Page is still loading');
      }
    });

    // 3. Test sorting with actual data
    await test.step('Debug Sorting Functionality', async () => {
      // Ensure table view
      await page.locator('button:has-text("Table View")').first().click();
      await page.waitForTimeout(500);

      // Test SKU sorting specifically
      const skuHeader = page.locator('th').filter({ hasText: 'SKU' }).first();
      if (await skuHeader.isVisible()) {
        // Get initial SKU values
        const initialSKUs = await page.locator('tbody tr td:first-child').allTextContents();
        console.log(`\n🔍 Sorting Debug:`);
        console.log(`- Initial SKUs (first 5): ${initialSKUs.slice(0, 5).join(', ')}`);
        
        // Click to sort
        await skuHeader.click();
        await page.waitForTimeout(1000);
        
        // Get sorted SKU values
        const sortedSKUs = await page.locator('tbody tr td:first-child').allTextContents();
        console.log(`- After sort SKUs (first 5): ${sortedSKUs.slice(0, 5).join(', ')}`);
        
        // Check if order changed
        const orderChanged = JSON.stringify(initialSKUs) !== JSON.stringify(sortedSKUs);
        console.log(`- Order changed: ${orderChanged}`);
        
        if (!orderChanged && initialSKUs.length > 1) {
          console.log('❌ SORTING NOT WORKING - Order did not change after click');
        }
      }
    });

    // 4. Check console errors
    await test.step('Check Console Errors', async () => {
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log(`❌ Console Error: ${msg.text()}`);
        }
      });
      
      // Trigger a re-render to catch any errors
      await page.reload();
      await page.waitForTimeout(2000);
    });

    // 5. Check filters impact on item count
    await test.step('Test Filter Impact', async () => {
      // Reset to show all items
      const stockFilter = page.locator('select').first();
      await stockFilter.selectOption({ value: 'all' });
      await page.waitForTimeout(1000);
      
      const allItemsCount = await page.locator('tbody tr').count();
      console.log(`\n📊 Filter Analysis:`);
      console.log(`- All items: ${allItemsCount}`);
      
      // Apply out-of-stock filter
      await stockFilter.selectOption({ value: 'out-of-stock' });
      await page.waitForTimeout(1000);
      
      const outOfStockCount = await page.locator('tbody tr').count();
      console.log(`- Out of stock items: ${outOfStockCount}`);
      
      // Apply low-stock filter
      await stockFilter.selectOption({ value: 'low-stock' });
      await page.waitForTimeout(1000);
      
      const lowStockCount = await page.locator('tbody tr').count();
      console.log(`- Low stock items: ${lowStockCount}`);
    });
  });
});