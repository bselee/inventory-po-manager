import { test, expect, devices } from '@playwright/test';

// Desktop tests (default viewport)
test.describe('Settings Page - Button Functionality [Desktop]', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    // Wait for the loading spinner to disappear and the main content to appear
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 30000 });
    // Wait for the settings form to be visible
    await page.waitForSelector('h1:has-text("Settings")', { state: 'visible', timeout: 15000 });
    // Give the page a moment to fully hydrate
    await page.waitForTimeout(1000);
  });

  test('All main buttons are visible and enabled', async ({ page }) => {
    const saveBtn = page.locator('[data-testid="save-settings"]');
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toBeEnabled();
    const testBtns = page.locator('button:has-text("Test Connection")');
    await expect(testBtns.first()).toBeVisible();
    for (let i = 0; i < await testBtns.count(); i++) {
      await expect(testBtns.nth(i)).toBeEnabled();
    }
    const syncBtn = page.locator('button:has-text("Start Manual Sync")');
    if (await syncBtn.count()) {
      await expect(syncBtn).toBeVisible();
      await expect(syncBtn).toBeEnabled();
    }
  });

  test('Save button triggers success message and persists setting', async ({ page }) => {
    const input = page.locator('[data-testid="setting-input"]');
    await input.fill('42');
    const saveBtn = page.locator('[data-testid="save-settings"]');
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 10000 });
    await page.reload();
    await expect(page.locator('[data-testid="setting-input"]')).toHaveValue('42');
  });

  test('Test Connection buttons show success or error', async ({ page }) => {
    const testBtns = page.locator('button:has-text("Test Connection")');
    for (let i = 0; i < await testBtns.count(); i++) {
      const btn = testBtns.nth(i);
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      await expect(
        page.locator('[data-testid="success-message"], [data-testid="error-message"]')
      ).toBeVisible({ timeout: 15000 });
      await page.evaluate(() => {
        const el = document.querySelector('[data-testid="success-message"], [data-testid="error-message"]');
        if (el) el.remove();
      });
      // Buffer API calls to avoid overwhelming the backend
      await page.waitForTimeout(2000); // 2 seconds between calls
    }
  });

  test('Manual Sync button triggers status update', async ({ page }) => {
    const syncBtn = page.locator('button:has-text("Start Manual Sync")');
    if (await syncBtn.count()) {
      await syncBtn.scrollIntoViewIfNeeded();
      await syncBtn.click();
      await expect(
        page.locator('[data-testid="success-message"], [data-testid="error-message"]')
      ).toBeVisible({ timeout: 15000 });
    }
  });

  test('Proper error message shown on API failure', async ({ page }) => {
    await page.route('/api/settings', route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Server error' })
    }));
    const saveBtn = page.locator('[data-testid="save-settings"]');
    await saveBtn.click();
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 });
  });
});


// Set device emulation for mobile tests at the top level
test.use({ ...devices['iPhone 12'] });
test.describe('Settings Page - Button Functionality [Mobile]', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    // Wait for the loading spinner to disappear and the main content to appear
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 30000 });
    // Wait for the settings form to be visible
    await page.waitForSelector('h1:has-text("Settings")', { state: 'visible', timeout: 15000 });
    // Give the page a moment to fully hydrate
    await page.waitForTimeout(1000);
  });

  test('All main buttons are visible and enabled', async ({ page }) => {
    const saveBtn = page.locator('[data-testid="save-settings"]');
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toBeEnabled();
    const testBtns = page.locator('button:has-text("Test Connection")');
    await expect(testBtns.first()).toBeVisible();
    for (let i = 0; i < await testBtns.count(); i++) {
      await expect(testBtns.nth(i)).toBeEnabled();
    }
    const syncBtn = page.locator('button:has-text("Start Manual Sync")');
    if (await syncBtn.count()) {
      await expect(syncBtn).toBeVisible();
      await expect(syncBtn).toBeEnabled();
    }
  });

  test('Save button triggers success message and persists setting', async ({ page }) => {
    const input = page.locator('[data-testid="setting-input"]');
    await input.fill('42');
    const saveBtn = page.locator('[data-testid="save-settings"]');
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 10000 });
    await page.reload();
    await expect(page.locator('[data-testid="setting-input"]')).toHaveValue('42');
  });

  test('Test Connection buttons show success or error', async ({ page }) => {
    const testBtns = page.locator('button:has-text("Test Connection")');
    for (let i = 0; i < await testBtns.count(); i++) {
      const btn = testBtns.nth(i);
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      await expect(
        page.locator('[data-testid="success-message"], [data-testid="error-message"]')
      ).toBeVisible({ timeout: 15000 });
      await page.evaluate(() => {
        const el = document.querySelector('[data-testid="success-message"], [data-testid="error-message"]');
        if (el) el.remove();
      });
      // Buffer API calls to avoid overwhelming the backend
      await page.waitForTimeout(2000); // 2 seconds between calls
    }
  });

  test('Manual Sync button triggers status update', async ({ page }) => {
    const syncBtn = page.locator('button:has-text("Start Manual Sync")');
    if (await syncBtn.count()) {
      await syncBtn.scrollIntoViewIfNeeded();
      await syncBtn.click();
      await expect(
        page.locator('[data-testid="success-message"], [data-testid="error-message"]')
      ).toBeVisible({ timeout: 15000 });
    }
  });

  test('Proper error message shown on API failure', async ({ page }) => {
    await page.route('/api/settings', route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Server error' })
    }));
    const saveBtn = page.locator('[data-testid="save-settings"]');
    await saveBtn.click();
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 });
  });
});
