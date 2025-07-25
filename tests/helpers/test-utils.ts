import { Page, Locator, expect } from '@playwright/test';

export interface RetryOptions {
  retries?: number;
  delay?: number;
  timeout?: number;
}

export class TestUtils {
  constructor(private page: Page) {}

  /**
   * Wait for element with smart strategies instead of fixed timeout
   */
  async waitForElement(selector: string, options: { state?: 'visible' | 'hidden' | 'attached'; timeout?: number } = {}) {
    const { state = 'visible', timeout = 10000 } = options;
    
    try {
      await this.page.waitForSelector(selector, { state, timeout });
      return true;
    } catch {
      // Try alternative strategies
      const element = this.page.locator(selector);
      const count = await element.count();
      
      if (count > 0 && state === 'visible') {
        // Element exists but might not be visible yet
        await element.first().scrollIntoViewIfNeeded();
        await expect(element.first()).toBeVisible({ timeout });
      }
      
      return count > 0;
    }
  }

  /**
   * Click with retry logic and better error handling
   */
  async clickWithRetry(locator: Locator | string, options: RetryOptions = {}) {
    const { retries = 3, delay = 1000, timeout = 5000 } = options;
    const element = typeof locator === 'string' ? this.page.locator(locator) : locator;
    
    for (let i = 0; i < retries; i++) {
      try {
        // Ensure element is ready
        await element.waitFor({ state: 'visible', timeout });
        await element.scrollIntoViewIfNeeded();
        
        // Check if element is enabled
        const isEnabled = await element.isEnabled();
        if (!isEnabled) {
          await this.page.waitForTimeout(delay);
          continue;
        }
        
        // Try to click
        await element.click({ timeout });
        return; // Success
      } catch (error) {
        if (i === retries - 1) throw error;
        
        // Wait before retry
        await this.page.waitForTimeout(delay * (i + 1)); // Exponential backoff
      }
    }
  }

  /**
   * Fill input with retry and validation
   */
  async fillWithRetry(locator: Locator | string, value: string, options: RetryOptions = {}) {
    const { retries = 3, delay = 500 } = options;
    const element = typeof locator === 'string' ? this.page.locator(locator) : locator;
    
    for (let i = 0; i < retries; i++) {
      try {
        await element.waitFor({ state: 'visible' });
        await element.click(); // Focus
        await element.clear();
        await element.fill(value);
        
        // Verify value was set
        const actualValue = await element.inputValue();
        if (actualValue === value) return;
        
      } catch (error) {
        if (i === retries - 1) throw error;
      }
      
      await this.page.waitForTimeout(delay * (i + 1));
    }
  }

  /**
   * Wait for network idle or specific response
   */
  async waitForResponse(urlPattern: string | RegExp, options: { timeout?: number; status?: number } = {}) {
    const { timeout = 10000, status = 200 } = options;
    
    try {
      const response = await this.page.waitForResponse(
        response => {
          const matches = typeof urlPattern === 'string' 
            ? response.url().includes(urlPattern)
            : urlPattern.test(response.url());
          return matches && response.status() === status;
        },
        { timeout }
      );
      return response;
    } catch {
      // Fallback to network idle
      await this.page.waitForLoadState('networkidle', { timeout: 5000 });
    }
  }

  /**
   * Smart wait for loading states
   */
  async waitForLoadingComplete(options: { timeout?: number } = {}) {
    const { timeout = 10000 } = options;
    
    // Wait for various loading indicators to disappear
    await Promise.race([
      this.page.waitForFunction(() => {
        const indicators = [
          '[class*="loading"]',
          '[class*="skeleton"]',
          '[class*="spinner"]',
          '[aria-busy="true"]',
          '.loading',
          '.spinner'
        ];
        
        for (const indicator of indicators) {
          const elements = document.querySelectorAll(indicator);
          if (elements.length > 0) return false;
        }
        
        return true;
      }, { timeout }),
      
      // Also wait for network to be idle
      this.page.waitForLoadState('networkidle', { timeout: timeout / 2 })
    ]);
  }

  /**
   * Flexible assertion with retry
   */
  async expectWithRetry(
    assertion: () => Promise<void>,
    options: { retries?: number; delay?: number; message?: string } = {}
  ) {
    const { retries = 3, delay = 1000, message = 'Assertion failed' } = options;
    
    let lastError: Error | null = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        await assertion();
        return; // Success
      } catch (error) {
        lastError = error as Error;
        
        if (i < retries - 1) {
          await this.page.waitForTimeout(delay * (i + 1));
        }
      }
    }
    
    throw new Error(`${message}: ${lastError?.message}`);
  }

  /**
   * Wait for element count to stabilize
   */
  async waitForStableCount(selector: string, options: { timeout?: number; pollInterval?: number } = {}) {
    const { timeout = 5000, pollInterval = 500 } = options;
    const startTime = Date.now();
    
    let previousCount = -1;
    let stableCount = 0;
    
    while (Date.now() - startTime < timeout) {
      const currentCount = await this.page.locator(selector).count();
      
      if (currentCount === previousCount) {
        stableCount++;
        if (stableCount >= 2) return currentCount; // Stable for 2 checks
      } else {
        stableCount = 0;
      }
      
      previousCount = currentCount;
      await this.page.waitForTimeout(pollInterval);
    }
    
    return previousCount;
  }
}