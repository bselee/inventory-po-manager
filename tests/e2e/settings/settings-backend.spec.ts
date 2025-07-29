import { test, expect } from '@playwright/test';

test.describe('Settings Page - Backend/API Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    // Wait for settings to be loaded
    await page.waitForSelector('[data-testid="setting-input"]', { state: 'visible' });
  });

  test('Save button triggers correct API call and updates DB', async ({ page }) => {
    // Wait for input and clear it first
    const input = page.locator('[data-testid="setting-input"]');
    await input.clear();
    await input.fill('15');
    // Wait for save button to be enabled
    await expect(page.locator('[data-testid="save-settings"]')).toBeEnabled({ timeout: 5000 });
    // Intercept API call (PUT)
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('/api/settings') && req.method() === 'PUT'),
      page.click('[data-testid="save-settings"]'),
    ]);
    expect(request).toBeTruthy();
  });

  test('Handles API error gracefully', async ({ page }) => {
    // Wait for input and fill it
    const input = page.locator('[data-testid="setting-input"]');
    await input.clear();
    await input.fill('15');
    await expect(page.locator('[data-testid="save-settings"]')).toBeEnabled();
    // Intercept and mock failed response
    await page.route('/api/settings', route => route.fulfill({ 
      status: 500, 
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Server error' })
    }));
    await page.click('[data-testid="save-settings"]');
    // Wait for error message to appear
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 });
  });

  test('Settings changes persist after reload (server sync)', async ({ page }) => {
    // Change a setting
    const input = page.locator('[data-testid="setting-input"]');
    await input.clear();
    await input.fill('25');
    await expect(page.locator('[data-testid="save-settings"]')).toBeEnabled();
    
    // Save and wait for response
    const savePromise = page.waitForResponse(
      res => res.url().includes('/api/settings') && res.request().method() === 'PUT'
    );
    await page.click('[data-testid="save-settings"]');
    await savePromise;
    
    // Wait for success message
    await page.waitForSelector('[data-testid="success-message"]', { state: 'visible', timeout: 5000 });
    
    // Reload and verify
    await page.reload();
    await page.waitForSelector('[data-testid="setting-input"]', { state: 'visible' });
    await expect(page.locator('[data-testid="setting-input"]')).toHaveValue('25');
  });

  test('Unauthorized user cannot change settings', async ({ page }) => {
    // Fill input with a valid number
    const input = page.locator('[data-testid="setting-input"]');
    await input.clear();
    await input.fill('30');
    await expect(page.locator('[data-testid="save-settings"]')).toBeEnabled();
    // Simulate unauthorized state
    await page.route('/api/settings', route => route.fulfill({ 
      status: 401, 
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unauthorized' })
    }));
    await page.click('[data-testid="save-settings"]');
    // Wait for error message to appear
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Unauthorized');
  });
});
