#!/usr/bin/env node

// Test script for Redis cache functionality
const http = require('http')

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 3000,
      path: urlObj.pathname,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }
    
    const req = http.request(requestOptions, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          resolve({
            statusCode: res.statusCode,
            data: jsonData
          })
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: data
          })
        }
      })
    })
    
    req.on('error', (err) => {
      reject(err)
    })
    
    req.setTimeout(10000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
    
    req.end()
  })
}

async function testRedis() {
  console.log('🔧 Testing Redis Cache Functionality')
  console.log('=' .repeat(40))
  
  try {
    // Test 1: Check health endpoint
    console.log('1. Testing health endpoint...')
    const health = await makeRequest('http://localhost:3000/api/health')
    console.log(`   Status: ${health.statusCode}`)
    console.log(`   Response:`, health.data)
    
    // Test 2: Check cache status
    console.log('\n2. Checking cache rebuild status...')
    const status = await makeRequest('http://localhost:3000/api/sync/rebuild-cache')
    console.log(`   Status: ${status.statusCode}`)
    console.log(`   Response:`, status.data)
    
    console.log('\n✅ Redis cache tests completed')
    
  } catch (error) {
    console.error('❌ Error testing Redis:', error.message)
  }
}

if (require.main === module) {
  testRedis()
}