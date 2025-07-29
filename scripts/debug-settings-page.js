#!/usr/bin/env node

const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Debugging Settings Page...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to settings page
    console.log('1. Navigating to http://localhost:3000/settings...');
    await page.goto('http://localhost:3000/settings', { timeout: 30000 });
    console.log('   ✅ Page loaded\n');
    
    // Check for key elements
    console.log('2. Checking for test elements...');
    
    // Check for setting-input
    const settingInput = await page.locator('[data-testid="setting-input"]').count();
    console.log(`   - [data-testid="setting-input"]: ${settingInput > 0 ? '✅ Found' : '❌ Not found'} (${settingInput} elements)`);
    
    // Check for save button
    const saveButton = await page.locator('[data-testid="save-settings"]').count();
    console.log(`   - [data-testid="save-settings"]: ${saveButton > 0 ? '✅ Found' : '❌ Not found'} (${saveButton} elements)`);
    
    // Check for test connection buttons
    const testButtons = await page.locator('button:has-text("Test Connection")').count();
    console.log(`   - Test Connection buttons: ${testButtons > 0 ? '✅ Found' : '❌ Not found'} (${testButtons} buttons)`);
    
    // Check for manual sync button
    const syncButton = await page.locator('button:has-text("Start Manual Sync")').count();
    console.log(`   - Start Manual Sync button: ${syncButton > 0 ? '✅ Found' : '❌ Not found'} (${syncButton} buttons)`);
    
    // Check visibility of key elements
    console.log('\n3. Checking visibility...');
    if (settingInput > 0) {
      const inputVisible = await page.locator('[data-testid="setting-input"]').first().isVisible();
      console.log(`   - Setting input visible: ${inputVisible ? '✅ Yes' : '❌ No'}`);
    }
    
    if (saveButton > 0) {
      const saveVisible = await page.locator('[data-testid="save-settings"]').isVisible();
      const saveEnabled = await page.locator('[data-testid="save-settings"]').isEnabled();
      console.log(`   - Save button visible: ${saveVisible ? '✅ Yes' : '❌ No'}`);
      console.log(`   - Save button enabled: ${saveEnabled ? '✅ Yes' : '❌ No'}`);
    }
    
    // Get page title and any errors
    console.log('\n4. Page status...');
    const title = await page.title();
    console.log(`   - Page title: "${title}"`);
    
    // Check for any error messages
    const errorMessages = await page.locator('[data-testid="error-message"]').count();
    if (errorMessages > 0) {
      const errorText = await page.locator('[data-testid="error-message"]').first().textContent();
      console.log(`   - ⚠️  Error message found: "${errorText}"`);
    }
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'settings-debug.png' });
    console.log('\n5. Screenshot saved as settings-debug.png');
    
    // Get any console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait a bit to catch any delayed errors
    await page.waitForTimeout(2000);
    
    if (consoleErrors.length > 0) {
      console.log('\n6. Console errors found:');
      consoleErrors.forEach(err => console.log(`   - ${err}`));
    }
    
  } catch (error) {
    console.error('\n❌ Error during debugging:', error.message);
  } finally {
    await browser.close();
  }
  
  console.log('\n✅ Debug complete');
})();