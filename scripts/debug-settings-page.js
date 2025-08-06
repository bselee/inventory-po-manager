#!/usr/bin/env node

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to settings page
    await page.goto('http://localhost:3000/settings', { timeout: 30000 });
    // Check for key elements
    // Check for setting-input
    const settingInput = await page.locator('[data-testid="setting-input"]').count();
    // Check for save button
    const saveButton = await page.locator('[data-testid="save-settings"]').count();
    // Check for test connection buttons
    const testButtons = await page.locator('button:has-text("Test Connection")').count();
    // Check for manual sync button
    const syncButton = await page.locator('button:has-text("Start Manual Sync")').count();
    // Check visibility of key elements
    if (settingInput > 0) {
      const inputVisible = await page.locator('[data-testid="setting-input"]').first().isVisible();
    }
    
    if (saveButton > 0) {
      const saveVisible = await page.locator('[data-testid="save-settings"]').isVisible();
      const saveEnabled = await page.locator('[data-testid="save-settings"]').isEnabled();
    }
    
    // Get page title and any errors
    const title = await page.title();
    // Check for any error messages
    const errorMessages = await page.locator('[data-testid="error-message"]').count();
    if (errorMessages > 0) {
      const errorText = await page.locator('[data-testid="error-message"]').first().textContent();
    }
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'settings-debug.png' });
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
      consoleErrors.forEach(err => console.log(`   - ${err}`));
    }
    
  } catch (error) {
    console.error('\n❌ Error during debugging:', error.message);
  } finally {
    await browser.close();
  }
})();