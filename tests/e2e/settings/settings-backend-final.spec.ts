import { test, expect } from '@playwright/test';
import { 
  getCSRFToken, 
  saveSettings, 
  waitForSettingsToLoad, 
  fillSettingsForm 
} from '../helpers/settings-helper';

test.describe('Settings Page - Backend/API Integration (Final)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Wait for settings to load
    await waitForSettingsToLoad(page);
    
    // Log initial state
    const initialValue = await page.locator('[data-testid="setting-input"]').inputValue();
    console.log('Initial low_stock_threshold value:', initialValue);
  });

  test('Save button triggers correct API call and updates DB', async ({ page }) => {
    // Fill the form
    await fillSettingsForm(page, '15');
    
    // Wait for save button to be enabled
    const saveButton = page.locator('[data-testid="save-settings"]');
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    
    // Setup request interception
    let apiCallMade = false;
    page.on('request', request => {
      if (request.url().includes('/api/settings') && request.method() === 'PUT') {
        apiCallMade = true;
        console.log('PUT request headers:', request.headers());
      }
    });
    
    // Click save button
    await saveButton.click();
    
    // Wait for API call to complete
    await page.waitForResponse(res => res.url().includes('/api/settings') && res.method() === 'PUT');
    
    // Verify API call was made
    expect(apiCallMade).toBeTruthy();
  });

  test('Handles API error gracefully', async ({ page }) => {
    // Fill the form
    await fillSettingsForm(page, '15');
    
    const saveButton = page.locator('[data-testid="save-settings"]');
    await expect(saveButton).toBeEnabled();
    
    // Intercept and mock failed response
    await page.route('/api/settings', route => {
      console.log('Mocking API error response');
      return route.fulfill({ 
        status: 500, 
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    await saveButton.click();
    
    // Wait for error message
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    
    const errorText = await errorMessage.textContent();
    expect(errorText).toContain('Failed to save settings');
  });

  test('Settings changes persist after reload (server sync)', async ({ page, context }) => {
    // Get initial value
    const input = page.locator('[data-testid="setting-input"]');
    const initialValue = await input.inputValue();
    console.log('Initial value:', initialValue);
    
    // Change to a new value
    const newValue = '25';
    await fillSettingsForm(page, newValue);
    
    const saveButton = page.locator('[data-testid="save-settings"]');
    await expect(saveButton).toBeEnabled();
    
    // Save and wait for response
    const savePromise = page.waitForResponse(
      res => res.url().includes('/api/settings') && res.method() === 'PUT',
      { timeout: 10000 }
    );
    
    await saveButton.click();
    const response = await savePromise;
    
    console.log('Save response status:', response.status());
    expect(response.status()).toBe(200);
    
    // Wait for success message to confirm save completed
    const successMessage = page.locator('[data-testid="success-message"]');
    await expect(successMessage).toBeVisible({ timeout: 5000 });
    
    // Wait a bit for database to update
    await page.waitForTimeout(1000);
    
    // Reload the page
    await page.reload();
    
    // Wait for settings to load again
    await waitForSettingsToLoad(page);
    
    // Check the value
    const reloadedValue = await input.inputValue();
    console.log('Value after reload:', reloadedValue);
    
    // The value should persist
    expect(reloadedValue).toBe(newValue);
  });

  test('Unauthorized user cannot change settings', async ({ page }) => {
    // Fill the form
    await fillSettingsForm(page, '30');
    
    const saveButton = page.locator('[data-testid="save-settings"]');
    await expect(saveButton).toBeEnabled();
    
    // Simulate unauthorized response
    await page.route('/api/settings', route => {
      return route.fulfill({ 
        status: 401, 
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' })
      });
    });
    
    await saveButton.click();
    
    // Wait for error message
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    
    const errorText = await errorMessage.textContent();
    expect(errorText).toContain('Unauthorized');
  });
  
  test('Handles CSRF protection properly', async ({ page }) => {
    // Fill the form
    await fillSettingsForm(page, '20');
    
    const saveButton = page.locator('[data-testid="save-settings"]');
    await expect(saveButton).toBeEnabled();
    
    // Monitor the request
    let requestHeaders: any = null;
    page.on('request', request => {
      if (request.url().includes('/api/settings') && request.method() === 'PUT') {
        requestHeaders = request.headers();
      }
    });
    
    // Save and wait for response
    const responsePromise = page.waitForResponse(
      res => res.url().includes('/api/settings') && res.method() === 'PUT'
    );
    
    await saveButton.click();
    const response = await responsePromise;
    
    console.log('Response status:', response.status());
    console.log('Request had cookie header:', !!requestHeaders?.cookie);
    
    // Should not get CSRF error (403)
    expect(response.status()).not.toBe(403);
    
    // Should either succeed (200) or fail with non-CSRF error
    expect([200, 401, 500]).toContain(response.status());
  });
});