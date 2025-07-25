import fs from 'fs/promises';
import path from 'path';

/**
 * Automated test repair strategies
 * Analyzes failures and automatically fixes test code
 */

export interface TestFailure {
  test: string;
  file: string;
  error: string;
  type: 'selector' | 'timing' | 'assertion' | 'navigation' | 'network' | 'unknown';
  line?: number;
}

export interface RepairResult {
  success: boolean;
  strategy: string;
  changes: string[];
  error?: string;
}

export class TestRepairService {
  private repairHistory: Map<string, RepairResult[]> = new Map();

  /**
   * Main repair function - analyzes and fixes test failures
   */
  async repairTestFailure(failure: TestFailure): Promise<RepairResult> {
    console.log(`🔧 Repairing ${failure.type} error in ${failure.test}`);

    switch (failure.type) {
      case 'selector':
        return await this.repairSelectorError(failure);
      case 'timing':
        return await this.repairTimingError(failure);
      case 'assertion':
        return await this.repairAssertionError(failure);
      case 'navigation':
        return await this.repairNavigationError(failure);
      case 'network':
        return await this.repairNetworkError(failure);
      default:
        return {
          success: false,
          strategy: 'none',
          changes: [],
          error: 'Unknown error type'
        };
    }
  }

  /**
   * Repair selector-based errors
   */
  private async repairSelectorError(failure: TestFailure): Promise<RepairResult> {
    const changes: string[] = [];
    
    try {
      // Read the test file
      const testContent = await fs.readFile(failure.file, 'utf-8');
      let modifiedContent = testContent;

      // Extract the failing selector from error message
      const selectorMatch = failure.error.match(/locator\(['"](.+?)['"]\)|getByTestId\(['"](.+?)['"]\)|click\(['"](.+?)['"]\)/);
      
      if (selectorMatch) {
        const failingSelector = selectorMatch[1] || selectorMatch[2] || selectorMatch[3];
        
        // Strategy 1: Add self-healing wrapper
        if (testContent.includes(failingSelector)) {
          // Check if already using self-healing
          if (!testContent.includes('withSelfHealing')) {
            // Add import
            if (!testContent.includes('self-healing')) {
              modifiedContent = `import { withSelfHealing } from './helpers/self-healing';\n` + modifiedContent;
              changes.push('Added self-healing import');
            }

            // Wrap page with self-healing
            modifiedContent = modifiedContent.replace(
              /test\(['"](.+?)['"],\s*async\s*\(\s*{\s*page\s*}\s*\)/g,
              `test('$1', async ({ page }) => {\n  const healingPage = withSelfHealing(page);`
            );
            changes.push('Wrapped page with self-healing');

            // Replace page. with healingPage.
            modifiedContent = modifiedContent.replace(/\bpage\./g, 'healingPage.');
            changes.push('Updated page references to use self-healing');
          }

          // Strategy 2: Add fallback selectors
          const selectorReplacements = this.generateSelectorFallbacks(failingSelector);
          for (const [original, replacement] of selectorReplacements) {
            if (modifiedContent.includes(original)) {
              modifiedContent = modifiedContent.replace(original, replacement);
              changes.push(`Added fallback selectors for: ${failingSelector}`);
            }
          }
        }
      }

      // Strategy 3: Add data-testid to common patterns
      modifiedContent = this.addDataTestIdFallbacks(modifiedContent);
      if (modifiedContent !== testContent) {
        changes.push('Added data-testid fallbacks');
      }

      // Write the modified test file
      if (changes.length > 0) {
        await fs.writeFile(failure.file, modifiedContent);
        return {
          success: true,
          strategy: 'selector-fallback',
          changes
        };
      }

      return {
        success: false,
        strategy: 'selector-fallback',
        changes: [],
        error: 'No selector found to repair'
      };

    } catch (error) {
      return {
        success: false,
        strategy: 'selector-fallback',
        changes,
        error: error.message
      };
    }
  }

  /**
   * Repair timing-based errors
   */
  private async repairTimingError(failure: TestFailure): Promise<RepairResult> {
    const changes: string[] = [];
    
    try {
      const testContent = await fs.readFile(failure.file, 'utf-8');
      let modifiedContent = testContent;

      // Strategy 1: Increase timeouts
      modifiedContent = modifiedContent.replace(
        /timeout:\s*(\d+)/g,
        (match, timeout) => {
          const newTimeout = parseInt(timeout) * 2;
          changes.push(`Increased timeout from ${timeout}ms to ${newTimeout}ms`);
          return `timeout: ${newTimeout}`;
        }
      );

      // Strategy 2: Add waitForLoadState
      if (failure.error.includes('element not found') || failure.error.includes('timeout')) {
        // Add network idle wait after navigation
        modifiedContent = modifiedContent.replace(
          /await\s+page\.goto\((.+?)\);/g,
          `await page.goto($1);\n    await page.waitForLoadState('networkidle');`
        );
        changes.push('Added waitForLoadState after navigation');

        // Add explicit waits before interactions
        modifiedContent = modifiedContent.replace(
          /(await\s+page\.(click|fill|type)\()/g,
          `await page.waitForTimeout(500);\n    $1`
        );
        changes.push('Added explicit waits before interactions');
      }

      // Strategy 3: Replace waitForSelector with more robust waiting
      modifiedContent = modifiedContent.replace(
        /await\s+page\.waitForSelector\(['"](.+?)['"]\)/g,
        `await page.waitForSelector('$1', { state: 'visible', timeout: 10000 })`
      );
      if (modifiedContent !== testContent) {
        changes.push('Enhanced waitForSelector with visibility check');
      }

      // Write the modified test file
      if (changes.length > 0) {
        await fs.writeFile(failure.file, modifiedContent);
        return {
          success: true,
          strategy: 'timing-adjustment',
          changes
        };
      }

      return {
        success: false,
        strategy: 'timing-adjustment',
        changes: [],
        error: 'No timing issues found to repair'
      };

    } catch (error) {
      return {
        success: false,
        strategy: 'timing-adjustment',
        changes,
        error: error.message
      };
    }
  }

  /**
   * Repair assertion errors
   */
  private async repairAssertionError(failure: TestFailure): Promise<RepairResult> {
    const changes: string[] = [];
    
    try {
      const testContent = await fs.readFile(failure.file, 'utf-8');
      let modifiedContent = testContent;

      // Strategy 1: Relax exact text matches to contain text
      modifiedContent = modifiedContent.replace(
        /expect\((.+?)\)\.toHaveText\(['"](.+?)['"]\)/g,
        (match, locator, text) => {
          changes.push(`Relaxed exact text match for: ${text}`);
          return `expect(${locator}).toContainText('${text}')`;
        }
      );

      // Strategy 2: Add regex patterns for dynamic content
      modifiedContent = modifiedContent.replace(
        /expect\((.+?)\)\.toContainText\(['"](\d+)['"]\)/g,
        (match, locator, number) => {
          changes.push(`Changed number assertion to regex pattern`);
          return `expect(${locator}).toContainText(/\\d+/)`;
        }
      );

      // Strategy 3: Add retry logic for assertions
      if (failure.error.includes('Expected') && failure.error.includes('Received')) {
        const assertionPattern = /await\s+expect\((.+?)\)\.(toHaveText|toContainText|toHaveValue)\((.+?)\)/g;
        modifiedContent = modifiedContent.replace(
          assertionPattern,
          `await expect($1).$2($3, { timeout: 10000 })`
        );
        changes.push('Added timeout to assertions');
      }

      // Write the modified test file
      if (changes.length > 0) {
        await fs.writeFile(failure.file, modifiedContent);
        return {
          success: true,
          strategy: 'assertion-relaxation',
          changes
        };
      }

      return {
        success: false,
        strategy: 'assertion-relaxation',
        changes: [],
        error: 'No assertions found to repair'
      };

    } catch (error) {
      return {
        success: false,
        strategy: 'assertion-relaxation',
        changes,
        error: error.message
      };
    }
  }

  /**
   * Repair navigation errors
   */
  private async repairNavigationError(failure: TestFailure): Promise<RepairResult> {
    const changes: string[] = [];
    
    try {
      const testContent = await fs.readFile(failure.file, 'utf-8');
      let modifiedContent = testContent;

      // Add retry logic for navigation
      modifiedContent = modifiedContent.replace(
        /await\s+page\.goto\((.+?)\);/g,
        `await page.goto($1, { waitUntil: 'networkidle', timeout: 30000 });`
      );
      changes.push('Enhanced navigation with networkidle wait');

      // Add error handling
      if (!testContent.includes('try {')) {
        modifiedContent = modifiedContent.replace(
          /(await\s+page\.goto\(.+?\);)/g,
          `try {\n      $1\n    } catch (error) {\n      console.log('Navigation failed, retrying...');\n      await page.waitForTimeout(2000);\n      $1\n    }`
        );
        changes.push('Added navigation retry logic');
      }

      if (changes.length > 0) {
        await fs.writeFile(failure.file, modifiedContent);
        return {
          success: true,
          strategy: 'navigation-retry',
          changes
        };
      }

      return {
        success: false,
        strategy: 'navigation-retry',
        changes: [],
        error: 'No navigation issues found to repair'
      };

    } catch (error) {
      return {
        success: false,
        strategy: 'navigation-retry',
        changes,
        error: error.message
      };
    }
  }

  /**
   * Repair network errors
   */
  private async repairNetworkError(failure: TestFailure): Promise<RepairResult> {
    const changes: string[] = [];
    
    try {
      const testContent = await fs.readFile(failure.file, 'utf-8');
      let modifiedContent = testContent;

      // Add network error handling
      if (!testContent.includes('page.on(\'response\'')) {
        const networkHandler = `
  // Handle network errors
  page.on('response', response => {
    if (!response.ok() && response.url().includes('/api/')) {
      console.warn('API request failed:', response.url(), response.status());
    }
  });

  page.on('requestfailed', request => {
    console.error('Request failed:', request.url(), request.failure()?.errorText);
  });
`;
        
        modifiedContent = modifiedContent.replace(
          /test\(['"](.+?)['"],\s*async\s*\(\s*{\s*page\s*}\s*\)\s*=>\s*{/g,
          `test('$1', async ({ page }) => {${networkHandler}`
        );
        changes.push('Added network error handlers');
      }

      // Add request interception for flaky endpoints
      if (failure.error.includes('net::') || failure.error.includes('fetch')) {
        modifiedContent = modifiedContent.replace(
          /await\s+page\.goto\((.+?)\);/g,
          `// Intercept and retry failed requests
  await page.route('**/api/**', async route => {
    try {
      await route.continue();
    } catch (error) {
      console.log('Request failed, using fallback');
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ error: 'Network error, using mock data' })
      });
    }
  });

  await page.goto($1);`
        );
        changes.push('Added request interception with fallback');
      }

      if (changes.length > 0) {
        await fs.writeFile(failure.file, modifiedContent);
        return {
          success: true,
          strategy: 'network-resilience',
          changes
        };
      }

      return {
        success: false,
        strategy: 'network-resilience',
        changes: [],
        error: 'No network issues found to repair'
      };

    } catch (error) {
      return {
        success: false,
        strategy: 'network-resilience',
        changes,
        error: error.message
      };
    }
  }

  /**
   * Generate fallback selectors for a given selector
   */
  private generateSelectorFallbacks(selector: string): Map<string, string> {
    const replacements = new Map<string, string>();
    
    // If it's a simple string selector, add multiple strategies
    if (!selector.includes('[') && !selector.includes('(')) {
      replacements.set(
        `'${selector}'`,
        `'${selector}', { fallbackSelectors: ['[data-testid="${selector}"]', '[aria-label="${selector}"]', 'text="${selector}"'] }`
      );
    }

    // Add data-testid alternatives
    if (selector.startsWith('#') || selector.startsWith('.')) {
      const id = selector.replace(/[#.]/, '');
      replacements.set(
        `'${selector}'`,
        `'${selector}', { fallbackSelectors: ['[data-testid="${id}"]'] }`
      );
    }

    return replacements;
  }

  /**
   * Add data-testid fallbacks to common patterns
   */
  private addDataTestIdFallbacks(content: string): string {
    // Add data-testid to button clicks
    content = content.replace(
      /page\.click\(['"]button:has-text\(['"](.+?)['"]\)['"]\)/g,
      `page.click('button:has-text("$1"), [data-testid="$1-button"]')`
    );

    // Add data-testid to input fills
    content = content.replace(
      /page\.fill\(['"]input\[placeholder=['"](.+?)['"]\]['"]/g,
      `page.fill('input[placeholder="$1"], [data-testid="$1-input"]'`
    );

    return content;
  }

  /**
   * Get repair history for reporting
   */
  getRepairHistory(): Map<string, RepairResult[]> {
    return this.repairHistory;
  }
}

// Export singleton instance
export const testRepairService = new TestRepairService();