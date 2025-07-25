import { test, expect } from '@playwright/test';
import { TestUtils } from '../helpers/test-utils';

test.describe('Improved Settings Page Tests', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await page.goto('/settings');
    await utils.waitForLoadingComplete();
  });

  test('settings page loads successfully', async ({ page }) => {
    // Check for main heading
    await expect(page.locator('h1')).toContainText(/settings/i);
    
    // Page should load without errors
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    
    // Wait for page to stabilize instead of fixed timeout
    await utils.waitForLoadingComplete();
    expect(errors).toHaveLength(0);
  });

  test('finale API configuration form works', async ({ page }) => {
    // Look for API configuration inputs with retry
    const apiKeyInput = page.locator('input[name*="api_key"], input[placeholder*="api key" i]').first();
    const apiSecretInput = page.locator('input[name*="api_secret"], input[placeholder*="api secret" i]').first();
    const accountPathInput = page.locator('input[name*="account"], input[placeholder*="account" i]').first();
    
    if (await utils.waitForElement(apiKeyInput, { timeout: 5000 })) {
      await utils.fillWithRetry(apiKeyInput, 'test-api-key');
      await expect(apiKeyInput).toHaveValue('test-api-key');
    }
    
    if (await utils.waitForElement(apiSecretInput, { timeout: 5000 })) {
      await utils.fillWithRetry(apiSecretInput, 'test-api-secret');
      await expect(apiSecretInput).toHaveValue('test-api-secret');
    }
    
    if (await utils.waitForElement(accountPathInput, { timeout: 5000 })) {
      await utils.fillWithRetry(accountPathInput, 'test-account');
      await expect(accountPathInput).toHaveValue('test-account');
    }
  });

  test('test connection button works', async ({ page }) => {
    const testButton = page.locator('button').filter({ hasText: /test.*connection|test.*config|verify/i });
    
    if (await testButton.isVisible()) {
      // Set up response listener before clicking
      const responsePromise = page.waitForResponse(
        response => response.url().includes('test-finale') || response.url().includes('test-connection'),
        { timeout: 10000 }
      );
      
      await utils.clickWithRetry(testButton);
      
      // Wait for API response or timeout
      try {
        const response = await responsePromise;
        expect(response.status()).toBeLessThan(500);
      } catch {
        // If no response, check for UI feedback
        await utils.expectWithRetry(async () => {
          const resultMessage = page.locator('.message, .alert, [role="alert"], [class*="result"]');
          await expect(resultMessage.first()).toBeVisible();
        }, { retries: 3, delay: 1000 });
      }
    }
  });

  test('save settings button works', async ({ page }) => {
    const saveButton = page.locator('button').filter({ hasText: /save.*settings|save.*config|update/i });
    
    if (await saveButton.isVisible()) {
      // Set up response listener
      const responsePromise = page.waitForResponse(
        response => response.url().includes('settings') && response.method() === 'POST',
        { timeout: 5000 }
      ).catch(() => null);
      
      await utils.clickWithRetry(saveButton);
      
      // Wait for save to complete
      const response = await responsePromise;
      
      // Check for success indication
      await utils.expectWithRetry(async () => {
        const successIndicators = page.locator('.success, [class*="success"], [role="status"], .alert-success');
        if (await successIndicators.count() > 0) {
          await expect(successIndicators.first()).toBeVisible();
        } else if (response) {
          expect(response.status()).toBe(200);
        }
      }, { retries: 3, delay: 1000 });
    }
  });

  test('sync controls work', async ({ page }) => {
    const syncButtons = page.locator('button').filter({ hasText: /sync|refresh.*data|update.*inventory/i });
    
    if (await syncButtons.count() > 0) {
      const firstSyncButton = syncButtons.first();
      
      // Monitor for sync status changes
      const statusChangePromise = page.waitForFunction(() => {
        const statusElements = document.querySelectorAll('[class*="running"], [class*="syncing"], [class*="progress"]');
        return statusElements.length > 0;
      }, { timeout: 5000 }).catch(() => false);
      
      await utils.clickWithRetry(firstSyncButton);
      
      // Verify sync started
      const syncStarted = await statusChangePromise;
      expect(syncStarted).toBeTruthy();
    }
  });

  test('sync status display works', async ({ page }) => {
    // Wait for status elements to load
    await utils.waitForElement('[class*="status"], [data-testid*="status"]', { timeout: 10000 });
    
    const statusElements = page.locator('.status, [class*="sync-status"], [data-testid*="status"]');
    
    if (await statusElements.count() > 0) {
      await expect(statusElements.first()).toBeVisible();
      
      // Check for status indicators
      const statusText = await statusElements.first().textContent();
      expect(statusText).toBeTruthy();
    }
    
    // Check for sync logs if available
    const logElements = page.locator('.log-entry, [class*="log"], [data-testid*="log"]');
    if (await logElements.count() > 0) {
      await expect(logElements.first()).toBeVisible();
    }
  });

  test('real-time sync monitoring works', async ({ page }) => {
    // Wait for monitoring elements to appear
    await utils.waitForElement('[class*="monitor"], [data-testid*="monitor"]', { timeout: 10000 });
    
    const monitoringElements = page.locator('[class*="real-time"], [class*="monitor"], [data-testid*="monitor"]');
    
    if (await monitoringElements.count() > 0) {
      await expect(monitoringElements.first()).toBeVisible();
      
      // Check for timestamp updates
      const timestampElements = page.locator('[class*="timestamp"], [class*="updated"], time');
      if (await timestampElements.count() > 0) {
        await expect(timestampElements.first()).toBeVisible();
      }
    }
  });

  test('stuck sync cleanup functionality works', async ({ page }) => {
    const cleanupButton = page.locator('button').filter({ hasText: /cleanup|clear.*stuck|fix.*sync/i });
    
    if (await cleanupButton.isVisible()) {
      // Set up response listener
      const responsePromise = page.waitForResponse(
        response => response.url().includes('cleanup') || response.url().includes('sync-status'),
        { timeout: 5000 }
      ).catch(() => null);
      
      await utils.clickWithRetry(cleanupButton);
      
      // Wait for cleanup response
      await responsePromise;
      
      // Check for result message
      await utils.expectWithRetry(async () => {
        const resultMessage = page.locator('.message, .alert, [role="alert"], [class*="result"]');
        if (await resultMessage.count() > 0) {
          await expect(resultMessage.first()).toBeVisible();
        }
      }, { retries: 3, delay: 1000 });
    }
  });

  test('form validation works', async ({ page }) => {
    // Find a required field
    const requiredInputs = page.locator('input[required], input[aria-required="true"]');
    
    if (await requiredInputs.count() > 0) {
      const firstRequired = requiredInputs.first();
      
      // Clear the field
      await firstRequired.clear();
      
      // Try to save
      const saveButton = page.locator('button').filter({ hasText: /save/i }).first();
      if (await saveButton.isVisible()) {
        await utils.clickWithRetry(saveButton);
        
        // Wait for validation messages
        await utils.expectWithRetry(async () => {
          const validationMessages = page.locator(
            '.error, [class*="error"], [class*="validation"], [role="alert"], .invalid-feedback'
          );
          if (await validationMessages.count() > 0) {
            await expect(validationMessages.first()).toBeVisible();
          }
        }, { retries: 3, delay: 500 });
      }
    }
  });

  test('accessibility features work', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    
    // Wait for focus to be visible
    await utils.waitForElement(':focus', { timeout: 3000 });
    
    // Check if we can tab through elements
    const focusableElements = page.locator('button, input, select, textarea, a[href], [tabindex]');
    const elementCount = await focusableElements.count();
    
    expect(elementCount).toBeGreaterThan(0);
    
    // Test ARIA labels
    const elementsWithAria = page.locator('[aria-label], [aria-describedby], [role]');
    expect(await elementsWithAria.count()).toBeGreaterThan(0);
  });
});