import { test, expect } from '@playwright/test';

test.describe('Inventory Data and Sorting Investigation', () => {
  test('should investigate inventory data loading issues', async ({ page }) => {
    console.log('=== INVENTORY DATA INVESTIGATION ===');
    
    // Monitor network requests
    const requests: any[] = [];
    const responses: any[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });
    
    // Navigate to inventory page
    await page.goto('http://localhost:3001/inventory');
    await page.waitForLoadState('networkidle');
    
    console.log('\\n=== API REQUESTS ===');
    requests.forEach((req, i) => {
      console.log(`${i + 1}. ${req.method} ${req.url}`);
    });
    
    console.log('\\n=== API RESPONSES ===');
    responses.forEach((res, i) => {
      console.log(`${i + 1}. ${res.status} ${res.statusText} - ${res.url}`);
    });
    
    // Check direct API response
    const apiResponse = await page.request.get('http://localhost:3001/api/inventory');
    const apiData = await apiResponse.json();
    
    console.log('\\n=== DIRECT API CALL ===');
    console.log('Status:', apiResponse.status());
    console.log('Headers:', apiResponse.headers());
    
    if (Array.isArray(apiData)) {
      console.log('Items returned:', apiData.length);
      if (apiData.length > 0) {
        console.log('First item structure:', Object.keys(apiData[0]));
        console.log('First item data:', JSON.stringify(apiData[0], null, 2));
      }
    } else {
      console.log('API Response:', JSON.stringify(apiData, null, 2));
    }
    
    // Check what's actually displayed on the page
    await page.waitForTimeout(3000);
    
    const loadingElements = await page.locator('.loading, .spinner, [data-testid="loading"]').count();
    console.log('\\n=== PAGE STATE ===');
    console.log('Loading elements visible:', loadingElements);
    
    const tableRows = await page.locator('tbody tr').count();
    console.log('Table rows visible:', tableRows);
    
    const inventoryItems = await page.locator('[data-testid="inventory-item"]').count();
    console.log('Inventory items visible:', inventoryItems);
    
    const errorMessages = await page.locator('text=/error|failed|unable/i').count();
    console.log('Error messages visible:', errorMessages);
    
    // Get sample data from the page
    if (tableRows > 0) {
      const firstRowData = await page.locator('tbody tr').first().allTextContents();
      console.log('First row data:', firstRowData);
      
      const headers = await page.locator('thead th, th').allTextContents();
      console.log('Table headers:', headers);
    }
    
    // Check for JavaScript errors
    const jsErrors: string[] = [];
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });
    
    console.log('\\n=== JAVASCRIPT ERRORS ===');
    if (jsErrors.length > 0) {
      jsErrors.forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
    } else {
      console.log('No JavaScript errors detected');
    }
  });

  test('should investigate sorting functionality', async ({ page }) => {
    console.log('\\n=== SORTING INVESTIGATION ===');
    
    await page.goto('http://localhost:3001/inventory');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Check if table exists
    const hasTable = await page.locator('table').isVisible();
    console.log('Table visible:', hasTable);
    
    if (!hasTable) {
      console.log('No table found - checking for alternative structures');
      const gridItems = await page.locator('[data-testid*="item"], .inventory-item, .item-card').count();
      console.log('Grid/card items found:', gridItems);
      return;
    }
    
    // Get table headers
    const headers = page.locator('thead th, th');
    const headerCount = await headers.count();
    console.log('\\nTable headers found:', headerCount);
    
    for (let i = 0; i < headerCount; i++) {
      const header = headers.nth(i);
      const headerText = await header.textContent();
      const isClickable = await header.locator('button, [role="button"], .sortable').count() > 0;
      const hasCursor = await header.evaluate(el => getComputedStyle(el).cursor);
      
      console.log(`Header ${i + 1}: "${headerText}" - Clickable: ${isClickable} - Cursor: ${hasCursor}`);
    }
    
    // Test sorting on first sortable header
    let sortableHeaderIndex = -1;
    for (let i = 0; i < headerCount; i++) {
      const header = headers.nth(i);
      const isClickable = await header.locator('button, [role="button"], .sortable').count() > 0;
      const hasClickHandler = await header.evaluate(el => {
        const events = ['click', 'mousedown', 'mouseup'];
        return events.some(event => {
          const listeners = (el as any).getEventListeners ? (el as any).getEventListeners(event) : [];
          return listeners && listeners.length > 0;
        });
      });
      
      if (isClickable || hasClickHandler) {
        sortableHeaderIndex = i;
        break;
      }
    }
    
    if (sortableHeaderIndex >= 0) {
      console.log(`\\nTesting sort on header ${sortableHeaderIndex + 1}`);
      
      // Get initial data
      const initialRows = await page.locator('tbody tr').allTextContents();
      console.log('Initial row count:', initialRows.length);
      
      if (initialRows.length > 0) {
        console.log('First few rows before sort:', initialRows.slice(0, 3));
        
        // Click header to sort
        await headers.nth(sortableHeaderIndex).click();
        await page.waitForTimeout(1000);
        
        // Get data after sort
        const sortedRows = await page.locator('tbody tr').allTextContents();
        console.log('First few rows after sort:', sortedRows.slice(0, 3));
        
        // Compare
        const orderChanged = JSON.stringify(initialRows) !== JSON.stringify(sortedRows);
        console.log('Order changed after click:', orderChanged);
        
        if (!orderChanged) {
          console.log('ISSUE: Sorting did not change row order');
          
          // Check for sort indicators
          const sortIcons = await page.locator('svg, .sort-icon, .arrow, .asc, .desc').count();
          console.log('Sort indicators found:', sortIcons);
          
          // Check if any JavaScript errors occurred during sort
          page.on('pageerror', error => {
            console.log('JavaScript error during sort:', error.message);
          });
        } else {
          console.log('SUCCESS: Sorting is working');
        }
      }
    } else {
      console.log('No sortable headers found');
    }
  });

  test('should check database connectivity', async ({ page }) => {
    console.log('\\n=== DATABASE CONNECTIVITY CHECK ===');
    
    // Test various API endpoints
    const endpoints = [
      '/api/inventory',
      '/api/settings',
      '/api/sync-status-monitor',
      '/api/sync-logs'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await page.request.get(`http://localhost:3001${endpoint}`);
        const data = await response.json();
        
        console.log(`\\n${endpoint}:`);
        console.log(`  Status: ${response.status()}`);
        console.log(`  Data type: ${Array.isArray(data) ? 'Array' : typeof data}`);
        console.log(`  Data length/keys: ${Array.isArray(data) ? data.length : Object.keys(data).length}`);
        
        if (response.status() !== 200) {
          console.log(`  Error response: ${JSON.stringify(data)}`);
        }
      } catch (error) {
        console.log(`\\n${endpoint}: ERROR - ${error}`);
      }
    }
  });

  test('should analyze page performance', async ({ page }) => {
    console.log('\\n=== PERFORMANCE ANALYSIS ===');
    
    const startTime = Date.now();
    
    await page.goto('http://localhost:3001/inventory');
    
    // Measure time to first contentful paint
    const fcp = await page.evaluate(() => {
      return new Promise(resolve => {
        new PerformanceObserver(list => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            resolve(fcpEntry.startTime);
          }
        }).observe({ entryTypes: ['paint'] });
      });
    });
    
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    console.log(`Page load time: ${loadTime}ms`);
    console.log(`First Contentful Paint: ${fcp}ms`);
    
    // Check for large resources
    const requests = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map(entry => ({
        name: entry.name,
        size: (entry as any).transferSize || 0,
        duration: entry.duration || 0
      }));
    });
    
    const largeRequests = requests.filter(req => req.size > 100000); // > 100KB
    console.log('\\nLarge resources (>100KB):');
    largeRequests.forEach(req => {
      console.log(`  ${req.name}: ${Math.round(req.size / 1024)}KB (${Math.round(req.duration)}ms)`);
    });
    
    // Check memory usage
    const memoryInfo = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });
    
    if (memoryInfo) {
      console.log('\\nMemory usage:');
      console.log(`  Used: ${Math.round(memoryInfo.usedJSHeapSize / 1048576)}MB`);
      console.log(`  Total: ${Math.round(memoryInfo.totalJSHeapSize / 1048576)}MB`);
    }
  });
});
