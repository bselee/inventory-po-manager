import { Page, Locator, expect } from '@playwright/test';

/**
 * Self-healing utilities for Playwright tests
 * Provides intelligent fallbacks and automatic repairs
 */

export interface SelectorStrategy {
  type: 'data-testid' | 'aria-label' | 'text' | 'css' | 'role';
  value: string;
}

export class SelfHealingPage {
  constructor(private page: Page) {}

  /**
   * Click with fallback strategies
   */
  async click(
    primarySelector: string,
    options?: {
      fallbackSelectors?: string[];
      text?: string;
      role?: string;
      timeout?: number;
    }
  ) {
    const strategies: SelectorStrategy[] = [
      { type: 'css', value: primarySelector }
    ];

    // Add fallback strategies
    if (options?.fallbackSelectors) {
      options.fallbackSelectors.forEach(sel => {
        strategies.push({ type: 'css', value: sel });
      });
    }

    if (options?.text) {
      strategies.push({ type: 'text', value: options.text });
    }

    if (options?.role) {
      strategies.push({ type: 'role', value: options.role });
    }

    // Try each strategy
    for (const strategy of strategies) {
      try {
        const locator = await this.getLocator(strategy);
        await locator.click({ timeout: options?.timeout || 5000 });
        return; // Success!
      } catch (error) {
        // Continue to next strategy
      }
    }

    // All strategies failed
    throw new Error(`Failed to click element with any strategy: ${primarySelector}`);
  }

  /**
   * Fill input with fallback strategies
   */
  async fill(
    primarySelector: string,
    value: string,
    options?: {
      fallbackSelectors?: string[];
      placeholder?: string;
      label?: string;
    }
  ) {
    const strategies: SelectorStrategy[] = [
      { type: 'css', value: primarySelector }
    ];

    if (options?.fallbackSelectors) {
      options.fallbackSelectors.forEach(sel => {
        strategies.push({ type: 'css', value: sel });
      });
    }

    if (options?.placeholder) {
      strategies.push({ 
        type: 'css', 
        value: `input[placeholder*="${options.placeholder}"]` 
      });
    }

    if (options?.label) {
      strategies.push({ 
        type: 'css', 
        value: `input[aria-label*="${options.label}"]` 
      });
    }

    for (const strategy of strategies) {
      try {
        const locator = await this.getLocator(strategy);
        await locator.fill(value);
        return;
      } catch (error) {
        // Continue to next strategy
      }
    }

    throw new Error(`Failed to fill element with any strategy: ${primarySelector}`);
  }

  /**
   * Wait for element with intelligent waiting
   */
  async waitForElement(
    selector: string,
    options?: {
      state?: 'attached' | 'detached' | 'visible' | 'hidden';
      timeout?: number;
      fallbackSelectors?: string[];
    }
  ) {
    const timeout = options?.timeout || 10000;
    const state = options?.state || 'visible';
    
    // Try primary selector first
    try {
      await this.page.waitForSelector(selector, { state, timeout: timeout / 2 });
      return;
    } catch (error) {
      // Try with network idle
      await this.page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {});
    }

    // Try fallback selectors
    if (options?.fallbackSelectors) {
      for (const fallback of options.fallbackSelectors) {
        try {
          await this.page.waitForSelector(fallback, { state, timeout: timeout / 4 });
          return;
        } catch (error) {
          // Continue
        }
      }
    }

    // Last resort: wait for any activity to stop
    await this.page.waitForTimeout(1000);
    
    // Try primary selector one more time
    await this.page.waitForSelector(selector, { state, timeout: timeout / 4 });
  }

  /**
   * Flexible text assertion
   */
  async expectText(
    selector: string,
    expectedText: string | RegExp,
    options?: {
      exact?: boolean;
      timeout?: number;
      fallbackSelectors?: string[];
    }
  ) {
    const strategies = [selector, ...(options?.fallbackSelectors || [])];
    
    for (const strategy of strategies) {
      try {
        const locator = this.page.locator(strategy);
        
        if (options?.exact === false || expectedText instanceof RegExp) {
          await expect(locator).toContainText(expectedText, { 
            timeout: options?.timeout || 5000 
          });
        } else {
          await expect(locator).toHaveText(expectedText, { 
            timeout: options?.timeout || 5000 
          });
        }
        return;
      } catch (error) {
        // Continue to next strategy
      }
    }

    throw new Error(`No element found with text: ${expectedText}`);
  }

  /**
   * Smart form filling
   */
  async fillForm(fields: Array<{
    selector: string;
    value: string;
    type?: 'text' | 'select' | 'checkbox' | 'radio';
    label?: string;
    placeholder?: string;
  }>) {
    for (const field of fields) {
      switch (field.type || 'text') {
        case 'text':
          await this.fill(field.selector, field.value, {
            label: field.label,
            placeholder: field.placeholder
          });
          break;
          
        case 'select':
          try {
            await this.page.selectOption(field.selector, field.value);
          } catch {
            // Try clicking and selecting
            await this.click(field.selector);
            await this.click(`option:has-text("${field.value}")`);
          }
          break;
          
        case 'checkbox':
        case 'radio':
          const element = this.page.locator(field.selector);
          const isChecked = await element.isChecked();
          if ((field.value === 'true' && !isChecked) || 
              (field.value === 'false' && isChecked)) {
            await this.click(field.selector);
          }
          break;
      }
    }
  }

  /**
   * Retry action with exponential backoff
   */
  async retryAction<T>(
    action: () => Promise<T>,
    options?: {
      retries?: number;
      delay?: number;
      multiplier?: number;
    }
  ): Promise<T> {
    const retries = options?.retries || 3;
    let delay = options?.delay || 1000;
    const multiplier = options?.multiplier || 2;

    for (let i = 0; i < retries; i++) {
      try {
        return await action();
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.page.waitForTimeout(delay);
        delay *= multiplier;
      }
    }

    throw new Error('Action failed after all retries');
  }

  /**
   * Wait for application to be ready
   */
  async waitForAppReady() {
    // Wait for common loading indicators to disappear
    const loadingSelectors = [
      '.loading',
      '.spinner',
      '.animate-spin',
      '[data-loading="true"]',
      '.skeleton'
    ];

    for (const selector of loadingSelectors) {
      try {
        await this.page.waitForSelector(selector, { 
          state: 'hidden', 
          timeout: 2000 
        });
      } catch {
        // Ignore if selector doesn't exist
      }
    }

    // Wait for network to be idle
    await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    
    // Small additional wait for React renders
    await this.page.waitForTimeout(300);
  }

  /**
   * Smart navigation with retries
   */
  async navigate(url: string, options?: {
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
    retries?: number;
  }) {
    return this.retryAction(
      async () => {
        await this.page.goto(url, {
          waitUntil: options?.waitUntil || 'networkidle',
          timeout: 30000
        });
        await this.waitForAppReady();
      },
      { retries: options?.retries || 3 }
    );
  }

  /**
   * Get locator with fallback strategies
   */
  private async getLocator(strategy: SelectorStrategy): Promise<Locator> {
    switch (strategy.type) {
      case 'data-testid':
        return this.page.locator(`[data-testid="${strategy.value}"]`);
      
      case 'aria-label':
        return this.page.locator(`[aria-label="${strategy.value}"]`);
      
      case 'text':
        return this.page.locator(`text="${strategy.value}"`);
      
      case 'role':
        return this.page.getByRole(strategy.value as any);
      
      case 'css':
      default:
        return this.page.locator(strategy.value);
    }
  }

  /**
   * Take screenshot on failure for debugging
   */
  async screenshotOnFailure(testName: string, error: Error) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `failure-${testName}-${timestamp}.png`;
    
    await this.page.screenshot({
      path: `test-results/screenshots/${filename}`,
      fullPage: true
    });
  }
}

/**
 * Create a self-healing page wrapper
 */
export function withSelfHealing(page: Page): SelfHealingPage {
  return new SelfHealingPage(page);
}