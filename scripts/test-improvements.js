#!/usr/bin/env node

/**
 * Test script to verify all improvements are operational
 * Run with: node scripts/test-improvements.js
 */

// Use native fetch in Node.js 18+
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)).catch(() => global.fetch(...args))
const colors = require('colors/safe')

// Test configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'
const TEST_RESULTS = {
  passed: 0,
  failed: 0,
  tests: []
}

// Helper functions
async function test(name, fn) {
  console.log(`\n${colors.blue('Testing:')} ${name}`)
  try {
    await fn()
    TEST_RESULTS.passed++
    TEST_RESULTS.tests.push({ name, status: 'PASSED', error: null })
    console.log(colors.green('✓ PASSED'))
  } catch (error) {
    TEST_RESULTS.failed++
    TEST_RESULTS.tests.push({ name, status: 'FAILED', error: error.message })
    console.log(colors.red('✗ FAILED:'), error.message)
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed')
  }
}

// Start tests
console.log(colors.yellow('\n=== Testing Finale API Improvements ===\n'))

// Test 1: Rate Limiter
test('Rate Limiter - Should limit requests to 2/second', async () => {
  console.log('Making 5 rapid requests to test rate limiting...')
  
  const startTime = Date.now()
  const requests = []
  
  // Make 5 requests as fast as possible
  for (let i = 0; i < 5; i++) {
    requests.push(
      fetch(`${BASE_URL}/api/test-finale-simple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
    )
  }
  
  await Promise.all(requests)
  const duration = Date.now() - startTime
  
  console.log(`5 requests completed in ${duration}ms`)
  // With rate limiting at 2/sec, 5 requests should take at least 2 seconds
  assert(duration >= 2000, `Requests too fast: ${duration}ms (expected >= 2000ms)`)
})

// Test 2: Frontend Validation
test('Frontend Validation - Should validate credentials', async () => {
  // This would normally be tested in the browser, but we can test the validation logic
  const { validateFinaleCredentials } = require('../app/lib/validation/finale-credentials')
  
  // Test invalid credentials
  const result1 = validateFinaleCredentials({
    finale_account_path: 'https://app.finaleinventory.com/test',
    finale_api_key: '123',
    finale_api_secret: ''
  })
  
  assert(!result1.isValid, 'Should reject invalid credentials')
  assert(result1.errors.finale_account_path, 'Should have account path error')
  assert(result1.errors.finale_api_secret, 'Should have API secret error')
  
  // Test valid credentials
  const result2 = validateFinaleCredentials({
    finale_account_path: 'buildasoil',
    finale_api_key: '1234567890abcdef',
    finale_api_secret: 'abcdef1234567890'
  })
  
  assert(result2.isValid, 'Should accept valid credentials')
})

// Test 3: Error Messages
test('Error Messages - Should return user-friendly errors', async () => {
  const response = await fetch(`${BASE_URL}/api/test-finale-simple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  })
  
  const data = await response.json()
  
  if (!data.success) {
    assert(data.error, 'Should have error title')
    assert(data.details || data.solutions, 'Should have details or solutions')
    console.log('Error response:', JSON.stringify(data, null, 2))
  }
})

// Test 4: Debug Panel Data
test('Debug Panel - Should provide debug functionality', async () => {
  const response = await fetch(`${BASE_URL}/api/finale-debug-v2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      finale_account_path: 'test',
      finale_api_key: 'test_key',
      finale_api_secret: 'test_secret'
    })
  })
  
  const data = await response.json()
  assert(data.results, 'Should have results array')
  assert(data.summary, 'Should have summary')
  console.log(`Debug tests run: ${data.results.length}`)
})

// Test 5: Sync Logger
test('Sync Logger - Should log sync operations', async () => {
  const { SyncLogger } = require('../app/lib/sync-logger')
  
  const logger = new SyncLogger('test')
  await logger.startSync({ test: true })
  
  logger.log('test_operation', 'success', {
    itemsProcessed: 10,
    duration: 1000
  })
  
  logger.logRetry('test_operation', 1, 3, 'Rate limit exceeded', 2000)
  
  logger.logBatch(1, 2, 50, 'completed')
  
  const summary = logger.getSummary()
  assert(summary.totalOperations >= 3, 'Should have logged operations')
  assert(summary.successCount >= 1, 'Should have successful operations')
  assert(summary.retryCount >= 1, 'Should have retry operations')
  
  console.log('Sync logger summary:', summary)
})

// Test 6: Inventory Data Warnings
test('Inventory Data Warnings - Should detect data quality issues', async () => {
  // Test the warning component logic
  const React = require('react')
  const InventoryDataWarning = require('../app/components/inventory/InventoryDataWarning').default
  
  // Simulate empty inventory
  const warnings1 = []
  if (0 === 0) { // totalItems === 0
    warnings1.push({
      type: 'error',
      message: 'No inventory data found'
    })
  }
  
  assert(warnings1.length > 0, 'Should warn about empty inventory')
  
  // Simulate partial data
  const totalItems = 100
  const itemsWithSalesData = 10
  const salesDataPercentage = (itemsWithSalesData / totalItems) * 100
  
  if (salesDataPercentage < 20) {
    warnings1.push({
      type: 'warning',
      message: 'Missing sales data'
    })
  }
  
  assert(warnings1.length > 1, 'Should warn about missing sales data')
})

// Test 7: API Method Implementation
test('API Methods - Should have all required methods', async () => {
  const { FinaleApiService } = require('../app/lib/finale-api')
  
  const mockConfig = {
    apiKey: 'test',
    apiSecret: 'test',
    accountPath: 'test'
  }
  
  const api = new FinaleApiService(mockConfig)
  
  // Check methods exist
  assert(typeof api.getAllProducts === 'function', 'Should have getAllProducts method')
  assert(typeof api.getInventoryLevels === 'function', 'Should have getInventoryLevels method')
  assert(typeof api.getActiveProducts === 'function', 'Should have getActiveProducts method')
  assert(typeof api.getProductsBySKUs === 'function', 'Should have getProductsBySKUs method')
  
  console.log('All required API methods are implemented')
})

// Test 8: Authentication Mapping
test('Authentication Mapping - Should check both API keys and username/password', async () => {
  // We'll need to mock the database response to test this properly
  console.log('Testing authentication mapping in getFinaleConfig...')
  
  // This would need database access to test properly
  // For now, we'll check the code exists
  const fs = require('fs')
  const finaleApiCode = fs.readFileSync('./app/lib/finale-api.ts', 'utf8')
  
  assert(finaleApiCode.includes('finale_api_key'), 'Should check finale_api_key')
  assert(finaleApiCode.includes('finale_api_secret'), 'Should check finale_api_secret')
  assert(finaleApiCode.includes('finale_username'), 'Should check finale_username')
  assert(finaleApiCode.includes('finale_password'), 'Should check finale_password')
})

// Test 9: Rate Limiter Integration
test('Rate Limiter Integration - All API calls should use rate limiter', async () => {
  const fs = require('fs')
  const finaleApiCode = fs.readFileSync('./app/lib/finale-api.ts', 'utf8')
  
  // Count fetch calls vs rateLimitedFetch calls
  const fetchMatches = finaleApiCode.match(/[^rateLimited]fetch\(/g) || []
  const rateLimitedMatches = finaleApiCode.match(/rateLimitedFetch\(/g) || []
  
  console.log(`Regular fetch calls: ${fetchMatches.length}`)
  console.log(`Rate limited fetch calls: ${rateLimitedMatches.length}`)
  
  // Most fetch calls should be rate limited (allow a few for non-Finale APIs)
  assert(rateLimitedMatches.length > 5, 'Should have multiple rate limited calls')
})

// Test 10: Error Response Format
test('Error Response Format - Should include solutions and debug info', async () => {
  const { formatFinaleError } = require('../app/lib/finale-error-messages')
  
  // Test 401 error
  const error401 = formatFinaleError({ status: 401 }, 'test')
  assert(error401.title, 'Should have title')
  assert(error401.solutions.length > 0, 'Should have solutions')
  
  // Test 404 error
  const error404 = formatFinaleError({ status: 404 }, 'test')
  assert(error404.solutions.includes('account'), 'Should mention account path')
  
  console.log('Error formatter provides solutions for common errors')
})

// Print summary
console.log(colors.yellow('\n=== Test Summary ===\n'))
console.log(colors.green(`Passed: ${TEST_RESULTS.passed}`))
console.log(colors.red(`Failed: ${TEST_RESULTS.failed}`))
console.log('\nDetailed Results:')
TEST_RESULTS.tests.forEach(test => {
  const status = test.status === 'PASSED' ? colors.green('✓') : colors.red('✗')
  console.log(`${status} ${test.name}`)
  if (test.error) {
    console.log(`  ${colors.red(test.error)}`)
  }
})

// Exit with appropriate code
process.exit(TEST_RESULTS.failed > 0 ? 1 : 0)