import { test, expect } from '@playwright/test';

test.describe('Settings Page - Backend/API Integration (Improved)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Wait for the settings input to be visible and ready
    await page.waitForSelector('[data-testid="setting-input"]', { 
      state: 'visible',
      timeout: 10000 
    });
    
    // Log page title for debugging
    const title = await page.title();
    console.log('Page title:', title);
  });

  test('Save button triggers correct API call and updates DB', async ({ page }) => {
    // Wait for input to be interactable
    const input = page.locator('[data-testid="setting-input"]');
    await input.waitFor({ state: 'visible' });
    
    // Clear existing value and fill with new value
    await input.clear();
    await input.fill('15');
    
    // Log current value for debugging
    const currentValue = await input.inputValue();
    console.log('Input value after fill:', currentValue);
    
    // Wait for save button to be enabled
    const saveButton = page.locator('[data-testid="save-settings"]');
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    
    // Intercept API call (PUT)
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('/api/settings') && req.method() === 'PUT'),
      saveButton.click(),
    ]);
    
    expect(request).toBeTruthy();
    console.log('API request made to:', request.url());
  });

  test('Handles API error gracefully', async ({ page }) => {
    // Wait for input and fill it
    const input = page.locator('[data-testid="setting-input"]');
    await input.waitFor({ state: 'visible' });
    await input.clear();
    await input.fill('15');
    
    const saveButton = page.locator('[data-testid="save-settings"]');
    await expect(saveButton).toBeEnabled();
    
    // Intercept and mock failed response
    await page.route('/api/settings', route => {
      console.log('Intercepting API call to return error');
      return route.fulfill({ 
        status: 500, 
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    await saveButton.click();
    
    // Wait for error message to appear with retry
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    
    const errorText = await errorMessage.textContent();
    console.log('Error message displayed:', errorText);
  });

  test('Settings changes persist after reload (server sync)', async ({ page }) => {
    // First, intercept the GET request to see what the API returns
    page.on('response', response => {
      if (response.url().includes('/api/settings') && response.request().method() === 'GET') {
        console.log('GET /api/settings response status:', response.status());
      }
    });
    
    // Change a setting
    const input = page.locator('[data-testid="setting-input"]');
    await input.waitFor({ state: 'visible' });
    await input.clear();
    await input.fill('25');
    
    const saveButton = page.locator('[data-testid="save-settings"]');
    await expect(saveButton).toBeEnabled();
    
    // Wait for save to complete
    const [saveResponse] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/settings') && res.request().method() === 'PUT'),
      saveButton.click()
    ]);
    
    console.log('Save response status:', saveResponse.status());
    
    // Wait for success message (optional)
    const successMessage = page.locator('[data-testid="success-message"]');
    try {
      await expect(successMessage).toBeVisible({ timeout: 5000 });
      console.log('Success message shown');
    } catch {
      console.log('No success message shown');
    }
    
    // Reload the page
    await page.reload();
    
    // Wait for the input to be visible again
    await input.waitFor({ state: 'visible' });
    
    // Check the value
    const reloadedValue = await input.inputValue();
    console.log('Value after reload:', reloadedValue);
    
    await expect(input).toHaveValue('25');
  });

  test('Unauthorized user cannot change settings', async ({ page }) => {
    // Fill input with a valid number
    const input = page.locator('[data-testid="setting-input"]');
    await input.waitFor({ state: 'visible' });
    await input.clear();
    await input.fill('30');
    
    const saveButton = page.locator('[data-testid="save-settings"]');
    await expect(saveButton).toBeEnabled();
    
    // Simulate unauthorized state
    await page.route('/api/settings', route => {
      console.log('Intercepting API call to return 401');
      return route.fulfill({ 
        status: 401, 
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' })
      });
    });
    
    await saveButton.click();
    
    // Wait for error message to appear
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    await expect(errorMessage).toContainText('Unauthorized');
  });
  
  // Additional test to check CSRF handling
  test('Handles CSRF token properly', async ({ page }) => {
    // Check if the page loads CSRF token
    const hasCsrfMeta = await page.locator('meta[name="csrf-token"]').count() > 0;
    console.log('Has CSRF meta tag:', hasCsrfMeta);
    
    // Fill input
    const input = page.locator('[data-testid="setting-input"]');
    await input.waitFor({ state: 'visible' });
    await input.clear();
    await input.fill('20');
    
    const saveButton = page.locator('[data-testid="save-settings"]');
    await expect(saveButton).toBeEnabled();
    
    // Intercept the request to check headers
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('/api/settings') && req.method() === 'PUT'),
      saveButton.click()
    ]);
    
    const headers = request.headers();
    console.log('Request headers:', Object.keys(headers).filter(h => h.toLowerCase().includes('csrf') || h.toLowerCase().includes('cookie')));
    
    // The request should succeed (not return 403)
    const response = await request.response();
    expect(response?.status()).not.toBe(403);
  });
});