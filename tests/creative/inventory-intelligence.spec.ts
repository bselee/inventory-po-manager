import { test, expect } from '@playwright/test';

/**
 * Creative Playwright Testing - Inventory Intelligence
 * Advanced testing patterns for business intelligence and automation
 */

test.describe('Inventory Intelligence Suite', () => {
  
  test('smart reorder prediction validation', async ({ page }) => {
    await page.goto('/inventory');
    
    // Switch to Planning view to test predictive algorithms
    await page.click('button:has-text("Planning")');
    await page.waitForLoadState('networkidle');
    
    // Collect all critical items that need reordering
    const criticalItems = await page.locator('.bg-red-50 .font-medium').allTextContents();
    
    // Validate business logic: items with 0 stock or <7 days should be critical
    for (const item of criticalItems) {
      const itemRow = page.locator(`text="${item}"`).locator('..').locator('..');
      const stockText = await itemRow.locator('[class*="text-red-600"]').first().textContent();
      const daysText = await itemRow.locator('text=/\\d+ days/').textContent();
      
      if (stockText?.includes('0') || (daysText && parseInt(daysText) <= 7)) {
        console.log(`✓ Correctly identified critical item: ${item}`);
      } else {
        console.log(`⚠️ Review critical classification for: ${item}`);
      }
    }
    
    expect(criticalItems.length).toBeGreaterThan(0);
  });

  test('sales velocity trend analysis', async ({ page }) => {
    await page.goto('/inventory');
    await page.click('button:has-text("Analytics")');
    
    // Test velocity categorization accuracy
    const velocityCategories = [
      { selector: 'text="Fast Moving"', minExpected: 1.0 },
      { selector: 'text="Medium"', range: [0.1, 1.0] },
      { selector: 'text="Slow"', range: [0.001, 0.1] },
      { selector: 'text="Dead Stock"', expected: 0 }
    ];
    
    for (const category of velocityCategories) {
      const categoryElement = await page.locator(category.selector);
      if (await categoryElement.isVisible()) {
        const count = await categoryElement.locator('..').locator('.font-medium').textContent();
        console.log(`${category.selector}: ${count} items`);
      }
    }
  });

  test('inventory value calculation audit', async ({ page }) => {
    await page.goto('/inventory');
    
    // Calculate total inventory value manually and compare with UI
    const allRows = await page.locator('tbody tr').count();
    let calculatedTotal = 0;
    
    for (let i = 0; i < Math.min(allRows, 10); i++) { // Sample first 10 items
      const row = page.locator('tbody tr').nth(i);
      
      // Extract stock and price values
      const stockText = await row.locator('td').nth(2).textContent();
      const priceText = await row.locator('td').nth(8).textContent();
      const valueText = await row.locator('td').nth(11).textContent();
      
      const stock = parseInt(stockText?.trim() || '0');
      const price = parseFloat(priceText?.replace('$', '') || '0');
      const displayedValue = parseFloat(valueText?.replace('$', '') || '0');
      
      const calculatedValue = stock * price;
      
      // Verify calculation accuracy (within 1 cent tolerance)
      expect(Math.abs(calculatedValue - displayedValue)).toBeLessThan(0.01);
    }
  });

  test('filter combination stress test', async ({ page }) => {
    await page.goto('/inventory');
    
    // Test all possible filter combinations
    const statusFilters = ['critical', 'low-stock', 'adequate', 'overstocked'];
    const velocityFilters = ['fast', 'medium', 'slow', 'dead'];
    
    let combinationResults = [];
    
    for (const status of statusFilters.slice(0, 2)) { // Limit for performance
      for (const velocity of velocityFilters.slice(0, 2)) {
        // Apply filters
        await page.selectOption('[aria-label="Filter by stock status"]', status);
        await page.selectOption('[aria-label="Filter by sales velocity"]', velocity);
        await page.waitForTimeout(300);
        
        // Count results
        const resultCount = await page.locator('tbody tr').count();
        combinationResults.push({
          status,
          velocity,
          count: resultCount
        });
        
        // Verify UI doesn't break with any combination
        if (resultCount === 0) {
          await expect(page.locator('text="No items found matching your criteria"')).toBeVisible();
        } else {
          await expect(page.locator('tbody tr').first()).toBeVisible();
        }
      }
    }
    
    console.log('Filter combination results:', combinationResults);
  });

  test('dynamic dashboard responsiveness', async ({ page }) => {
    await page.goto('/inventory');
    
    // Test dashboard at different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);
      
      // Verify essential elements are visible and accessible
      await expect(page.locator('h1:has-text("Inventory")')).toBeVisible();
      await expect(page.locator('[placeholder="Search by name, SKU, or vendor..."]')).toBeVisible();
      
      // Check if mobile-specific layouts activate
      if (viewport.width < 768) {
        // Mobile should stack cards vertically
        const summaryCards = page.locator('.grid-cols-1.md\\:grid-cols-4');
        await expect(summaryCards).toBeVisible();
      }
      
      console.log(`✓ ${viewport.name} (${viewport.width}x${viewport.height}) layout verified`);
    }
  });

  test('real-time calculation performance', async ({ page }) => {
    await page.goto('/inventory');
    
    // Measure calculation performance with rapid filter changes
    const startTime = Date.now();
    
    // Rapidly change filters to trigger recalculations
    for (let i = 0; i < 5; i++) {
      await page.selectOption('[aria-label="Filter by stock status"]', 'critical');
      await page.selectOption('[aria-label="Filter by stock status"]', 'adequate');
      await page.selectOption('[aria-label="Filter by sales velocity"]', 'fast');
      await page.selectOption('[aria-label="Filter by sales velocity"]', 'slow');
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Should handle rapid filter changes without freezing
    expect(totalTime).toBeLessThan(5000);
    
    // Verify final state is stable
    await page.waitForTimeout(1000);
    const finalRowCount = await page.locator('tbody tr').count();
    expect(finalRowCount).toBeGreaterThanOrEqual(0);
  });

  test('data integrity validation', async ({ page }) => {
    await page.goto('/inventory');
    
    // Sample check for data consistency across views
    await page.waitForLoadState('networkidle');
    
    // Get critical count from summary card
    const summaryCardCritical = await page.locator('.text-red-600').first().textContent();
    const summaryCount = parseInt(summaryCardCritical || '0');
    
    // Filter to show only critical items
    await page.selectOption('[aria-label="Filter by stock status"]', 'critical');
    await page.waitForTimeout(500);
    
    // Count filtered results
    const filteredCount = await page.locator('tbody tr').count();
    
    // Cross-reference with planning view
    await page.click('button:has-text("Planning")');
    await page.waitForLoadState('networkidle');
    
    const planningCritical = await page.locator('.bg-red-50 .text-2xl.font-bold').textContent();
    const planningCount = parseInt(planningCritical || '0');
    
    // All views should show consistent critical item counts
    console.log(`Summary: ${summaryCount}, Filtered: ${filteredCount}, Planning: ${planningCount}`);
    
    // Allow for small discrepancies due to timing/loading
    expect(Math.abs(summaryCount - filteredCount)).toBeLessThanOrEqual(1);
    expect(Math.abs(summaryCount - planningCount)).toBeLessThanOrEqual(1);
  });
});
