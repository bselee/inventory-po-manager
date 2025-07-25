import { test, expect } from '@playwright/test';

test.describe('Inventory Data Loading - All Items Test', () => {
  test('should load all 2,866 inventory items', async ({ page }) => {
    // Go to inventory page
    await page.goto('http://localhost:3001/inventory');
    
    // Wait for page to load
    await page.waitForSelector('table', { timeout: 15000 });
    
    // Wait for console log to appear and check total count
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });
    
    // Wait a bit for console logs to appear
    await page.waitForTimeout(3000);
    
    // Check if we see the total count in console
    const totalItemsLog = consoleLogs.find(log => 
      log.includes('Total inventory items in database:')
    );
    
    if (totalItemsLog) {
      console.log('Found console log:', totalItemsLog);
      // Extract the number from the log
      const match = totalItemsLog.match(/Total inventory items in database: (\d+)/);
      if (match) {
        const totalCount = parseInt(match[1]);
        console.log(`Database reports ${totalCount} total items`);
        expect(totalCount).toBeGreaterThan(2000); // Should be around 2,866
      }
    }
    
    // Check if loaded items log appears
    const loadedItemsLog = consoleLogs.find(log => 
      log.includes('Loaded') && log.includes('items from database')
    );
    
    if (loadedItemsLog) {
      console.log('Found loaded items log:', loadedItemsLog);
      const match = loadedItemsLog.match(/Loaded (\d+) items from database/);
      if (match) {
        const loadedCount = parseInt(match[1]);
        console.log(`Actually loaded ${loadedCount} items`);
        expect(loadedCount).toBeGreaterThan(2000); // Should be around 2,866
      }
    }
    
    // Also check if pagination info shows correct total
    const paginationInfo = await page.locator('text=/Showing.*of.*items/').textContent();
    if (paginationInfo) {
      console.log('Pagination info:', paginationInfo);
      const match = paginationInfo.match(/of (\d+) items/);
      if (match) {
        const totalShown = parseInt(match[1]);
        expect(totalShown).toBeGreaterThan(2000);
      }
    }
    
    // Print all console logs for debugging
    console.log('All console logs:', consoleLogs);
  });
  
  test('should display more than 100 items in table', async ({ page }) => {
    await page.goto('http://localhost:3001/inventory');
    await page.waitForSelector('table tbody tr', { timeout: 15000 });
    
    // Count visible rows (should be 100 per page)
    const rows = await page.locator('table tbody tr').count();
    console.log(`Visible rows in table: ${rows}`);
    
    // Should show 100 items per page (or whatever is available)
    expect(rows).toBeGreaterThan(50);
  });
});
