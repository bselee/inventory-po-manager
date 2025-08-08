#!/usr/bin/env node

// Script to trigger cache rebuild on production
const https = require('https')
const { URL } = require('url')

// Configuration - replace with your production URL
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://your-app.vercel.app'
const API_ENDPOINT = '/api/sync/rebuild-cache'

// Authentication options
const AUTH_OPTIONS = {
  // Option 1: Use environment variable API key
  API_KEY: process.env.CACHE_REBUILD_API_KEY,
  
  // Option 2: Use JWT secret  
  JWT_SECRET: process.env.JWT_SECRET,
  
  // Option 3: Use Finale credentials
  FINALE_API_KEY: process.env.FINALE_API_KEY,
  FINALE_API_SECRET: process.env.FINALE_API_SECRET
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Production-Cache-Rebuild/1.0',
        ...options.headers
      }
    }
    
    const req = https.request(requestOptions, (res) => {
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
    
    // Set a longer timeout for production (5 minutes)
    req.setTimeout(300000, () => {
      req.destroy()
      reject(new Error('Request timeout (5 minutes)'))
    })
    
    if (options.body) {
      req.write(JSON.stringify(options.body))
    }
    
    req.end()
  })
}

async function triggerCacheRebuild() {
  console.log('🚀 Production Cache Rebuild Script')
  console.log('=' .repeat(50))
  console.log(`Production URL: ${PRODUCTION_URL}`)
  console.log(`Endpoint: ${API_ENDPOINT}`)
  console.log()
  
  if (!PRODUCTION_URL.startsWith('https://')) {
    console.log('❌ Please set PRODUCTION_URL environment variable to your Vercel app URL')
    console.log('   Example: export PRODUCTION_URL=https://your-app.vercel.app')
    return
  }
  
  // Prepare authentication headers
  let authHeaders = {}
  
  if (AUTH_OPTIONS.API_KEY) {
    authHeaders['x-api-key'] = AUTH_OPTIONS.API_KEY
    console.log('🔐 Using API key authentication')
  } else if (AUTH_OPTIONS.JWT_SECRET) {
    authHeaders['x-access-token'] = AUTH_OPTIONS.JWT_SECRET
    console.log('🔐 Using JWT token authentication')
  } else if (AUTH_OPTIONS.FINALE_API_KEY && AUTH_OPTIONS.FINALE_API_SECRET) {
    authHeaders['authorization'] = `Basic ${Buffer.from(`${AUTH_OPTIONS.FINALE_API_KEY}:${AUTH_OPTIONS.FINALE_API_SECRET}`).toString('base64')}`
    console.log('🔐 Using Basic auth with Finale credentials')
  } else {
    console.log('❌ No authentication credentials found!')
    console.log('Please set one of:')
    console.log('  - CACHE_REBUILD_API_KEY')
    console.log('  - JWT_SECRET')  
    console.log('  - FINALE_API_KEY + FINALE_API_SECRET')
    return
  }
  
  console.log()
  console.log('📡 Triggering cache rebuild on production...')
  console.log('This may take several minutes...')
  
  const startTime = Date.now()
  
  try {
    const response = await makeRequest(`${PRODUCTION_URL}${API_ENDPOINT}`, {
      method: 'POST',
      headers: authHeaders
    })
    
    const duration = Math.round((Date.now() - startTime) / 1000)
    
    console.log()
    console.log('📊 Response:')
    console.log(`Status: ${response.statusCode}`)
    console.log(`Duration: ${duration} seconds`)
    console.log('Data:', JSON.stringify(response.data, null, 2))
    
    if (response.statusCode === 200 && response.data.success) {
      console.log()
      console.log('✅ Cache rebuild completed successfully!')
      console.log(`✅ Inventory items: ${response.data.data?.inventory_items || 0}`)
      console.log(`✅ Vendor items: ${response.data.data?.vendor_items || 0}`)
    } else {
      console.log()
      console.log('❌ Cache rebuild failed!')
      if (response.statusCode === 401) {
        console.log('   Check your authentication credentials')
      } else if (response.statusCode >= 500) {
        console.log('   Server error - check application logs')
      }
    }
    
  } catch (error) {
    const duration = Math.round((Date.now() - startTime) / 1000)
    console.log()
    console.log(`❌ Error after ${duration} seconds:`, error.message)
    
    if (error.message.includes('timeout')) {
      console.log('   The request timed out. The cache rebuild might still be running.')
      console.log('   Check your application logs and try the status endpoint:')
      console.log(`   GET ${PRODUCTION_URL}${API_ENDPOINT}`)
    }
  }
}

// CLI usage info
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Production Cache Rebuild Script')
  console.log('==============================')
  console.log()
  console.log('Usage:')
  console.log('  node trigger-production-cache-rebuild.js')
  console.log()
  console.log('Environment variables:')
  console.log('  PRODUCTION_URL           - Your Vercel app URL (required)')
  console.log('  CACHE_REBUILD_API_KEY    - API key for authentication')
  console.log('  JWT_SECRET              - JWT secret for authentication')
  console.log('  FINALE_API_KEY          - Finale API key for Basic auth')
  console.log('  FINALE_API_SECRET       - Finale API secret for Basic auth')
  console.log()
  console.log('Examples:')
  console.log('  export PRODUCTION_URL=https://your-app.vercel.app')
  console.log('  export FINALE_API_KEY=your_key')
  console.log('  export FINALE_API_SECRET=your_secret')
  console.log('  node trigger-production-cache-rebuild.js')
  return
}

// Run the script
if (require.main === module) {
  triggerCacheRebuild().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

module.exports = { triggerCacheRebuild }