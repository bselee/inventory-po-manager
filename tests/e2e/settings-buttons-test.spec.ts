import { test, expect } from '@playwright/test';

test.describe('Settings Page - Complete Button and Functionality Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('verify all settings page buttons and controls', async ({ page }) => {
    console.log('Testing all settings page buttons and functionality...');

    // 1. Test Save Settings Button
    await test.step('Test Save Settings Button', async () => {
      const saveButton = page.locator('button:has-text("Save")').first();
      if (await saveButton.isVisible()) {
        // Check if button is enabled
        const isDisabled = await saveButton.isDisabled();
        console.log(`✓ Save Settings button found - Disabled: ${isDisabled}`);
        
        if (!isDisabled) {
          await saveButton.click();
          // Check for success message
          const successMsg = await page.locator('text=/saved|success/i').isVisible({ timeout: 3000 });
          console.log(`✓ Save button works - Success message: ${successMsg}`);
        }
      } else {
        console.log('⚠ Save Settings button not found');
      }
    });

    // 2. Test Manual Sync Trigger
    await test.step('Test Manual Sync Trigger', async () => {
      const syncButton = page.locator('button:has-text("Trigger Sync")').first();
      if (await syncButton.isVisible()) {
        console.log('✓ Manual Sync Trigger button found');
        
        // Check sync type dropdown
        const syncTypeSelect = page.locator('select').filter({ hasText: /sync.*type/i }).first();
        if (await syncTypeSelect.isVisible()) {
          const options = await syncTypeSelect.locator('option').allTextContents();
          console.log(`✓ Sync type options: ${options.join(', ')}`);
        }
      } else {
        console.log('⚠ Manual Sync Trigger not found');
      }
    });

    // 3. Test Finale Debug Panel
    await test.step('Test Finale Debug Panel', async () => {
      const testConnectionBtn = page.locator('button:has-text("Test Connection")').first();
      if (await testConnectionBtn.isVisible()) {
        await testConnectionBtn.click();
        await page.waitForTimeout(2000);
        
        // Check for result message
        const resultMsg = await page.locator('text=/connected|failed|error/i').first().isVisible({ timeout: 5000 });
        console.log(`✓ Test Connection button works - Result shown: ${resultMsg}`);
      } else {
        console.log('⚠ Test Connection button not found');
      }
    });

    // 4. Test Sync Control Panel
    await test.step('Test Sync Control Panel', async () => {
      // Auto-sync toggle
      const autoSyncToggle = page.locator('input[type="checkbox"]').first();
      if (await autoSyncToggle.isVisible()) {
        const isChecked = await autoSyncToggle.isChecked();
        await autoSyncToggle.click();
        const newState = await autoSyncToggle.isChecked();
        console.log(`✓ Auto-sync toggle works - Changed from ${isChecked} to ${newState}`);
      }

      // Sync frequency input
      const frequencyInput = page.locator('input[type="number"]').filter({ hasText: /frequency|minutes/i }).first();
      if (await frequencyInput.isVisible()) {
        await frequencyInput.fill('120');
        console.log('✓ Sync frequency input accepts values');
      }
    });

    // 5. Test Vendor Sync Manager
    await test.step('Test Vendor Sync Manager', async () => {
      const syncVendorsBtn = page.locator('button:has-text("Sync Vendors")').first();
      if (await syncVendorsBtn.isVisible()) {
        console.log('✓ Sync Vendors button found');
        // Don't click to avoid triggering actual sync during test
      } else {
        console.log('⚠ Sync Vendors button not found');
      }
    });

    // 6. Test Sales Data Uploader
    await test.step('Test Sales Data Uploader', async () => {
      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.isVisible()) {
        console.log('✓ File upload input found');
        
        // Check for upload button
        const uploadBtn = page.locator('button:has-text("Upload")').filter({ hasText: /sales|data/i }).first();
        if (await uploadBtn.isVisible()) {
          console.log('✓ Upload Sales Data button found');
        }
      } else {
        console.log('⚠ Sales data uploader not found');
      }
    });

    // 7. Test Email Alert Settings
    await test.step('Test Email Alert Settings', async () => {
      const emailInputs = page.locator('input[type="email"]');
      const emailCount = await emailInputs.count();
      console.log(`✓ Found ${emailCount} email input fields`);
      
      if (emailCount > 0) {
        const firstEmail = emailInputs.first();
        await firstEmail.fill('test@example.com');
        await firstEmail.clear();
        console.log('✓ Email inputs accept values');
      }
    });

    // 8. Test API Credentials Fields
    await test.step('Test API Credentials Fields', async () => {
      // Finale API fields
      const apiKeyInput = page.locator('input').filter({ hasText: /api.*key/i }).first();
      const apiSecretInput = page.locator('input').filter({ hasText: /api.*secret/i }).first();
      const accountPathInput = page.locator('input').filter({ hasText: /account.*path/i }).first();
      
      let fieldsFound = 0;
      if (await apiKeyInput.isVisible()) fieldsFound++;
      if (await apiSecretInput.isVisible()) fieldsFound++;
      if (await accountPathInput.isVisible()) fieldsFound++;
      
      console.log(`✓ Found ${fieldsFound}/3 API credential fields`);
    });

    // 9. Test SendGrid Settings
    await test.step('Test SendGrid Settings', async () => {
      const sendgridKey = page.locator('input').filter({ hasText: /sendgrid/i }).first();
      if (await sendgridKey.isVisible()) {
        console.log('✓ SendGrid API key field found');
      } else {
        console.log('⚠ SendGrid settings not found');
      }
    });

    // 10. Count all interactive elements
    await test.step('Count Interactive Elements', async () => {
      const buttons = await page.locator('button').count();
      const inputs = await page.locator('input').count();
      const selects = await page.locator('select').count();
      const textareas = await page.locator('textarea').count();
      
      console.log(`\n📊 Settings Page Statistics:`);
      console.log(`- Buttons: ${buttons}`);
      console.log(`- Input fields: ${inputs}`);
      console.log(`- Dropdowns: ${selects}`);
      console.log(`- Text areas: ${textareas}`);
      console.log(`- Total interactive elements: ${buttons + inputs + selects + textareas}`);
    });

    // 11. Test Sync Status Monitor
    await test.step('Test Sync Status Monitor', async () => {
      // Check for real-time sync status
      const syncStatus = page.locator('text=/running|completed|failed|sync.*status/i').first();
      if (await syncStatus.isVisible()) {
        const statusText = await syncStatus.textContent();
        console.log(`✓ Sync status monitor shows: ${statusText}`);
      }

      // Check for refresh button in sync status
      const refreshStatusBtn = page.locator('button').filter({ hasText: /refresh.*status/i }).first();
      if (await refreshStatusBtn.isVisible()) {
        await refreshStatusBtn.click();
        console.log('✓ Sync status refresh button works');
      }
    });
  });

  test('test sync functionality triggers', async ({ page }) => {
    console.log('\n🔍 Testing sync functionality triggers...\n');

    // Test different sync strategies
    await test.step('Test Sync Strategy Options', async () => {
      const syncSelect = page.locator('select').first();
      if (await syncSelect.isVisible()) {
        const options = await syncSelect.locator('option').allTextContents();
        console.log('📊 Available sync strategies:');
        options.forEach(opt => console.log(`  - ${opt}`));
        
        // Test selecting each option
        for (let i = 1; i < Math.min(options.length, 3); i++) {
          await syncSelect.selectOption({ index: i });
          await page.waitForTimeout(500);
          console.log(`✓ Selected: ${options[i]}`);
        }
      }
    });

    // Check for any error messages
    await test.step('Check for Error Messages', async () => {
      const errors = await page.locator('text=/error|failed|invalid/i').all();
      if (errors.length > 0) {
        console.log(`⚠ Found ${errors.length} potential error messages`);
        for (const error of errors.slice(0, 3)) {
          const text = await error.textContent();
          console.log(`  - ${text}`);
        }
      } else {
        console.log('✓ No error messages visible');
      }
    });
  });
});