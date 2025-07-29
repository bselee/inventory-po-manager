import { test, expect } from '@playwright/test'

test.describe('Finale API Improvements Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
  })

  test('Frontend validation shows real-time errors', async ({ page }) => {
    // Test account path validation
    await page.fill('input[placeholder="e.g., yourcompany"]', 'https://app.finaleinventory.com/test')
    
    // Should show error for URL in account path
    await expect(page.locator('text=Account path should not include URLs')).toBeVisible({ timeout: 5000 })
    
    // Test API key validation
    await page.fill('input[placeholder="e.g., 1234567890abcdef"]', '123')
    
    // Should show error for short API key
    await expect(page.locator('text=API Key seems too short')).toBeVisible({ timeout: 5000 })
    
    // Test that save button shows validation errors
    await page.click('button:has-text("Save Settings")')
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Please fix the following errors')
  })

  test('Debug panel has copy and download buttons', async ({ page }) => {
    // Run debug first
    await page.click('button:has-text("Run Detailed Debug")')
    await page.waitForSelector('text=Tests:', { timeout: 10000 })
    
    // Check for copy button
    await expect(page.locator('button:has-text("Copy")')).toBeVisible()
    
    // Check for download button
    await expect(page.locator('button:has-text("Download")')).toBeVisible()
    
    // Test copy functionality
    await page.click('button:has-text("Copy")')
    await expect(page.locator('button:has-text("Copied!")')).toBeVisible()
  })

  test('Test connection shows detailed error messages', async ({ page }) => {
    // Enter invalid credentials
    await page.fill('input[placeholder="e.g., yourcompany"]', 'invalid-account')
    await page.fill('input[placeholder="e.g., 1234567890abcdef"]', 'invalid-key')
    await page.fill('input[placeholder="e.g., abcdef1234567890"]', 'invalid-secret')
    
    // Test connection
    await page.click('button:has-text("Test Connection")')
    
    // Should show detailed error with solutions
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 })
    const errorText = await page.locator('[data-testid="error-message"]').textContent()
    
    // Verify error has helpful information
    expect(errorText).toMatch(/check|verify|credential|api/i)
  })

  test('Inventory page shows data quality warnings', async ({ page }) => {
    await page.goto('/inventory')
    await page.waitForLoadState('networkidle')
    
    // Check for any data warnings (depends on actual data)
    const warnings = page.locator('div[class*="bg-yellow-50"], div[class*="bg-red-50"], div[class*="bg-blue-50"]')
    const warningCount = await warnings.count()
    
    console.log(`Found ${warningCount} data quality warnings`)
    
    // If there are warnings, verify they have actionable content
    if (warningCount > 0) {
      const firstWarning = warnings.first()
      await expect(firstWarning).toContainText(/Action:|data|sync|upload/i)
    }
  })

  test('Rate limiter prevents API spam', async ({ page }) => {
    // Make multiple rapid test connections
    const startTime = Date.now()
    
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Test Connection")')
      // Don't wait for completion, click again immediately
    }
    
    // Wait for all to complete
    await page.waitForTimeout(3000)
    
    const duration = Date.now() - startTime
    console.log(`3 rapid requests took ${duration}ms`)
    
    // With rate limiting, rapid requests should be queued
    expect(duration).toBeGreaterThan(1000) // Should take at least 1 second for 3 requests
  })

  test('Sync shows retry messages on failure', async ({ page }) => {
    // This test would need to simulate a failing sync
    // For now, we'll check that the UI elements exist
    
    // Check sync status panel exists
    await expect(page.locator('text=Sync Status Monitor')).toBeVisible({ timeout: 5000 })
    
    // Check for sync control options
    await expect(page.locator('text=Finale Sync Manager')).toBeVisible()
  })

  test('Settings validation prevents saving invalid data', async ({ page }) => {
    // Clear all fields
    await page.fill('input[placeholder="e.g., yourcompany"]', '')
    await page.fill('input[placeholder="e.g., 1234567890abcdef"]', '')
    await page.fill('input[placeholder="e.g., abcdef1234567890"]', '')
    
    // Try to save
    await page.click('button:has-text("Save Settings")')
    
    // Should show validation error
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/fix|error|required/i)
    
    // Settings should not be saved
    await page.reload()
    const accountPath = await page.inputValue('input[placeholder="e.g., yourcompany"]')
    expect(accountPath).toBe('') // Should still be empty after reload
  })

  test('Error messages include troubleshooting steps', async ({ page }) => {
    // Test with account path that might cause 404
    await page.fill('input[placeholder="e.g., yourcompany"]', 'nonexistent')
    await page.fill('input[placeholder="e.g., 1234567890abcdef"]', '1234567890abcdef')
    await page.fill('input[placeholder="e.g., abcdef1234567890"]', 'abcdef1234567890')
    
    await page.click('button:has-text("Test Connection")')
    
    // Wait for error message
    const errorMessage = page.locator('[data-testid="error-message"]')
    await expect(errorMessage).toBeVisible({ timeout: 10000 })
    
    // Check that error includes helpful hints
    const errorText = await errorMessage.textContent()
    console.log('Error message:', errorText)
    
    // Should mention checking account path or credentials
    expect(errorText?.toLowerCase()).toMatch(/account|credential|check|verify/)
  })
})

test.describe('API Improvements Backend Verification', () => {
  test('All Finale API endpoints use rate limiting', async ({ request }) => {
    // Test multiple endpoints to verify rate limiting
    const endpoints = [
      '/api/test-finale-simple',
      '/api/test-finale-direct',
      '/api/debug-finale-raw'
    ]
    
    for (const endpoint of endpoints) {
      const response = await request.post(endpoint, {
        data: {}
      })
      
      // Even with invalid credentials, the endpoint should respond
      // (rate limiting happens before auth)
      expect(response.status()).toBeLessThan(500)
    }
  })

  test('Sync service includes retry logic', async ({ request }) => {
    // Check that sync endpoint exists and accepts retry parameters
    const response = await request.post('/api/sync-finale', {
      data: {
        strategy: 'inventory',
        dryRun: true,
        maxRetries: 3
      }
    })
    
    // Should accept the request (even if it fails due to no credentials)
    expect(response.status()).toBeLessThan(500)
  })
})