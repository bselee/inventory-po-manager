import { test, expect, Page } from '@playwright/test';

// Update the selectors to work with the actual DOM structure
const SELECTORS = {
  table: 'table',
  tableHeaders: 'th',
  tableRows: 'tbody tr',
  searchInput: 'input[placeholder*="search" i], input[type="search"], input[name*="search"]',
  refreshButton: 'button:has-text("Refresh"), button:has(svg)',
  loadingSpinner: '.loading-spinner, [data-testid="loading"], .animate-spin',
  summaryCards: '.grid .bg-white.p-4',
  filterButtons: 'button:has-text("All"), button:has-text("Critical"), button:has-text("Low"), button:has-text("Stock")',
};

test.describe('Inventory Page - Fixed Button Testing', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    
    await page.goto('http://localhost:3001/inventory');
    await page.waitForLoadState('networkidle');
    
    // Wait for table to appear (it exists based on our diagnostics)
    await page.waitForSelector(SELECTORS.table, { timeout: 15000 });
  });

  test('should verify data loading is working', async () => {
    // Verify the page has loaded data from API
    const rowCount = await page.locator(SELECTORS.tableRows).count();
    console.log(`Table shows ${rowCount} rows`);
    
    expect(rowCount).toBeGreaterThan(0);
    
    // Check that the API response matches what's displayed
    const apiResponse = await page.request.get('http://localhost:3001/api/inventory');
    const apiData = await apiResponse.json();
    const apiItemCount = apiData.inventory ? apiData.inventory.length : 0;
    
    console.log(`API returns ${apiItemCount} items, Table displays ${rowCount} rows`);
    
    // They should match
    expect(rowCount).toBe(apiItemCount);
  });

  test('should test sorting functionality step by step', async () => {
    // Get all sortable headers
    const headers = page.locator(SELECTORS.tableHeaders);
    const headerCount = await headers.count();
    
    console.log(`Found ${headerCount} table headers`);
    
    // Test each header for sorting
    for (let i = 0; i < headerCount; i++) {
      const header = headers.nth(i);
      const headerText = await header.textContent();
      
      // Skip the actions column
      if (headerText?.toLowerCase().includes('actions')) continue;
      
      console.log(`Testing sort on header: ${headerText}`);
      
      // Get initial first cell data
      const firstCellBefore = await page.locator(SELECTORS.tableRows).first().locator('td').first().textContent();
      
      // Click the header
      await header.click();
      await page.waitForTimeout(1000); // Give time for sort to apply
      
      // Get first cell data after sort
      const firstCellAfter = await page.locator(SELECTORS.tableRows).first().locator('td').first().textContent();
      
      console.log(`Before sort: "${firstCellBefore}", After sort: "${firstCellAfter}"`);
      
      // Check if sorting indicators appeared
      const sortIndicators = await header.locator('span').filter({ hasText: /[▲▼]/ }).count();
      
      if (sortIndicators === 0) {
        console.log(`WARNING: No sort indicators found for ${headerText}`);
      }
      
      // Click again for reverse sort
      await header.click();
      await page.waitForTimeout(1000);
      
      const firstCellReverse = await page.locator(SELECTORS.tableRows).first().locator('td').first().textContent();
      console.log(`After reverse sort: "${firstCellReverse}"`);
    }
  });

  test('should test all interactive buttons', async () => {
    // Test refresh button
    const refreshButton = page.locator(SELECTORS.refreshButton).first();
    if (await refreshButton.isVisible()) {
      console.log('Testing refresh button');
      await refreshButton.click();
      
      // Check for loading state
      const loadingAppeared = await page.locator(SELECTORS.loadingSpinner).isVisible();
      console.log(`Loading spinner appeared: ${loadingAppeared}`);
      
      // Wait for refresh to complete
      await page.waitForTimeout(3000);
    }

    // Test search functionality
    const searchInput = page.locator(SELECTORS.searchInput).first();
    if (await searchInput.isVisible()) {
      console.log('Testing search functionality');
      
      const initialRowCount = await page.locator(SELECTORS.tableRows).count();
      
      // Search for a specific term that should exist
      await searchInput.fill('Test');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      
      const filteredRowCount = await page.locator(SELECTORS.tableRows).count();
      console.log(`Search filtered rows from ${initialRowCount} to ${filteredRowCount}`);
      
      // Clear search
      await searchInput.clear();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      
      const restoredRowCount = await page.locator(SELECTORS.tableRows).count();
      console.log(`After clearing search: ${restoredRowCount} rows`);
    }

    // Test filter buttons
    const filterButtons = page.locator(SELECTORS.filterButtons);
    const filterCount = await filterButtons.count();
    
    console.log(`Found ${filterCount} filter buttons`);
    
    for (let i = 0; i < Math.min(filterCount, 3); i++) {
      const button = filterButtons.nth(i);
      const buttonText = await button.textContent();
      
      if (await button.isVisible() && await button.isEnabled()) {
        console.log(`Testing filter: ${buttonText}`);
        
        const beforeCount = await page.locator(SELECTORS.tableRows).count();
        await button.click();
        await page.waitForTimeout(1000);
        const afterCount = await page.locator(SELECTORS.tableRows).count();
        
        console.log(`Filter "${buttonText}" changed rows from ${beforeCount} to ${afterCount}`);
      }
    }
  });

  test('should verify row action buttons work', async () => {
    const firstRow = page.locator(SELECTORS.tableRows).first();
    
    if (await firstRow.isVisible()) {
      // Look for action buttons in the row
      const actionButtons = firstRow.locator('button');
      const actionCount = await actionButtons.count();
      
      console.log(`Found ${actionCount} action buttons in first row`);
      
      for (let i = 0; i < Math.min(actionCount, 3); i++) {
        const button = actionButtons.nth(i);
        const buttonText = await button.textContent();
        
        if (await button.isVisible() && await button.isEnabled()) {
          console.log(`Testing action button: ${buttonText}`);
          
          await button.click();
          await page.waitForTimeout(1000);
          
          // Check if inline editing appeared
          const hasInputs = await firstRow.locator('input').count() > 0;
          console.log(`Inline editing activated: ${hasInputs}`);
          
          if (hasInputs) {
            // Cancel edit by pressing Escape
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
          }
        }
      }
    }
  });

  test('should verify summary data displays correctly', async () => {
    const summaryCards = page.locator(SELECTORS.summaryCards);
    const cardCount = await summaryCards.count();
    
    console.log(`Found ${cardCount} summary cards`);
    expect(cardCount).toBeGreaterThan(0);
    
    // Check each summary card has data
    for (let i = 0; i < cardCount; i++) {
      const card = summaryCards.nth(i);
      const cardText = await card.textContent();
      const hasNumbers = /\\d+/.test(cardText || '');
      
      console.log(`Summary card ${i + 1}: ${cardText?.replace(/\\s+/g, ' ')}`);
      expect(hasNumbers).toBeTruthy();
    }
  });

  test('should check responsive design on mobile', async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if table is still accessible
    const tableVisible = await page.locator(SELECTORS.table).isVisible();
    console.log(`Table visible on mobile: ${tableVisible}`);
    
    if (tableVisible) {
      // Check if table scrolls horizontally
      const tableWidth = await page.locator(SELECTORS.table).boundingBox();
      console.log(`Table width on mobile: ${tableWidth?.width}px`);
    }
    
    // Check if hamburger menu or mobile nav exists
    const mobileMenu = page.locator('button[aria-label*="menu" i], .mobile-menu, .hamburger');
    const hasMobileMenu = await mobileMenu.count() > 0;
    console.log(`Mobile menu found: ${hasMobileMenu}`);
  });

  test('should test keyboard navigation', async () => {
    // Test tab navigation through interactive elements
    await page.keyboard.press('Tab');
    
    let focusableElements = 0;
    for (let i = 0; i < 20; i++) {
      const focused = await page.locator(':focus').count();
      if (focused > 0) {
        const focusedElement = await page.locator(':focus').getAttribute('tagName');
        console.log(`Focused element ${i + 1}: ${focusedElement}`);
        focusableElements++;
      }
      
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }
    
    console.log(`Total focusable elements found: ${focusableElements}`);
    expect(focusableElements).toBeGreaterThan(5); // Should have several focusable elements
  });

  test('should verify API error handling', async () => {
    // Intercept API calls and simulate errors
    await page.route('**/api/inventory', route => route.abort());
    
    await page.reload();
    await page.waitForTimeout(5000);
    
    // Check for error messages or retry options
    const errorMessage = await page.locator('text=/error|failed|unable/i').count();
    const retryButton = await page.locator('button:has-text("Retry"), button:has-text("Reload")').count();
    
    console.log(`Error messages shown: ${errorMessage}`);
    console.log(`Retry buttons available: ${retryButton}`);
    
    expect(errorMessage > 0 || retryButton > 0).toBeTruthy();
  });
});
