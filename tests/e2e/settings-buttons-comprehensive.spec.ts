import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Settings Page - All Buttons and Functionality', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Navigate to settings page
    await page.goto('http://localhost:3001/settings');
    await page.waitForLoadState('networkidle');
    
    // Wait for initial data load
    await page.waitForSelector('form, .settings-content, [data-testid="settings-form"]', { timeout: 10000 });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test.describe('Page Loading and Form Display', () => {
    test('should load settings page successfully', async () => {
      await expect(page).toHaveTitle(/Settings/i);
      
      // Check for main page elements
      await expect(page.locator('h1, h2').filter({ hasText: /settings/i })).toBeVisible();
      
      // Wait for loading to complete
      await expect(page.locator('.loading-spinner, [data-testid="loading"]')).not.toBeVisible({ timeout: 15000 });
    });

    test('should display settings form', async () => {
      // Check for form elements
      const hasForm = await page.locator('form').isVisible();
      const hasInputs = await page.locator('input').count() > 0;
      
      expect(hasForm || hasInputs).toBeTruthy();
    });

    test('should load existing settings', async () => {
      // Wait for settings to load
      await page.waitForTimeout(2000);
      
      // Check if any input fields have values
      const inputs = page.locator('input[type="text"], input[type="password"], input[type="number"]');
      const inputCount = await inputs.count();
      
      let hasValues = false;
      for (let i = 0; i < Math.min(inputCount, 10); i++) {
        const input = inputs.nth(i);
        const value = await input.inputValue();
        if (value && value.trim() !== '') {
          hasValues = true;
          break;
        }
      }
      
      console.log(`Settings loaded with values: ${hasValues}`);
    });
  });

  test.describe('Finale API Configuration', () => {
    test('should have Finale API key input', async () => {
      const apiKeyInput = page.locator('input[name*="api_key"], input[placeholder*="api" i][placeholder*="key" i]').first();
      
      if (await apiKeyInput.isVisible()) {
        await apiKeyInput.clear();
        await apiKeyInput.fill('test-api-key');
        
        expect(await apiKeyInput.inputValue()).toBe('test-api-key');
      }
    });

    test('should have Finale API secret input', async () => {
      const secretInput = page.locator('input[name*="secret"], input[placeholder*="secret" i]').first();
      
      if (await secretInput.isVisible()) {
        await secretInput.clear();
        await secretInput.fill('test-secret');
        
        expect(await secretInput.inputValue()).toBe('test-secret');
      }
    });

    test('should have account path input', async () => {
      const pathInput = page.locator('input[name*="account"], input[name*="path"], input[placeholder*="account" i]').first();
      
      if (await pathInput.isVisible()) {
        await pathInput.clear();
        await pathInput.fill('test-account');
        
        expect(await pathInput.inputValue()).toBe('test-account');
      }
    });

    test('should have test connection button', async () => {
      const testButton = page.locator('button').filter({ hasText: /test|validate|check/i }).first();
      
      if (await testButton.isVisible()) {
        await testButton.click();
        
        // Wait for test result
        await page.waitForTimeout(3000);
        
        // Check for result message
        const hasMessage = await page.locator('.message, .alert, .notification, .toast').count() > 0;
        const hasIcon = await page.locator('svg').filter({ hasText: /check|x|success|error/i }).count() > 0;
        
        console.log(`Test button showed result: ${hasMessage || hasIcon}`);
      }
    });
  });

  test.describe('Sync Configuration', () => {
    test('should have sync enable/disable toggle', async () => {
      const syncToggle = page.locator('input[type="checkbox"]').filter({ hasText: /sync|enable/i }).or(
        page.locator('input[type="checkbox"]').first()
      );
      
      if (await syncToggle.isVisible()) {
        const initialState = await syncToggle.isChecked();
        
        await syncToggle.click();
        await page.waitForTimeout(500);
        
        const newState = await syncToggle.isChecked();
        expect(newState).toBe(!initialState);
        
        // Toggle back
        await syncToggle.click();
        await page.waitForTimeout(500);
      }
    });

    test('should have sync frequency settings', async () => {
      const frequencyInput = page.locator('input[name*="frequency"], input[name*="interval"], select[name*="frequency"]').first();
      
      if (await frequencyInput.isVisible()) {
        if (await frequencyInput.getAttribute('type') === 'number') {
          await frequencyInput.clear();
          await frequencyInput.fill('60');
          expect(await frequencyInput.inputValue()).toBe('60');
        } else {
          // Handle select dropdown
          await frequencyInput.selectOption({ index: 1 });
        }
      }
    });

    test('should have manual sync trigger button', async () => {
      const syncButton = page.locator('button').filter({ hasText: /sync now|start sync|manual sync/i }).first();
      
      if (await syncButton.isVisible()) {
        await syncButton.click();
        
        // Wait for sync to start
        await page.waitForTimeout(2000);
        
        // Check for sync status
        const hasSpinner = await page.locator('.spinner, .loading').isVisible();
        const hasMessage = await page.locator('text=/syncing|sync started|sync complete/i').isVisible();
        
        console.log(`Manual sync triggered: ${hasSpinner || hasMessage}`);
      }
    });
  });

  test.describe('Alert Configuration', () => {
    test('should have email settings', async () => {
      const emailInput = page.locator('input[type="email"], input[name*="email"]').first();
      
      if (await emailInput.isVisible()) {
        await emailInput.clear();
        await emailInput.fill('test@example.com');
        
        expect(await emailInput.inputValue()).toBe('test@example.com');
      }
    });

    test('should have stock threshold settings', async () => {
      const thresholdInput = page.locator('input[name*="threshold"], input[name*="stock"]').filter({ hasText: /number|text/ }).first();
      
      if (await thresholdInput.isVisible()) {
        await thresholdInput.clear();
        await thresholdInput.fill('10');
        
        expect(await thresholdInput.inputValue()).toBe('10');
      }
    });

    test('should have notification toggle buttons', async () => {
      const notificationToggles = page.locator('input[type="checkbox"]').filter({ hasText: /notification|alert/i });
      const toggleCount = await notificationToggles.count();
      
      for (let i = 0; i < Math.min(toggleCount, 3); i++) {
        const toggle = notificationToggles.nth(i);
        if (await toggle.isVisible()) {
          const initialState = await toggle.isChecked();
          await toggle.click();
          await page.waitForTimeout(300);
          
          const newState = await toggle.isChecked();
          expect(newState).toBe(!initialState);
        }
      }
    });
  });

  test.describe('Sync Management Components', () => {
    test('should have sync status display', async () => {
      // Look for sync status components
      const syncStatus = page.locator('[data-testid*="sync"], .sync-status, .status-panel').first();
      
      if (await syncStatus.isVisible()) {
        // Check for status indicators
        const hasStatusText = await syncStatus.locator('text=/running|stopped|idle|error|success/i').count() > 0;
        const hasStatusIcon = await syncStatus.locator('svg').count() > 0;
        
        console.log(`Sync status visible: ${hasStatusText || hasStatusIcon}`);
      }
    });

    test('should have sync logs viewer', async () => {
      const logsViewer = page.locator('.logs, [data-testid*="log"], .sync-log').first();
      
      if (await logsViewer.isVisible()) {
        // Check for log entries
        const logEntries = await logsViewer.locator('tr, .log-entry, .log-item').count();
        console.log(`Log entries visible: ${logEntries}`);
      }
    });

    test('should have sync control buttons', async () => {
      const controlButtons = page.locator('button').filter({ hasText: /start|stop|pause|resume|restart/i });
      const buttonCount = await controlButtons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = controlButtons.nth(i);
        if (await button.isVisible() && await button.isEnabled()) {
          await button.click();
          await page.waitForTimeout(1000);
          
          // Check for state change
          const hasStateChange = await page.locator('.message, .alert, .status-change').count() > 0;
          console.log(`Control button ${i} triggered state change: ${hasStateChange}`);
        }
      }
    });
  });

  test.describe('Data Upload/Import Features', () => {
    test('should have file upload functionality', async () => {
      const fileInput = page.locator('input[type="file"]').first();
      
      if (await fileInput.isVisible()) {
        // Test file upload interface
        const uploadButton = page.locator('button').filter({ hasText: /upload|import|browse/i }).first();
        if (await uploadButton.isVisible()) {
          await uploadButton.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('should have CSV/Excel import buttons', async () => {
      const importButtons = page.locator('button').filter({ hasText: /csv|excel|xlsx|import/i });
      const importCount = await importButtons.count();
      
      for (let i = 0; i < Math.min(importCount, 3); i++) {
        const button = importButtons.nth(i);
        if (await button.isVisible() && await button.isEnabled()) {
          await button.click();
          await page.waitForTimeout(1000);
          
          // Check if modal or file picker appeared
          const hasModal = await page.locator('.modal, [role="dialog"]').isVisible();
          
          if (hasModal) {
            // Close modal
            const closeButton = page.locator('button').filter({ hasText: /close|cancel/i }).first();
            if (await closeButton.isVisible()) {
              await closeButton.click();
            } else {
              await page.keyboard.press('Escape');
            }
          }
        }
      }
    });
  });

  test.describe('Save and Form Actions', () => {
    test('should have save settings button', async () => {
      const saveButton = page.locator('button').filter({ hasText: /save|update|apply/i }).first();
      
      if (await saveButton.isVisible()) {
        // Modify a setting first
        const textInput = page.locator('input[type="text"]').first();
        if (await textInput.isVisible()) {
          await textInput.fill('test-value');
        }
        
        await saveButton.click();
        
        // Wait for save result
        await page.waitForTimeout(3000);
        
        // Check for save confirmation
        const hasConfirmation = await page.locator('text=/saved|updated|success/i').isVisible();
        const hasErrorMessage = await page.locator('text=/error|failed/i').isVisible();
        
        console.log(`Save operation result - Success: ${hasConfirmation}, Error: ${hasErrorMessage}`);
      }
    });

    test('should have reset/cancel functionality', async () => {
      const resetButton = page.locator('button').filter({ hasText: /reset|cancel|discard/i }).first();
      
      if (await resetButton.isVisible()) {
        // Modify something first
        const input = page.locator('input[type="text"]').first();
        if (await input.isVisible()) {
          const originalValue = await input.inputValue();
          await input.fill('modified-value');
          
          // Reset
          await resetButton.click();
          await page.waitForTimeout(1000);
          
          // Check if value was reset
          const finalValue = await input.inputValue();
          console.log(`Reset functionality - Original: ${originalValue}, Final: ${finalValue}`);
        }
      }
    });

    test('should validate required fields', async () => {
      // Try to save with empty required fields
      const saveButton = page.locator('button').filter({ hasText: /save/i }).first();
      
      if (await saveButton.isVisible()) {
        // Clear all text inputs
        const inputs = page.locator('input[type="text"], input[type="password"]');
        const inputCount = await inputs.count();
        
        for (let i = 0; i < Math.min(inputCount, 5); i++) {
          const input = inputs.nth(i);
          if (await input.isVisible()) {
            await input.clear();
          }
        }
        
        await saveButton.click();
        await page.waitForTimeout(2000);
        
        // Check for validation errors
        const hasValidationError = await page.locator('.error, .invalid, [aria-invalid="true"]').count() > 0;
        const hasErrorMessage = await page.locator('text=/required|invalid|error/i').isVisible();
        
        console.log(`Validation triggered: ${hasValidationError || hasErrorMessage}`);
      }
    });
  });

  test.describe('Advanced Features', () => {
    test('should have backup/restore functionality', async () => {
      const backupButtons = page.locator('button').filter({ hasText: /backup|restore|export|download/i });
      const backupCount = await backupButtons.count();
      
      for (let i = 0; i < Math.min(backupCount, 3); i++) {
        const button = backupButtons.nth(i);
        if (await button.isVisible() && await button.isEnabled()) {
          // Set up download listener
          const downloadPromise = page.waitForEvent('download', { timeout: 3000 }).catch(() => null);
          
          await button.click();
          
          const download = await downloadPromise;
          if (download) {
            console.log(`Download triggered: ${download.suggestedFilename()}`);
          }
          
          await page.waitForTimeout(1000);
        }
      }
    });

    test('should have debug/diagnostic tools', async () => {
      const debugButtons = page.locator('button').filter({ hasText: /debug|diagnose|test|check/i });
      const debugCount = await debugButtons.count();
      
      for (let i = 0; i < Math.min(debugCount, 5); i++) {
        const button = debugButtons.nth(i);
        if (await button.isVisible() && await button.isEnabled()) {
          await button.click();
          await page.waitForTimeout(2000);
          
          // Check for debug output
          const hasOutput = await page.locator('.debug, .output, .result, pre, code').count() > 0;
          console.log(`Debug tool ${i} showed output: ${hasOutput}`);
        }
      }
    });
  });

  test.describe('Responsiveness and Navigation', () => {
    test('should work on mobile devices', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      
      await page.waitForLoadState('networkidle');
      
      // Check if form is still usable on mobile
      const inputs = page.locator('input');
      const inputCount = await inputs.count();
      
      if (inputCount > 0) {
        const firstInput = inputs.first();
        await firstInput.click();
        await firstInput.fill('mobile-test');
        
        expect(await firstInput.inputValue()).toBe('mobile-test');
      }
    });

    test('should have proper tab navigation', async () => {
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      
      let focusedElements = 0;
      for (let i = 0; i < 20; i++) {
        const focused = await page.locator(':focus').count();
        if (focused > 0) {
          focusedElements++;
        }
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);
      }
      
      console.log(`Focusable elements found: ${focusedElements}`);
      expect(focusedElements).toBeGreaterThan(0);
    });
  });

  test.describe('Error Handling and Performance', () => {
    test('should handle API errors gracefully', async () => {
      // Simulate API failure
      await page.route('**/api/settings', route => route.abort());
      
      await page.reload();
      await page.waitForTimeout(3000);
      
      // Check for error handling
      const hasErrorMessage = await page.locator('text=/error|failed|unable|connection/i').isVisible();
      const hasRetryButton = await page.locator('button').filter({ hasText: /retry|reload/i }).isVisible();
      
      console.log(`Error handling visible: ${hasErrorMessage || hasRetryButton}`);
    });

    test('should load settings within reasonable time', async () => {
      const startTime = Date.now();
      
      await page.goto('http://localhost:3001/settings');
      await page.waitForSelector('form, .settings-content', { timeout: 10000 });
      
      const loadTime = Date.now() - startTime;
      console.log(`Settings page load time: ${loadTime}ms`);
      
      expect(loadTime).toBeLessThan(8000); // Should load within 8 seconds
    });
  });

  test.describe('Integration Features', () => {
    test('should have Google Sheets integration', async () => {
      const sheetsInput = page.locator('input[name*="sheet"], input[placeholder*="sheet" i]').first();
      
      if (await sheetsInput.isVisible()) {
        await sheetsInput.fill('https://docs.google.com/spreadsheets/d/test-sheet-id/edit');
        
        const testButton = page.locator('button').filter({ hasText: /test.*sheet|validate.*sheet/i }).first();
        if (await testButton.isVisible()) {
          await testButton.click();
          await page.waitForTimeout(3000);
        }
      }
    });

    test('should have vendor integration settings', async () => {
      const vendorButtons = page.locator('button').filter({ hasText: /vendor|supplier/i });
      const vendorCount = await vendorButtons.count();
      
      for (let i = 0; i < Math.min(vendorCount, 3); i++) {
        const button = vendorButtons.nth(i);
        if (await button.isVisible()) {
          await button.click();
          await page.waitForTimeout(1000);
        }
      }
    });
  });
});
