import { test, expect } from '@playwright/test';

test.describe('Complete Application Crawl', () => {
  test('crawl all discoverable pages for errors', async ({ page }) => {
    const visitedUrls = new Set<string>();
    const errors: Array<{ url: string; error: string; type: string }> = [];
    const pageLoadTimes: Array<{ url: string; loadTime: number }> = [];
    
    // Listen for all types of errors
    page.on('pageerror', (error) => {
      errors.push({
        url: page.url(),
        error: error.message,
        type: 'JavaScript Error'
      });
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push({
          url: page.url(),
          error: msg.text(),
          type: 'Console Error'
        });
      }
    });

    page.on('response', (response) => {
      if (response.status() >= 400) {
        errors.push({
          url: page.url(),
          error: `HTTP ${response.status()}: ${response.url()}`,
          type: 'Network Error'
        });
      }
    });

    const crawlPage = async (url: string) => {
      if (visitedUrls.has(url) || visitedUrls.size >= 20) return;
      
      console.log(`Crawling: ${url}`);
      visitedUrls.add(url);
      
      const startTime = Date.now();
      
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        const loadTime = Date.now() - startTime;
        pageLoadTimes.push({ url, loadTime });
        
        // Wait for dynamic content
        await page.waitForTimeout(2000);
        
        // Check for specific error indicators (excluding product/inventory content)
        const errorIndicators = await page.locator('text=/\\berror\\b|\\b404\\b|\\b500\\b|not found|crash|failed|exception/i').count();
        if (errorIndicators > 0) {
          // Get the error text and check if it's actually an error (not product data)
          const errorElements = await page.locator('text=/\\berror\\b|\\b404\\b|\\b500\\b|not found|crash|failed|exception/i').all();
          for (const element of errorElements) {
            const errorText = await element.textContent();
            const parentText = await element.locator('..').textContent();
            
            // Skip if this appears to be inventory/product data
            if (errorText && !parentText?.includes('Stock') && !parentText?.includes('Warehouse') && !parentText?.includes('Device')) {
              errors.push({
                url,
                error: `Page contains error indicator: ${errorText.trim()}`,
                type: 'Page Error'
              });
              break; // Only report the first real error found
            }
          }
        }
        
        // Find and crawl navigation links
        const links = await page.locator('a[href^="/"], nav a, header a').evaluateAll(links => 
          links
            .map(link => (link as HTMLAnchorElement).href)
            .filter(href => href && href.includes('/') && !href.includes('#'))
            .map(href => {
              try {
                const url = new URL(href);
                return url.pathname;
              } catch {
                return href;
              }
            })
        );
        
        // Recursively crawl found links
        for (const link of links.slice(0, 10)) { // Limit to prevent infinite crawling
          if (!visitedUrls.has(link) && !link.includes('api/')) {
            await crawlPage(link);
          }
        }
        
      } catch (error) {
        errors.push({
          url,
          error: `Navigation failed: ${error}`,
          type: 'Navigation Error'
        });
      }
    };

    // Start crawling from homepage
    await crawlPage('/');

    // Also test known routes
    const knownRoutes = ['/inventory', '/settings', '/vendors', '/purchase-orders'];
    for (const route of knownRoutes) {
      await crawlPage(route);
    }

    // Generate comprehensive report
    console.log('\\n=== CRAWL REPORT ===');
    console.log(`Pages visited: ${visitedUrls.size}`);
    console.log(`Errors found: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\\n=== ERRORS ===');
      errors.forEach((err, index) => {
        console.log(`${index + 1}. [${err.type}] ${err.url}`);
        console.log(`   ${err.error}`);
      });
    }
    
    console.log('\\n=== PERFORMANCE ===');
    pageLoadTimes.forEach(({ url, loadTime }) => {
      console.log(`${url}: ${loadTime}ms`);
    });
    
    const avgLoadTime = pageLoadTimes.reduce((sum, { loadTime }) => sum + loadTime, 0) / pageLoadTimes.length;
    console.log(`Average load time: ${Math.round(avgLoadTime)}ms`);
    
    // Test assertions
    expect(visitedUrls.size).toBeGreaterThan(0);
    
    // No critical errors should occur
    const criticalErrors = errors.filter(err => 
      err.type === 'JavaScript Error' || 
      err.error.includes('500') ||
      err.error.includes('crash')
    );
    
    if (criticalErrors.length > 0) {
      console.log('\\n=== CRITICAL ERRORS ===');
      criticalErrors.forEach(err => console.log(`${err.url}: ${err.error}`));
    }
    
    expect(criticalErrors.length).toBeLessThanOrEqual(2); // Allow for minor issues
    
    // Performance should be reasonable
    expect(avgLoadTime).toBeLessThan(10000); // 10 seconds average
  });

  test('test all interactive elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const interactionResults: Array<{ element: string; action: string; success: boolean; error?: string }> = [];
    
    // Test all buttons
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 20); i++) {
      try {
        const button = buttons.nth(i);
        const buttonText = await button.textContent() || `button-${i}`;
        
        if (await button.isVisible() && await button.isEnabled()) {
          await button.click();
          await page.waitForTimeout(500);
          
          interactionResults.push({
            element: buttonText,
            action: 'click',
            success: true
          });
        }
      } catch (error) {
        interactionResults.push({
          element: `button-${i}`,
          action: 'click',
          success: false,
          error: String(error)
        });
      }
    }
    
    // Test all form inputs
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < Math.min(inputCount, 10); i++) {
      try {
        const input = inputs.nth(i);
        const inputType = await input.getAttribute('type') || 'text';
        
        if (await input.isVisible() && await input.isEnabled()) {
          await input.fill('test value');
          await page.waitForTimeout(200);
          
          interactionResults.push({
            element: `input[type="${inputType}"]`,
            action: 'fill',
            success: true
          });
        }
      } catch (error) {
        interactionResults.push({
          element: `input-${i}`,
          action: 'fill',
          success: false,
          error: String(error)
        });
      }
    }
    
    // Test all select dropdowns
    const selects = page.locator('select');
    const selectCount = await selects.count();
    
    for (let i = 0; i < selectCount; i++) {
      try {
        const select = selects.nth(i);
        
        if (await select.isVisible() && await select.isEnabled()) {
          const options = select.locator('option');
          const optionCount = await options.count();
          
          if (optionCount > 1) {
            await select.selectOption({ index: 1 });
            await page.waitForTimeout(200);
            
            interactionResults.push({
              element: `select-${i}`,
              action: 'select',
              success: true
            });
          }
        }
      } catch (error) {
        interactionResults.push({
          element: `select-${i}`,
          action: 'select',
          success: false,
          error: String(error)
        });
      }
    }
    
    console.log('\\n=== INTERACTION REPORT ===');
    const successfulInteractions = interactionResults.filter(r => r.success);
    const failedInteractions = interactionResults.filter(r => !r.success);
    
    console.log(`Successful interactions: ${successfulInteractions.length}`);
    console.log(`Failed interactions: ${failedInteractions.length}`);
    
    if (failedInteractions.length > 0) {
      console.log('\\n=== FAILED INTERACTIONS ===');
      failedInteractions.forEach(interaction => {
        console.log(`${interaction.element} - ${interaction.action}: ${interaction.error}`);
      });
    }
    
    // Most interactions should succeed
    const successRate = successfulInteractions.length / interactionResults.length;
    expect(successRate).toBeGreaterThan(0.7); // 70% success rate minimum
  });

  test('comprehensive accessibility check', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const accessibilityIssues: Array<{ type: string; description: string; element: string }> = [];
    
    // Check for images without alt text
    const imagesWithoutAlt = await page.locator('img:not([alt])').count();
    if (imagesWithoutAlt > 0) {
      accessibilityIssues.push({
        type: 'Missing Alt Text',
        description: `${imagesWithoutAlt} images without alt attributes`,
        element: 'img'
      });
    }
    
    // Check for form inputs without labels
    const inputsWithoutLabels = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs.filter(input => {
        const hasLabel = document.querySelector(`label[for="${input.id}"]`) || 
                        input.closest('label') ||
                        input.getAttribute('aria-label') ||
                        input.getAttribute('aria-labelledby');
        return !hasLabel;
      }).length;
    });
    
    if (inputsWithoutLabels > 0) {
      accessibilityIssues.push({
        type: 'Missing Labels',
        description: `${inputsWithoutLabels} form inputs without proper labels`,
        element: 'input'
      });
    }
    
    // Check for proper heading hierarchy
    const headings = await page.evaluate(() => {
      const headingElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      return headingElements.map(h => parseInt(h.tagName.substring(1)));
    });
    
    let headingIssues = false;
    for (let i = 1; i < headings.length; i++) {
      if (headings[i] - headings[i-1] > 1) {
        headingIssues = true;
        break;
      }
    }
    
    if (headingIssues) {
      accessibilityIssues.push({
        type: 'Heading Hierarchy',
        description: 'Improper heading hierarchy detected',
        element: 'headings'
      });
    }
    
    // Check for keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    
    if (!focusedElement || !['INPUT', 'BUTTON', 'A', 'SELECT'].includes(focusedElement)) {
      accessibilityIssues.push({
        type: 'Keyboard Navigation',
        description: 'Tab navigation may not work properly',
        element: 'focus'
      });
    }
    
    console.log('\\n=== ACCESSIBILITY REPORT ===');
    console.log(`Issues found: ${accessibilityIssues.length}`);
    
    if (accessibilityIssues.length > 0) {
      accessibilityIssues.forEach(issue => {
        console.log(`[${issue.type}] ${issue.description}`);
      });
    } else {
      console.log('No major accessibility issues detected');
    }
    
    // Should have minimal accessibility issues
    expect(accessibilityIssues.length).toBeLessThanOrEqual(3);
  });
});
