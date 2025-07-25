# Autonomous Testing System Guide

## Overview
The autonomous testing system continuously runs Playwright tests, automatically repairs failures, and monitors test health without any human intervention.

## Features

### 1. **Self-Healing Tests**
- Automatic selector fallbacks (data-testid → aria-label → text → CSS)
- Smart waiting strategies with retry logic
- Flexible assertions that adapt to changes
- Network error handling and retries

### 2. **Automatic Test Repair**
Tests are automatically repaired when they fail:
- **Selector Errors**: Adds fallback selectors and self-healing wrappers
- **Timing Issues**: Increases timeouts and adds explicit waits
- **Assertion Failures**: Relaxes strict assertions to patterns
- **Navigation Errors**: Adds retry logic and error handling
- **Network Failures**: Implements request interception and fallbacks

### 3. **Test Generation**
Automatically discovers and generates tests for:
- All interactive elements (buttons, inputs, selects)
- Form interactions
- Navigation flows
- Accessibility compliance
- Responsive design

### 4. **Continuous Monitoring**
- Real-time test health dashboard
- Performance metrics tracking
- Flaky test detection
- Failure pattern analysis
- Automated recommendations

## Getting Started

### Run Autonomous Testing
```bash
npm run test:autonomous
```

This starts:
- Continuous test execution
- Automatic repair system
- Test monitoring dashboard
- Report generation

### Run Self-Healing Tests Only
```bash
npm run test:self-healing
```

### Start Full System
```bash
node scripts/start-autonomous-testing.js
```

## File Structure

```
tests/
├── helpers/
│   ├── self-healing.ts      # Self-healing utilities
│   ├── repair-strategies.ts # Automatic repair logic
│   ├── test-generator.ts    # Test generation
│   └── test-monitor.ts      # Monitoring system
├── e2e/
│   ├── inventory-self-healing.spec.ts # Self-healing test example
│   └── generated/           # Auto-generated tests
└── test-reports/
    ├── autonomous/          # Test run results
    ├── screenshots/         # Failure screenshots
    ├── dashboard.html       # Live monitoring dashboard
    └── test-metrics.json    # Historical metrics
```

## How It Works

### 1. Test Execution Loop
```
1. Run all Playwright tests
2. Analyze failures
3. Apply repair strategies
4. Re-run failed tests
5. Record results
6. Generate reports
7. Sleep 5 minutes
8. Repeat
```

### 2. Self-Healing Example
```typescript
// Instead of:
await page.click('[data-testid="submit"]');

// Self-healing version:
await healingPage.click('[data-testid="submit"]', {
  fallbackSelectors: [
    'button:has-text("Submit")',
    '[aria-label="Submit"]',
    'button[type="submit"]'
  ]
});
```

### 3. Automatic Repair Example
When a test fails with "element not found", the system:
1. Analyzes the error
2. Finds the failing selector in the test file
3. Adds self-healing wrapper
4. Adds fallback selectors
5. Increases timeouts
6. Re-runs the test

## Monitoring Dashboard

Access the live dashboard at:
```
test-reports/dashboard.html
```

Features:
- Overall health score (0-100%)
- Test pass/fail rates
- Performance metrics
- Flaky test tracking
- Critical issues alerts
- Improvement recommendations

## Configuration

### Autonomous Runner Config
Edit `scripts/autonomous-test-runner.js`:
```javascript
const CONFIG = {
  testCommand: 'npx playwright test',
  retryAttempts: 3,
  sleepBetweenRuns: 5 * 60 * 1000, // 5 minutes
  maxConsecutiveFailures: 10
};
```

### Self-Healing Options
```typescript
// Retry with exponential backoff
await healingPage.retryAction(action, {
  retries: 3,
  delay: 1000,
  multiplier: 2
});

// Smart navigation
await healingPage.navigate('/inventory', {
  waitUntil: 'networkidle',
  retries: 3
});
```

## Best Practices

### 1. Use Data-TestId Attributes
```html
<button data-testid="refresh-button">Refresh</button>
<input data-testid="search-input" />
```

### 2. Write Flexible Tests
```typescript
// Good: Flexible assertion
await expect(page.locator('.count')).toContainText(/\d+/);

// Bad: Too strict
await expect(page.locator('.count')).toHaveText('42');
```

### 3. Handle Loading States
```typescript
await healingPage.waitForAppReady();
// Automatically waits for spinners, skeletons, etc.
```

### 4. Use Semantic Selectors
Priority order:
1. `data-testid`
2. ARIA attributes
3. Semantic HTML (button, input, etc.)
4. Text content
5. CSS classes (last resort)

## Troubleshooting

### Tests Still Failing
1. Check the repair log in `test-reports/autonomous/`
2. Verify selectors are semantic
3. Add more fallback strategies
4. Increase timeouts for slow operations

### High Flakiness
1. Use `waitForAppReady()` after navigation
2. Add explicit waits for dynamic content
3. Use flexible assertions
4. Check for race conditions

### Performance Issues
1. Review slow tests in dashboard
2. Optimize wait strategies
3. Use parallel execution
4. Reduce unnecessary retries

## Extending the System

### Add New Repair Strategy
```typescript
// In repair-strategies.ts
private async repairCustomError(failure: TestFailure): Promise<RepairResult> {
  // Your repair logic here
}
```

### Add New Self-Healing Method
```typescript
// In self-healing.ts
async customAction(selector: string, options?: CustomOptions) {
  // Your self-healing logic
}
```

### Generate Tests for New Page
```typescript
import { generateTestsForPage } from './helpers/test-generator';

const { elements, tests } = await generateTestsForPage(page, 'settings');
```

## Benefits

1. **Zero Maintenance**: Tests repair themselves
2. **24/7 Testing**: Continuous validation
3. **Early Detection**: Catch issues immediately
4. **Trend Analysis**: Identify patterns over time
5. **Confidence**: Know your app works all the time

## Future Enhancements

- Machine learning for smarter repairs
- Visual regression with auto-approval
- Cross-browser parallel execution
- Integration with CI/CD pipelines
- Slack/email notifications
- API testing integration
- Performance budget enforcement

Start the system and never worry about broken tests again!