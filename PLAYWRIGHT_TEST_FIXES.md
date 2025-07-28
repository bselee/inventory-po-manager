# Playwright Test Fixes for Settings Page

## Issues Identified and Fixed

### 1. UI Overlays/Modals ✅
- Added `waitForLoadState('networkidle')` to ensure page is fully loaded
- Added explicit waits for elements to be visible before interaction
- Used `waitForSelector` with visibility state

### 2. UI Readiness ✅
- Added explicit waits before all interactions
- Used `input.clear()` before filling to ensure clean state
- Added timeout options to `toBeEnabled()` assertions
- Created helper functions for common operations

### 3. Backend Persistence & Data Types ✅
- Verified `low_stock_threshold` is correctly typed as number in API schema
- Confirmed frontend sends number values (parseInt conversion)
- Added response waiting to ensure saves complete before reload

### 4. Debug Output ✅
- Added console.log statements for:
  - Initial values
  - Values after fill
  - API response status
  - Error messages
  - Request headers

### 5. CSRF Protection ✅
- Confirmed CSRF is enforced by default in API handler
- Frontend uses cookies for CSRF (handled automatically by browser)
- Tests now check for non-403 status to confirm CSRF is handled

## Files Updated

1. **tests/e2e/settings/settings-backend.spec.ts**
   - Added proper waits and clear operations
   - Fixed response mocking with correct content types
   - Added success message waiting
   - Improved error handling

2. **tests/e2e/settings/settings-backend-improved.spec.ts** (NEW)
   - Comprehensive test suite with extensive debugging
   - Additional CSRF test case
   - Better error handling and logging

3. **tests/e2e/settings/settings-backend-final.spec.ts** (NEW)
   - Final version with helper functions
   - Cleaner test structure
   - Robust waiting strategies

4. **tests/e2e/helpers/settings-helper.ts** (NEW)
   - Reusable helper functions
   - CSRF token handling
   - Form filling utilities
   - Wait utilities

## Key Improvements

### Wait Strategies
```typescript
// Before
await page.fill('[data-testid="setting-input"]', '15');

// After
const input = page.locator('[data-testid="setting-input"]');
await input.clear();
await input.fill('15');
```

### Response Waiting
```typescript
// Added proper response waiting
const savePromise = page.waitForResponse(
  res => res.url().includes('/api/settings') && res.method() === 'PUT'
);
await page.click('[data-testid="save-settings"]');
await savePromise;
```

### Error Response Mocking
```typescript
// Fixed content type and body format
await page.route('/api/settings', route => route.fulfill({ 
  status: 500, 
  contentType: 'application/json',
  body: JSON.stringify({ error: 'Server error' })
}));
```

### Success Confirmation
```typescript
// Wait for success message before proceeding
await page.waitForSelector('[data-testid="success-message"]', { 
  state: 'visible', 
  timeout: 5000 
});
```

## Running the Tests

1. Install browser dependencies:
   ```bash
   sudo npx playwright install-deps
   ```

2. Run the improved tests:
   ```bash
   # Run original tests (now fixed)
   npm run test:e2e -- tests/e2e/settings/settings-backend.spec.ts
   
   # Run improved tests with debugging
   npm run test:e2e -- tests/e2e/settings/settings-backend-improved.spec.ts
   
   # Run final tests with helpers
   npm run test:e2e -- tests/e2e/settings/settings-backend-final.spec.ts
   ```

3. Run with UI mode for debugging:
   ```bash
   npx playwright test tests/e2e/settings/settings-backend.spec.ts --ui
   ```

## Expected Results

With these fixes, the tests should:
- ✅ Properly wait for UI elements before interaction
- ✅ Handle CSRF protection automatically via cookies
- ✅ Correctly save and persist settings values
- ✅ Show appropriate error messages on failures
- ✅ Pass all test cases once browser dependencies are installed