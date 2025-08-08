#!/usr/bin/env node

// Test script for the cache rebuild endpoint
const http = require('http')
const https = require('https')
const { URL } = require('url')

// Configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'
const API_ENDPOINT = '/api/sync/rebuild-cache'

// Authentication options (will try in order)
const AUTH_OPTIONS = [
  // Option 1: API Key (if CACHE_REBUILD_API_KEY is set)
  process.env.CACHE_REBUILD_API_KEY ? { 'x-api-key': process.env.CACHE_REBUILD_API_KEY } : null,
  
  // Option 2: JWT Secret (if JWT_SECRET is set)
  process.env.JWT_SECRET ? { 'x-access-token': process.env.JWT_SECRET } : null,
  
  // Option 3: Basic Auth with Finale credentials (if available)
  (process.env.FINALE_API_KEY && process.env.FINALE_API_SECRET) ? {
    'authorization': `Basic ${Buffer.from(`${process.env.FINALE_API_KEY}:${process.env.FINALE_API_SECRET}`).toString('base64')}`
  } : null
].filter(Boolean)

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const client = urlObj.protocol === 'https:' ? https : http
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Cache-Rebuild-Test/1.0',
        ...options.headers
      }
    }
    
    const req = client.request(requestOptions, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData
          })
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          })
        }
      })
    })
    
    req.on('error', (err) => {
      reject(err)
    })
    
    if (options.body) {
      req.write(JSON.stringify(options.body))
    }
    
    req.end()
  })
}

async function testEndpoint() {
  console.log('🔧 Testing Cache Rebuild Endpoint')
  console.log('=' .repeat(50))
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Endpoint: ${API_ENDPOINT}`)
  console.log()
  
  // Check if required environment variables are set
  console.log('📋 Environment Check:')
  console.log(`FINALE_INVENTORY_REPORT_URL: ${process.env.FINALE_INVENTORY_REPORT_URL ? '✓ Set' : '✗ Missing'}`)
  console.log(`FINALE_VENDORS_REPORT_URL: ${process.env.FINALE_VENDORS_REPORT_URL ? '✓ Set' : '✗ Missing'}`)
  console.log(`FINALE_API_KEY: ${process.env.FINALE_API_KEY ? '✓ Set' : '✗ Missing'}`)
  console.log(`FINALE_API_SECRET: ${process.env.FINALE_API_SECRET ? '✓ Set' : '✗ Missing'}`)
  console.log(`REDIS_URL: ${process.env.REDIS_URL ? '✓ Set' : '✗ Missing'}`)
  console.log()
  
  if (AUTH_OPTIONS.length === 0) {
    console.log('❌ No authentication options available!')
    console.log('Please set one of:')
    console.log('  - CACHE_REBUILD_API_KEY')
    console.log('  - JWT_SECRET')
    console.log('  - FINALE_API_KEY + FINALE_API_SECRET')
    return
  }
  
  console.log(`🔐 Found ${AUTH_OPTIONS.length} authentication option(s)`)
  console.log()
  
  // Test 1: GET request to check status
  console.log('🔍 Test 1: GET /api/sync/rebuild-cache (Check Status)')
  try {
    const statusResponse = await makeRequest(`${BASE_URL}${API_ENDPOINT}`)
    console.log(`Status: ${statusResponse.statusCode}`)
    console.log('Response:', JSON.stringify(statusResponse.data, null, 2))
  } catch (error) {
    console.log('Error:', error.message)
  }
  console.log()
  
  // Test 2: POST request without auth (should fail)
  console.log('🚫 Test 2: POST /api/sync/rebuild-cache (No Auth - Should Fail)')
  try {
    const noAuthResponse = await makeRequest(`${BASE_URL}${API_ENDPOINT}`, {
      method: 'POST'
    })
    console.log(`Status: ${noAuthResponse.statusCode}`)
    console.log('Response:', JSON.stringify(noAuthResponse.data, null, 2))
  } catch (error) {
    console.log('Error:', error.message)
  }
  console.log()
  
  // Test 3: POST request with authentication
  console.log('✅ Test 3: POST /api/sync/rebuild-cache (With Auth)')
  
  for (let i = 0; i < AUTH_OPTIONS.length; i++) {
    const authHeaders = AUTH_OPTIONS[i]
    const authType = Object.keys(authHeaders)[0]
    
    console.log(`\n  Trying auth method ${i + 1}: ${authType}`)
    
    try {
      const startTime = Date.now()
      const authResponse = await makeRequest(`${BASE_URL}${API_ENDPOINT}`, {
        method: 'POST',
        headers: authHeaders
      })
      const duration = Date.now() - startTime
      
      console.log(`  Status: ${authResponse.statusCode}`)
      console.log(`  Duration: ${duration}ms`)
      console.log('  Response:', JSON.stringify(authResponse.data, null, 2))
      
      if (authResponse.statusCode === 200 && authResponse.data.success) {
        console.log('  ✅ SUCCESS!')
        break
      } else if (authResponse.statusCode === 401) {
        console.log('  🔒 Unauthorized - trying next auth method...')
        continue
      } else {
        console.log('  ❌ Failed with error')
      }
    } catch (error) {
      console.log('  Error:', error.message)
    }
  }
  
  console.log()
  console.log('🏁 Test completed!')
}

// Run the test
if (require.main === module) {
  testEndpoint().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

module.exports = { testEndpoint }