# Sync Error Fix Prompts - Complete Troubleshooting Guide

## 🚨 Critical Issue: JSON Parsing Error

**Error**: `Unexpected token 'A', "An error o"... is not valid JSON`

### Root Cause Analysis Prompts

#### 1. Investigate the Finale API Response
```
Check what the Finale API is actually returning when sync fails:
- Look at the raw HTTP response from Finale API
- Determine if it's returning HTML error pages instead of JSON
- Check if authentication is failing
- Verify API endpoint URLs are correct
```

#### 2. Add Response Content-Type Validation
```
Before parsing JSON, check the Content-Type header:
- Ensure response has 'application/json' content type
- Log the actual content type received
- Handle text/html responses appropriately
- Add fallback for malformed responses
```

### Immediate Fix Prompts

#### 3. Create Safe JSON Parser
```typescript
// Add this method to FinaleApiService class
private async safeParseResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Finale API error ${response.status}: ${errorText}`);
  }
  
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch (jsonError) {
      const rawText = await response.text();
      throw new Error(`Invalid JSON from Finale: ${rawText.substring(0, 200)}`);
    }
  } else {
    const textResponse = await response.text();
    throw new Error(`Expected JSON but got ${contentType}: ${textResponse.substring(0, 200)}`);
  }
}
```

#### 4. Replace All JSON Parsing Calls
```
Find and replace all instances of:
- `await response.json()` → `await this.safeParseResponse(response)`
- Add proper error handling around each API call
- Log detailed error information for debugging
```

#### 5. Add Request Logging
```typescript
// Add comprehensive request/response logging
private async makeFinaleRequest(url: string, options: RequestInit = {}): Promise<Response> {
  console.log(`[Finale API] ${options.method || 'GET'} ${url}`);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': this.authHeader,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  console.log(`[Finale API] Response: ${response.status} ${response.statusText}`);
  console.log(`[Finale API] Content-Type: ${response.headers.get('content-type')}`);
  
  return response;
}
```

### Authentication Fix Prompts

#### 6. Verify Finale Authentication
```
Test authentication independently:
- Create a simple auth test endpoint
- Verify API key and secret are correct
- Check if account path is properly formatted
- Test with minimal API call (like /product?limit=1)
```

#### 7. Handle Authentication Errors
```typescript
// Add specific handling for auth failures
if (response.status === 401) {
  throw new Error('Finale authentication failed. Check API credentials.');
}
if (response.status === 403) {
  throw new Error('Finale access forbidden. Check account permissions.');
}
if (response.status === 404) {
  throw new Error('Finale endpoint not found. Check account path.');
}
```

### Network Error Handling Prompts

#### 8. Add Retry Logic
```typescript
// Implement exponential backoff for network errors
private async retryRequest<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`[Finale API] Retry ${attempt}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

#### 9. Add Circuit Breaker Pattern
```typescript
// Prevent cascading failures with circuit breaker
private failureCount = 0;
private lastFailureTime = 0;
private readonly maxFailures = 5;
private readonly resetTimeout = 300000; // 5 minutes

private isCircuitOpen(): boolean {
  if (this.failureCount >= this.maxFailures) {
    if (Date.now() - this.lastFailureTime < this.resetTimeout) {
      return true; // Circuit is open
    } else {
      this.failureCount = 0; // Reset circuit
    }
  }
  return false;
}
```

### Data Validation Prompts

#### 10. Validate Finale Response Structure
```typescript
// Add response validation
private validateFinaleResponse(data: any): boolean {
  if (!data) return false;
  
  // Check for expected Finale response structure
  const hasValidStructure = (
    data.productId || 
    data.error || 
    Array.isArray(data) ||
    typeof data === 'object'
  );
  
  return hasValidStructure;
}
```

#### 11. Handle Empty or Malformed Data
```
Add checks for:
- Empty response bodies
- Null or undefined data
- Malformed array structures
- Missing required fields
- Invalid date formats
```

### Testing Prompts

#### 12. Create Sync Error Test Suite
```typescript
// Add comprehensive sync error tests
describe('Finale Sync Error Handling', () => {
  test('handles non-JSON responses gracefully', async () => {
    // Mock HTML error page response
    // Verify proper error message
  });
  
  test('handles network timeouts', async () => {
    // Mock timeout scenario
    // Verify retry logic works
  });
  
  test('handles authentication failures', async () => {
    // Mock 401 response
    // Verify error handling
  });
});
```

## 🧪 Comprehensive Inventory Page Testing

### Enhanced Playwright Test Prompts

#### 13. Complete Page Load Testing
```typescript
test.describe('Inventory Page - Complete Load Testing', () => {
  test('page loads with all components', async ({ page }) => {
    await page.goto('/inventory');
    
    // Test all critical elements
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="refresh-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="inventory-table"]')).toBeVisible();
    
    // Test loading states
    const loadingIndicator = page.locator('.animate-spin');
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).toBeHidden({ timeout: 30000 });
    }
  });
});
```

#### 14. Search Functionality Testing
```typescript
test.describe('Inventory Search', () => {
  test('search filters inventory correctly', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('[data-testid="search-input"]');
    const inventoryTable = page.locator('[data-testid="inventory-table"]');
    
    // Get initial row count
    const initialRows = await inventoryTable.locator('tbody tr').count();
    
    // Search for specific item
    await searchInput.fill('test');
    await page.waitForTimeout(500);
    
    // Verify filtered results
    const filteredRows = await inventoryTable.locator('tbody tr').count();
    expect(filteredRows).toBeLessThanOrEqual(initialRows);
  });
  
  test('search handles special characters', async ({ page }) => {
    // Test search with special characters, numbers, etc.
  });
  
  test('search shows no results message when appropriate', async ({ page }) => {
    // Test empty search results
  });
});
```

#### 15. Table Interaction Testing
```typescript
test.describe('Inventory Table Interactions', () => {
  test('table sorting works correctly', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    
    // Test sorting by different columns
    const sortableHeaders = page.locator('th[data-sortable="true"]');
    const headerCount = await sortableHeaders.count();
    
    for (let i = 0; i < headerCount; i++) {
      await sortableHeaders.nth(i).click();
      await page.waitForTimeout(300);
      
      // Verify sort indicator
      await expect(sortableHeaders.nth(i)).toHaveClass(/sort-(asc|desc)/);
    }
  });
  
  test('table pagination works', async ({ page }) => {
    // Test pagination controls if they exist
    const paginationNext = page.locator('[data-testid="pagination-next"]');
    if (await paginationNext.isVisible()) {
      await paginationNext.click();
      await page.waitForTimeout(500);
      // Verify page change
    }
  });
  
  test('row selection works', async ({ page }) => {
    // Test checkbox selection functionality
    const checkboxes = page.locator('input[type="checkbox"]');
    if (await checkboxes.count() > 0) {
      await checkboxes.first().click();
      await expect(checkboxes.first()).toBeChecked();
    }
  });
});
```

#### 16. Data Accuracy Testing
```typescript
test.describe('Inventory Data Accuracy', () => {
  test('displays correct inventory quantities', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    
    // Verify quantity columns show numbers
    const quantityColumns = page.locator('[data-column="quantity"]');
    const count = await quantityColumns.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const text = await quantityColumns.nth(i).textContent();
      expect(text).toMatch(/^\d+$/);
    }
  });
  
  test('shows reorder alerts correctly', async ({ page }) => {
    // Test low stock indicators
    const lowStockIndicators = page.locator('[data-testid="low-stock-warning"]');
    if (await lowStockIndicators.count() > 0) {
      await expect(lowStockIndicators.first()).toBeVisible();
    }
  });
  
  test('displays last sync time', async ({ page }) => {
    const lastSyncElement = page.locator('[data-testid="last-sync-time"]');
    if (await lastSyncElement.isVisible()) {
      const syncText = await lastSyncElement.textContent();
      expect(syncText).toMatch(/\d{1,2}:\d{2}|\d+ (minute|hour|day)s? ago/);
    }
  });
});
```

#### 17. Sync Functionality Testing
```typescript
test.describe('Inventory Sync Operations', () => {
  test('manual sync button works', async ({ page }) => {
    await page.goto('/inventory');
    
    const syncButton = page.locator('[data-testid="sync-button"]');
    await syncButton.click();
    
    // Verify loading state
    await expect(page.locator('.animate-spin')).toBeVisible();
    
    // Wait for sync completion
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 60000 });
    
    // Verify success message
    await expect(page.locator('.alert-success, .toast-success')).toBeVisible();
  });
  
  test('handles sync errors gracefully', async ({ page }) => {
    // Mock sync error scenario
    await page.route('**/api/sync-finale', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Sync failed' })
      });
    });
    
    await page.goto('/inventory');
    const syncButton = page.locator('[data-testid="sync-button"]');
    await syncButton.click();
    
    // Verify error handling
    await expect(page.locator('.alert-error, .toast-error')).toBeVisible();
  });
});
```

#### 18. Performance Testing
```typescript
test.describe('Inventory Performance', () => {
  test('page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000); // 5 seconds max
  });
  
  test('handles large datasets efficiently', async ({ page }) => {
    // Test with mock large dataset
    await page.goto('/inventory');
    
    // Verify table virtualization or pagination
    const visibleRows = page.locator('tbody tr:visible');
    const rowCount = await visibleRows.count();
    
    expect(rowCount).toBeLessThanOrEqual(100); // Reasonable limit
  });
});
```

#### 19. Accessibility Testing
```typescript
test.describe('Inventory Accessibility', () => {
  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/inventory');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Test Enter key on focusable elements
    await page.keyboard.press('Enter');
  });
  
  test('screen reader compatibility', async ({ page }) => {
    await page.goto('/inventory');
    
    // Check for proper ARIA labels
    const table = page.locator('[data-testid="inventory-table"]');
    await expect(table).toHaveAttribute('role', 'table');
    
    // Check for alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();
    for (let i = 0; i < imageCount; i++) {
      await expect(images.nth(i)).toHaveAttribute('alt');
    }
  });
});
```

#### 20. Cross-Browser Testing
```typescript
// Add browser-specific tests
['chromium', 'firefox', 'webkit'].forEach(browserName => {
  test.describe(`Inventory Page - ${browserName}`, () => {
    test('works correctly in ' + browserName, async ({ page, browserName: currentBrowser }) => {
      test.skip(currentBrowser !== browserName);
      
      await page.goto('/inventory');
      await page.waitForLoadState('networkidle');
      
      // Test core functionality
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[data-testid="inventory-table"]')).toBeVisible();
    });
  });
});
```

### Implementation Order

1. **Fix sync errors** (Prompts 1-12)
2. **Enhance error handling** 
3. **Add comprehensive logging**
4. **Implement retry logic**
5. **Create thorough tests** (Prompts 13-20)
6. **Run complete test suite**
7. **Monitor and iterate**

### Validation Checklist

- [ ] JSON parsing errors eliminated
- [ ] Authentication properly handled
- [ ] Network errors gracefully managed
- [ ] All inventory page features tested
- [ ] Performance requirements met
- [ ] Accessibility standards followed
- [ ] Cross-browser compatibility verified

This comprehensive approach ensures both the sync errors are fixed and the inventory page is thoroughly tested across all scenarios.
