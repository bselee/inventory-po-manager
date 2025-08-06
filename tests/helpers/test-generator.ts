import { Page } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

/**
 * Automated test generator for uncovered UI elements
 * Discovers interactive elements and generates tests
 */

export interface DiscoveredElement {
  selector: string;
  type: 'button' | 'input' | 'select' | 'link' | 'checkbox' | 'radio';
  text?: string;
  label?: string;
  testId?: string;
  ariaLabel?: string;
}

export interface GeneratedTest {
  name: string;
  code: string;
  elements: DiscoveredElement[];
}

export class TestGenerator {
  private discoveredElements: DiscoveredElement[] = [];
  private existingTests: Set<string> = new Set();

  constructor(private page: Page) {}

  /**
   * Discover all interactive elements on the current page
   */
  async discoverElements(): Promise<DiscoveredElement[]> {
    this.discoveredElements = [];

    // Discover buttons
    const buttons = await this.page.locator('button, [role="button"]').all();
    for (const button of buttons) {
      const element = await this.analyzeElement(button, 'button');
      if (element) this.discoveredElements.push(element);
    }

    // Discover inputs
    const inputs = await this.page.locator('input:not([type="hidden"])').all();
    for (const input of inputs) {
      const type = await input.getAttribute('type') || 'text';
      const elementType = type === 'checkbox' ? 'checkbox' : 
                         type === 'radio' ? 'radio' : 'input';
      const element = await this.analyzeElement(input, elementType);
      if (element) this.discoveredElements.push(element);
    }

    // Discover selects
    const selects = await this.page.locator('select').all();
    for (const select of selects) {
      const element = await this.analyzeElement(select, 'select');
      if (element) this.discoveredElements.push(element);
    }

    // Discover links
    const links = await this.page.locator('a[href]').all();
    for (const link of links) {
      const element = await this.analyzeElement(link, 'link');
      if (element) this.discoveredElements.push(element);
    }

    return this.discoveredElements;
  }

  /**
   * Analyze an element and extract its properties
   */
  private async analyzeElement(
    locator: any,
    type: DiscoveredElement['type']
  ): Promise<DiscoveredElement | null> {
    try {
      const isVisible = await locator.isVisible();
      if (!isVisible) return null;

      const testId = await locator.getAttribute('data-testid');
      const ariaLabel = await locator.getAttribute('aria-label');
      const text = await locator.textContent();
      const id = await locator.getAttribute('id');
      const className = await locator.getAttribute('class');
      
      // Build selector priority
      let selector = '';
      if (testId) {
        selector = `[data-testid="${testId}"]`;
      } else if (id) {
        selector = `#${id}`;
      } else if (ariaLabel) {
        selector = `[aria-label="${ariaLabel}"]`;
      } else if (text && type === 'button') {
        selector = `button:has-text("${text.trim()}")`;
      } else if (className) {
        const primaryClass = className.split(' ')[0];
        selector = `.${primaryClass}`;
      }

      if (!selector) return null;

      // Get label for inputs
      let label = ariaLabel;
      if (type === 'input' || type === 'select') {
        const labelElement = await this.page.locator(`label[for="${id}"]`).first();
        if (await labelElement.isVisible()) {
          label = await labelElement.textContent();
        }
      }

      return {
        selector,
        type,
        text: text?.trim(),
        label: label?.trim(),
        testId,
        ariaLabel
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate tests for discovered elements
   */
  async generateTests(pageName: string): Promise<GeneratedTest[]> {
    const tests: GeneratedTest[] = [];

    // Group elements by type
    const buttons = this.discoveredElements.filter(e => e.type === 'button');
    const inputs = this.discoveredElements.filter(e => e.type === 'input');
    const selects = this.discoveredElements.filter(e => e.type === 'select');
    const links = this.discoveredElements.filter(e => e.type === 'link');

    // Generate button interaction tests
    if (buttons.length > 0) {
      tests.push(this.generateButtonTest(pageName, buttons));
    }

    // Generate form interaction tests
    if (inputs.length > 0 || selects.length > 0) {
      tests.push(this.generateFormTest(pageName, [...inputs, ...selects]));
    }

    // Generate navigation tests
    if (links.length > 0) {
      tests.push(this.generateNavigationTest(pageName, links));
    }

    // Generate accessibility test
    tests.push(this.generateAccessibilityTest(pageName));

    // Generate responsive test
    tests.push(this.generateResponsiveTest(pageName));

    return tests;
  }

  /**
   * Generate test for button interactions
   */
  private generateButtonTest(pageName: string, buttons: DiscoveredElement[]): GeneratedTest {
    const testName = `${pageName} button interactions`;
    const buttonTests = buttons.map(button => {
      const description = button.text || button.ariaLabel || 'button';
      return `
    // Test ${description}
    await healingPage.click('${button.selector}', {
      fallbackSelectors: [${this.generateFallbackSelectors(button)}]
    });
    await healingPage.waitForAppReady();
    
    // Verify no errors occurred
    const errors = await page.evaluate(() => window.console.error);
    expect(errors).toBeUndefined();`;
    }).join('\n');

    const code = `
test('${testName}', async ({ page }) => {
  const healingPage = withSelfHealing(page);
  await healingPage.navigate('/${pageName.toLowerCase()}');
  ${buttonTests}
});`;

    return { name: testName, code, elements: buttons };
  }

  /**
   * Generate test for form interactions
   */
  private generateFormTest(pageName: string, formElements: DiscoveredElement[]): GeneratedTest {
    const testName = `${pageName} form interactions`;
    const formTests = formElements.map(element => {
      if (element.type === 'input') {
        return `
    // Test ${element.label || 'input'}
    await healingPage.fill('${element.selector}', 'test value', {
      fallbackSelectors: [${this.generateFallbackSelectors(element)}],
      label: '${element.label || ''}',
      placeholder: '${element.ariaLabel || ''}'
    });`;
      } else if (element.type === 'select') {
        return `
    // Test ${element.label || 'select'}
    const ${element.testId || 'select'} = page.locator('${element.selector}');
    const optionCount = await ${element.testId || 'select'}.locator('option').count();
    if (optionCount > 1) {
      await ${element.testId || 'select'}.selectOption({ index: 1 });
    }`;
      }
      return '';
    }).join('\n');

    const code = `
test('${testName}', async ({ page }) => {
  const healingPage = withSelfHealing(page);
  await healingPage.navigate('/${pageName.toLowerCase()}');
  ${formTests}
  
  // Verify form values were set
  await page.waitForTimeout(500);
});`;

    return { name: testName, code, elements: formElements };
  }

  /**
   * Generate navigation test
   */
  private generateNavigationTest(pageName: string, links: DiscoveredElement[]): GeneratedTest {
    const testName = `${pageName} navigation links`;
    const navigationTests = links.slice(0, 5).map(link => {
      return `
    // Test link: ${link.text || 'link'}
    const href = await page.locator('${link.selector}').getAttribute('href');
    if (href && !href.startsWith('http')) {
      await healingPage.click('${link.selector}');
      await healingPage.waitForAppReady();
      await page.goBack();
    }`;
    }).join('\n');

    const code = `
test('${testName}', async ({ page }) => {
  const healingPage = withSelfHealing(page);
  await healingPage.navigate('/${pageName.toLowerCase()}');
  ${navigationTests}
});`;

    return { name: testName, code, elements: links };
  }

  /**
   * Generate accessibility test
   */
  private generateAccessibilityTest(pageName: string): GeneratedTest {
    const testName = `${pageName} accessibility`;
    const code = `
test('${testName}', async ({ page }) => {
  const healingPage = withSelfHealing(page);
  await healingPage.navigate('/${pageName.toLowerCase()}');
  
  // Check for ARIA labels
  const buttons = await page.locator('button').all();
  for (const button of buttons) {
    const text = await button.textContent();
    const ariaLabel = await button.getAttribute('aria-label');
    const hasAccessibleName = text || ariaLabel;
    expect(hasAccessibleName).toBeTruthy();
  }
  
  // Check for alt text on images
  const images = await page.locator('img').all();
  for (const img of images) {
    const alt = await img.getAttribute('alt');
    expect(alt).toBeTruthy();
  }
  
  // Check for form labels
  const inputs = await page.locator('input:not([type="hidden"])').all();
  for (const input of inputs) {
    const id = await input.getAttribute('id');
    const ariaLabel = await input.getAttribute('aria-label');
    if (id) {
      const label = page.locator(\`label[for="\${id}"]\`);
      const hasLabel = await label.isVisible() || ariaLabel;
      expect(hasLabel).toBeTruthy();
    }
  }
});`;

    return { name: testName, code, elements: [] };
  }

  /**
   * Generate responsive design test
   */
  private generateResponsiveTest(pageName: string): GeneratedTest {
    const testName = `${pageName} responsive design`;
    const code = `
test('${testName}', async ({ page }) => {
  const healingPage = withSelfHealing(page);
  const viewports = [
    { width: 375, height: 667, name: 'Mobile' },
    { width: 768, height: 1024, name: 'Tablet' },
    { width: 1920, height: 1080, name: 'Desktop' }
  ];
  
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await healingPage.navigate('/${pageName.toLowerCase()}');
    await healingPage.waitForAppReady();
    
    // Check that main content is visible
    const mainContent = await page.locator('main, [role="main"], .main-content').isVisible();
    expect(mainContent).toBeTruthy();
    
    // Take screenshot for visual verification
    await page.screenshot({ 
      path: \`test-results/screenshots/${pageName}-\${viewport.name}.png\`,
      fullPage: true 
    });
  }
});`;

    return { name: testName, code, elements: [] };
  }

  /**
   * Generate fallback selectors for an element
   */
  private generateFallbackSelectors(element: DiscoveredElement): string {
    const fallbacks: string[] = [];
    
    if (element.ariaLabel && !element.selector.includes('aria-label')) {
      fallbacks.push(`'[aria-label="${element.ariaLabel}"]'`);
    }
    
    if (element.text && element.type === 'button') {
      fallbacks.push(`'button:has-text("${element.text}")'`);
    }
    
    if (element.type === 'input' && element.label) {
      fallbacks.push(`'input[placeholder*="${element.label}" i]'`);
    }
    
    return fallbacks.join(', ');
  }

  /**
   * Save generated tests to file
   */
  async saveTests(tests: GeneratedTest[], fileName: string) {
    const imports = `import { test, expect } from '@playwright/test';
import { withSelfHealing } from '../helpers/self-healing';

/**
 * Auto-generated tests for ${fileName}
 * Generated on: ${new Date().toISOString()}
 */
`;

    const content = imports + tests.map(t => t.code).join('\n\n');
    
    const filePath = path.join(
      process.cwd(),
      'tests/e2e/generated',
      `${fileName}.spec.ts`
    );
    
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
  }
}

/**
 * Auto-generate tests for a specific page
 */
export async function generateTestsForPage(page: Page, pageName: string) {
  const generator = new TestGenerator(page);
  
  // Discover elements
  const elements = await generator.discoverElements();
  // Generate tests
  const tests = await generator.generateTests(pageName);
  
  // Save tests
  await generator.saveTests(tests, pageName);
  
  return { elements, tests };
}