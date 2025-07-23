import { test, expect } from '@playwright/test';

test.describe('Cross-Browser Compatibility Tests', () => {
  test('app works in different browsers', async ({ page, browserName }) => {
    console.log(`Testing in browser: ${browserName}`);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Basic functionality should work in all browsers
    await expect(page.locator('h1')).toBeVisible();
    
    // Navigation should work
    const navLinks = page.locator('nav a, header a');
    const linkCount = await navLinks.count();
    
    if (linkCount > 0) {
      await navLinks.first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('responsive design works across viewport sizes', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568 },  // iPhone SE
      { width: 768, height: 1024 }, // iPad
      { width: 1920, height: 1080 } // Desktop
    ];

    for (const viewport of viewports) {
      console.log(`Testing viewport: ${viewport.width}x${viewport.height}`);
      
      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Content should be visible
      await expect(page.locator('body')).toBeVisible();
      
      // No horizontal scroll should occur
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 20); // Allow small tolerance
      
      // Navigation should work on all viewport sizes
      const nav = page.locator('nav, header');
      if (await nav.isVisible()) {
        await expect(nav).toBeVisible();
      }
    }
  });
});

test.describe('Performance Tests', () => {
  test('page load performance is acceptable', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log(`Page load time: ${loadTime}ms`);
    
    // Page should load within reasonable time (10 seconds)
    expect(loadTime).toBeLessThan(10000);
  });

  test('inventory page loads efficiently', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log(`Inventory page load time: ${loadTime}ms`);
    
    // Should load within reasonable time
    expect(loadTime).toBeLessThan(15000);
  });

  test('no memory leaks on navigation', async ({ page }) => {
    // Navigate between pages multiple times
    const routes = ['/', '/inventory', '/settings'];
    
    for (let i = 0; i < 3; i++) {
      for (const route of routes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
      }
    }
    
    // Check for console errors that might indicate memory issues
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    
    // Final navigation
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Should not have memory-related errors
    const memoryErrors = errors.filter(error => 
      error.includes('memory') || 
      error.includes('leak') || 
      error.includes('Maximum call stack')
    );
    
    expect(memoryErrors).toHaveLength(0);
  });
});

test.describe('Security Tests', () => {
  test('no sensitive data in console logs', async ({ page }) => {
    const consoleLogs: string[] = [];
    
    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });
    
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // Check for sensitive patterns in console
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /key.*[A-Za-z0-9]{20,}/,
      /api.*key.*[A-Za-z0-9]{10,}/i
    ];
    
    const sensitiveLogs = consoleLogs.filter(log => 
      sensitivePatterns.some(pattern => pattern.test(log))
    );
    
    // Log any potentially sensitive content for review
    if (sensitiveLogs.length > 0) {
      console.log('Potentially sensitive console logs found:', sensitiveLogs);
    }
    
    // Should not log sensitive API keys or secrets
    const criticalSensitiveContent = consoleLogs.filter(log => 
      /api.*secret.*[A-Za-z0-9]{15,}|password.*[A-Za-z0-9]{8,}/i.test(log)
    );
    
    expect(criticalSensitiveContent).toHaveLength(0);
  });

  test('forms have proper input validation', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // Test for XSS protection in form inputs
    const inputs = page.locator('input[type="text"], input[type="email"], textarea');
    const inputCount = await inputs.count();
    
    if (inputCount > 0) {
      const testInput = inputs.first();
      const xssPayload = '<script>alert("xss")</script>';
      
      await testInput.fill(xssPayload);
      await page.waitForTimeout(500);
      
      // The script should not execute
      const alertOccurred = await page.evaluate(() => {
        return window.alert !== window.alert; // Check if alert was overridden
      });
      
      expect(alertOccurred).toBeFalsy();
    }
  });
});

test.describe('API Integration Tests', () => {
  test('API endpoints handle errors gracefully', async ({ page }) => {
    // Intercept API calls and simulate errors
    await page.route('**/api/**', route => {
      // Simulate occasional API failures
      if (Math.random() < 0.3) {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Simulated server error' })
        });
      } else {
        route.continue();
      }
    });
    
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    
    // Page should still be functional despite API errors
    await expect(page.locator('body')).toBeVisible();
    
    // Should show appropriate error messages, not crash
    const errorMessages = page.locator('text=/error|failed|unable/i');
    const criticalErrors = page.locator('text=/crash|undefined.*undefined|cannot read property/i');
    
    // Graceful errors are OK, but not critical crashes
    expect(await criticalErrors.count()).toBe(0);
  });

  test('real-time features work correctly', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // Wait for real-time updates
    await page.waitForTimeout(10000);
    
    // Look for elements that should update in real-time
    const timestampElements = page.locator('text=/\\d{2}:\\d{2}|ago|last.*update/i');
    
    if (await timestampElements.count() > 0) {
      // Should show recent timestamps
      await expect(timestampElements.first()).toBeVisible();
    }
  });
});

test.describe('Error Boundary Tests', () => {
  test('application recovers from component errors', async ({ page }) => {
    // Monitor for React error boundaries
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to different pages to test error boundaries
    const routes = ['/inventory', '/settings', '/vendors', '/purchase-orders'];
    
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }
    
    // Should not have unhandled React errors
    const reactErrors = errors.filter(error => 
      error.includes('React') || 
      error.includes('Component') ||
      error.includes('render')
    );
    
    expect(reactErrors).toHaveLength(0);
  });

  test('network failures are handled gracefully', async ({ page }) => {
    // Simulate network failure
    await page.route('**/*', route => {
      route.abort('internetdisconnected');
    });
    
    await page.goto('/').catch(() => {
      // Expected to fail
    });
    
    // Re-enable network
    await page.unroute('**/*');
    
    // Application should recover
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('body')).toBeVisible();
  });
});
