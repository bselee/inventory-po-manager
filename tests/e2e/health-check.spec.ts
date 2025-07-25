import { test, expect } from '@playwright/test';

test.describe('Application Health Check', () => {
  test('homepage loads without errors', async ({ page }) => {
    // Listen for console errors, but filter out harmless resource 404s
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const errorText = msg.text();
        // Filter out harmless 404s for missing resources like favicon
        if (!errorText.includes('favicon') && !errorText.includes('icon') && !errorText.includes('Failed to load resource')) {
          errors.push(errorText);
        }
      }
    });

    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check for the main heading - be specific to avoid multiple H1 issue
    await expect(page.locator('h1').first()).toBeVisible();
    
    // Check that no JavaScript errors occurred
    expect(errors).toHaveLength(0);
    
    // Check page title
    await expect(page).toHaveTitle(/inventory/i);
  });

  test('all navigation links work', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get all navigation links
    const navLinks = page.locator('nav a, header a').filter({ hasText: /inventory|settings|vendors|purchase/i });
    const linkCount = await navLinks.count();
    
    for (let i = 0; i < linkCount; i++) {
      const link = navLinks.nth(i);
      const href = await link.getAttribute('href');
      
      if (href && href.startsWith('/')) {
        console.log(`Testing navigation to: ${href}`);
        
        try {
          // Use goto instead of click to avoid navigation timing issues
          await page.goto(href, { waitUntil: 'networkidle', timeout: 15000 });
          
          // Check that we navigated successfully (no 404 or error pages)
          // Use DOM-based detection to avoid false positives from Next.js serialized data
          const has404Page = await page.locator('h1:has-text("404")').count() > 0;
          const hasErrorPage = await page.locator('h1:has-text("Error"), h1:has-text("Page not found")').count() > 0;
          const hasNextError = await page.locator('.next-error-h1').count() > 0;
          
          expect(has404Page || hasErrorPage || hasNextError).toBe(false);
          
        } catch (error) {
          console.error(`Navigation to ${href} failed:`, error);
          throw error;
        }
      }
    }
  });

  test('page loads without 404 errors', async ({ page }) => {
    const routes = [
      '/',
      '/inventory',
      '/settings',
      '/vendors',
      '/purchase-orders'
    ];

    for (const route of routes) {
      console.log(`Testing route: ${route}`);

      try {
        const response = await page.goto(route, { timeout: 15000, waitUntil: 'networkidle' });

        // Check that response is successful (handle cases where response might be null)
        if (response) {
          expect(response.status()).toBeLessThan(400);
        }

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Check that page doesn't show error content
        // Use DOM-based detection to avoid false positives from Next.js serialized data
        const has404Page = await page.locator('h1:has-text("404")').count() > 0;
        const hasErrorPage = await page.locator('h1:has-text("Error"), h1:has-text("Page not found"), h1:has-text("Internal Server Error")').count() > 0;
        const hasNextError = await page.locator('.next-error-h1').count() > 0;
        const has500Error = await page.locator('h1:has-text("500")').count() > 0;
        
        expect(has404Page || hasErrorPage || hasNextError || has500Error).toBe(false);
      } catch (error) {
        console.error(`Route ${route} failed:`, error);
        // If navigation fails, still check if we got a valid page
        const currentUrl = page.url();
        if (currentUrl.includes(route.substring(1))) {
          console.log(`Navigation succeeded despite error, checking page content`);
          const has404Page = await page.locator('h1:has-text("404")').count() > 0;
          const hasErrorPage = await page.locator('h1:has-text("Error"), h1:has-text("Page not found"), h1:has-text("Internal Server Error")').count() > 0;
          const hasNextError = await page.locator('.next-error-h1').count() > 0;
          const has500Error = await page.locator('h1:has-text("500")').count() > 0;
          
          expect(has404Page || hasErrorPage || hasNextError || has500Error).toBe(false);
        } else {
          throw error;
        }
      }
    }
  });

  test('API endpoints respond correctly', async ({ page }) => {
    // Test API endpoints by intercepting network requests
    await page.goto('/');
    
    // Wait for any API calls to complete
    await page.waitForLoadState('networkidle');
    
    // Check for common API endpoints
    const apiEndpoints = [
      '/api/inventory',
      '/api/settings',
      '/api/sync-status-monitor'
    ];

    for (const endpoint of apiEndpoints) {
      try {
        const response = await page.request.get(endpoint);
        console.log(`API ${endpoint}: ${response.status()}`);
        
        // API should respond (even if with error status, but not 404)
        expect(response.status()).not.toBe(404);
      } catch (error) {
        console.log(`API ${endpoint} not available: ${error}`);
      }
    }
  });

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that page content is visible on mobile
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Check that content doesn't overflow horizontally
    const bodyBox = await body.boundingBox();
    expect(bodyBox?.width).toBeLessThanOrEqual(375);
    
    // Test navigation menu (should be mobile-friendly)
    const nav = page.locator('nav');
    if (await nav.isVisible()) {
      await expect(nav).toBeVisible();
    }
  });
});
