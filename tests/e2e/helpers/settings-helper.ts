import { Page } from '@playwright/test';

/**
 * Helper to get CSRF token from the page
 */
export async function getCSRFToken(page: Page): Promise<string | null> {
  // Try to get CSRF token from meta tag
  const csrfMeta = await page.locator('meta[name="csrf-token"]').getAttribute('content');
  if (csrfMeta) return csrfMeta;

  // Try to get from window object
  const csrfFromWindow = await page.evaluate(() => {
    return (window as any).csrfToken || null;
  });
  if (csrfFromWindow) return csrfFromWindow;

  // Try to get from cookie
  const cookies = await page.context().cookies();
  const csrfCookie = cookies.find(c => c.name.includes('csrf'));
  if (csrfCookie) return csrfCookie.value;

  return null;
}

/**
 * Helper to save settings with proper CSRF handling
 */
export async function saveSettings(page: Page, settings: any): Promise<Response> {
  // First, get CSRF token
  const csrfToken = await getCSRFToken(page);
  
  // Make API call with CSRF token
  const response = await page.evaluate(async ({ url, settings, csrfToken }) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
    
    const res = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(settings),
      credentials: 'include' // Important for cookies
    });
    
    return {
      status: res.status,
      ok: res.ok,
      body: await res.text()
    };
  }, {
    url: '/api/settings',
    settings,
    csrfToken
  });
  
  return response as any;
}

/**
 * Helper to wait for settings to load
 */
export async function waitForSettingsToLoad(page: Page) {
  // Wait for the settings input to be visible and have a value
  const input = page.locator('[data-testid="setting-input"]');
  await input.waitFor({ state: 'visible' });
  
  // Wait for the input to have a numeric value (not empty)
  await page.waitForFunction(() => {
    const input = document.querySelector('[data-testid="setting-input"]') as HTMLInputElement;
    return input && input.value && !isNaN(parseInt(input.value));
  }, { timeout: 10000 });
}

/**
 * Helper to fill settings form
 */
export async function fillSettingsForm(page: Page, lowStockThreshold: string) {
  const input = page.locator('[data-testid="setting-input"]');
  await input.waitFor({ state: 'visible' });
  await input.clear();
  await input.fill(lowStockThreshold);
  
  // Verify the value was set
  const value = await input.inputValue();
  if (value !== lowStockThreshold) {
    throw new Error(`Failed to set input value. Expected: ${lowStockThreshold}, Got: ${value}`);
  }
}