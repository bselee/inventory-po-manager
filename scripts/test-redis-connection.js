#!/usr/bin/env node

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
const { createClient } = require('redis')

// Redis URL from environment or default
const redisUrl = process.env.REDIS_URL || 'redis://default:hebQ4Koq72dxMZmJVS0iLam7hJslRUPI@redis-17074.c52.us-east-1-4.ec2.redns.redis-cloud.com:17074'

async function testRedisConnection() {
  let client = null
  
  try {
    // Create Redis client
    client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 10000,
        keepAlive: 30000
      }
    })
    
    client.on('error', (err) => console.error('[Redis] Client error:', err))
    client.on('connect', () => console.log('[Redis] Connected'))
    client.on('ready', () => console.log('[Redis] Ready'))
    
    await client.connect()
    // Test basic operations
    // SET
    await client.set('test:key', JSON.stringify({ message: 'Hello Redis!' }), { EX: 10 })
    // GET
    const value = await client.get('test:key')
    console.log('✅ GET operation successful:', JSON.parse(value))
    
    // EXISTS
    const exists = await client.exists('test:key')
    // DEL
    await client.del('test:key')
    // TTL test
    await client.setEx('test:ttl', 5, JSON.stringify({ temp: 'data' }))
    const ttl = await client.ttl('test:ttl')
    // Performance test
    const start = Date.now()
    const iterations = 100
    
    for (let i = 0; i < iterations; i++) {
      await client.set(`perf:test:${i}`, JSON.stringify({ index: i }))
    }
    
    const writeTime = Date.now() - start
    // Cleanup
    const keys = await client.keys('perf:test:*')
    if (keys.length > 0) {
      await client.del(keys)
    }
    // Get Redis info
    const urlParts = new URL(redisUrl)
  } catch (error) {
    console.error('\n❌ Redis connection test failed!')
    console.error('Error:', error.message)
    console.error('\nPlease check:')
    console.error('1. REDIS_URL environment variable is set correctly')
    console.error('2. Redis server is running and accessible')
    console.error('3. Network connectivity to Redis server')
    process.exit(1)
  } finally {
    if (client) {
      await client.disconnect()
    }
  }
}

// Run the test
testRedisConnection()