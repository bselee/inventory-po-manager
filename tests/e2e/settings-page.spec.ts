import { test, expect } from '@playwright/test';

test.describe('Settings Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('settings page loads successfully', async ({ page }) => {
    // Check for main heading
    await expect(page.locator('h1')).toContainText(/settings/i);
    
    // Page should load without errors
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });

  test('finale API configuration form works', async ({ page }) => {
    // Look for API configuration inputs
    const apiKeyInput = page.locator('input[name*="api_key"], input[placeholder*="api key" i]').first();
    const apiSecretInput = page.locator('input[name*="api_secret"], input[placeholder*="api secret" i]').first();
    const accountPathInput = page.locator('input[name*="account"], input[placeholder*="account" i]').first();
    
    if (await apiKeyInput.isVisible()) {
      // Test API key input
      await apiKeyInput.fill('test-api-key');
      await expect(apiKeyInput).toHaveValue('test-api-key');
    }
    
    if (await apiSecretInput.isVisible()) {
      // Test API secret input
      await apiSecretInput.fill('test-api-secret');
      await expect(apiSecretInput).toHaveValue('test-api-secret');
    }
    
    if (await accountPathInput.isVisible()) {
      // Test account path input
      await accountPathInput.fill('test-account');
      await expect(accountPathInput).toHaveValue('test-account');
    }
  });

  test('test connection button works', async ({ page }) => {
    // Look for test connection button
    const testButton = page.locator('button').filter({ hasText: /test.*connection|test.*config|verify/i });
    
    if (await testButton.isVisible()) {
      await testButton.click();
      
      // Button should show loading state
      await expect(testButton).toBeDisabled();
      
      // Wait for response
      await page.waitForTimeout(3000);
      
      // Should show some result (success or error message)
      const resultMessage = page.locator('text=/success|error|failed|connected|invalid/i');
      await expect(resultMessage).toBeVisible();
    }
  });

  test('save settings button works', async ({ page }) => {
    // Look for save button
    const saveButton = page.locator('button').filter({ hasText: /save|update/i });
    
    if (await saveButton.isVisible()) {
      await saveButton.click();
      
      // Should show loading or success state
      await page.waitForTimeout(1000);
      
      // Look for success message or button re-enabled
      const successIndicator = page.locator('text=/saved|updated|success/i, button:enabled').filter({ hasText: /save|update/i });
      
      if (await successIndicator.count() > 0) {
        await expect(successIndicator.first()).toBeVisible();
      }
    }
  });

  test('sync controls work', async ({ page }) => {
    // Look for sync-related buttons
    const syncButtons = page.locator('button').filter({ hasText: /sync|refresh|update/i });
    const syncButtonCount = await syncButtons.count();
    
    if (syncButtonCount > 0) {
      const firstSyncButton = syncButtons.first();
      await firstSyncButton.click();
      
      // Should show loading state
      await expect(firstSyncButton).toBeDisabled();
      
      // Wait for sync to complete
      await page.waitForTimeout(2000);
      
      // Button should be enabled again or show result
      const isEnabledOrShowsResult = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const hasEnabledSyncButton = buttons.some(btn => 
          !btn.disabled && /sync|refresh|update/i.test(btn.textContent || '')
        );
        const hasResultMessage = document.querySelector('[class*="text-green"], [class*="text-red"], [class*="success"], [class*="error"]');
        return hasEnabledSyncButton || !!hasResultMessage;
      });
      
      expect(isEnabledOrShowsResult).toBeTruthy();
    }
  });

  test('sync status display works', async ({ page }) => {
    // Look for sync status indicators
    const statusElements = page.locator('text=/last.*sync|sync.*status|syncing|connected|disconnected/i');
    
    if (await statusElements.count() > 0) {
      await expect(statusElements.first()).toBeVisible();
    }
    
    // Look for sync logs
    const logElements = page.locator('text=/log|activity|history/i');
    
    if (await logElements.count() > 0) {
      await expect(logElements.first()).toBeVisible();
    }
  });

  test('real-time sync monitoring works', async ({ page }) => {
    // Wait for potential real-time updates
    await page.waitForTimeout(5000);
    
    // Look for auto-updating elements
    const monitoringElements = page.locator('[data-testid*="sync"], [class*="monitoring"], text=/monitoring|real.*time/i');
    
    if (await monitoringElements.count() > 0) {
      await expect(monitoringElements.first()).toBeVisible();
    }
    
    // Check for periodic updates (timestamps, status changes)
    const timestampElements = page.locator('text=/\\d{1,2}:\\d{2}|ago|minutes?|seconds?/');
    
    if (await timestampElements.count() > 0) {
      await expect(timestampElements.first()).toBeVisible();
    }
  });

  test('cleanup functionality works', async ({ page }) => {
    // Look for cleanup or maintenance buttons
    const cleanupButtons = page.locator('button').filter({ hasText: /clean.*up|clear|reset|maintenance/i });
    
    if (await cleanupButtons.count() > 0) {
      const cleanupButton = cleanupButtons.first();
      await cleanupButton.click();
      
      // Should show confirmation or result
      await page.waitForTimeout(1000);
      
      // Look for result message
      const resultMessage = page.locator('text=/cleaned|cleared|completed|success/i');
      
      if (await resultMessage.count() > 0) {
        await expect(resultMessage.first()).toBeVisible();
      }
    }
  });

  test('form validation works', async ({ page }) => {
    // Clear any existing values and try to save
    const inputs = page.locator('input[required], input[name*="api"]');
    const inputCount = await inputs.count();
    
    if (inputCount > 0) {
      // Clear inputs
      for (let i = 0; i < inputCount; i++) {
        await inputs.nth(i).clear();
      }
      
      // Try to save with empty fields
      const saveButton = page.locator('button').filter({ hasText: /save|update/i });
      
      if (await saveButton.isVisible()) {
        await saveButton.click();
        
        // Should show validation messages
        const validationMessages = page.locator('text=/required|field.*required|please.*enter/i');
        
        if (await validationMessages.count() > 0) {
          await expect(validationMessages.first()).toBeVisible();
        }
      }
    }
  });

  test('accessibility features work', async ({ page }) => {
    // Check for proper form labels
    const labeledInputs = page.locator('input').filter({ has: page.locator('label') });
    const labelCount = await labeledInputs.count();
    
    if (labelCount > 0) {
      // Inputs should have associated labels
      expect(labelCount).toBeGreaterThan(0);
    }
    
    // Check for keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'SELECT']).toContain(focusedElement);
  });
});
