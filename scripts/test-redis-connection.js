#!/usr/bin/env node

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
const { createClient } = require('redis')

// Redis URL from environment or default
const redisUrl = process.env.REDIS_URL || 'redis://default:hebQ4Koq72dxMZmJVS0iLam7hJslRUPI@redis-17074.c52.us-east-1-4.ec2.redns.redis-cloud.com:17074'

async function testRedisConnection() {
  console.log('🔍 Testing Redis connection...\n')
  
  let client = null
  
  try {
    // Create Redis client
    console.log('1. Connecting to Redis...')
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
    console.log('✅ Connected successfully\n')
    
    // Test basic operations
    console.log('2. Testing basic operations...')
    
    // SET
    await client.set('test:key', JSON.stringify({ message: 'Hello Redis!' }), { EX: 10 })
    console.log('✅ SET operation successful')
    
    // GET
    const value = await client.get('test:key')
    console.log('✅ GET operation successful:', JSON.parse(value))
    
    // EXISTS
    const exists = await client.exists('test:key')
    console.log('✅ EXISTS operation successful:', exists === 1)
    
    // DEL
    await client.del('test:key')
    console.log('✅ DEL operation successful')
    
    // TTL test
    await client.setEx('test:ttl', 5, JSON.stringify({ temp: 'data' }))
    const ttl = await client.ttl('test:ttl')
    console.log(`✅ TTL operation successful: ${ttl} seconds\n`)
    
    // Performance test
    console.log('3. Performance test...')
    const start = Date.now()
    const iterations = 100
    
    for (let i = 0; i < iterations; i++) {
      await client.set(`perf:test:${i}`, JSON.stringify({ index: i }))
    }
    
    const writeTime = Date.now() - start
    console.log(`✅ Wrote ${iterations} keys in ${writeTime}ms (${(writeTime/iterations).toFixed(2)}ms per operation)`)
    
    // Cleanup
    const keys = await client.keys('perf:test:*')
    if (keys.length > 0) {
      await client.del(keys)
    }
    console.log('✅ Cleanup successful\n')
    
    console.log('🎉 All Redis tests passed!')
    
    // Get Redis info
    const urlParts = new URL(redisUrl)
    console.log('\n📊 Redis Connection Info:')
    console.log(`   Host: ${urlParts.hostname}`)
    console.log(`   Port: ${urlParts.port}`)
    console.log(`   Database: ${urlParts.pathname.slice(1) || '0'}`)
    
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
      console.log('\n👋 Disconnected from Redis')
    }
  }
}

// Run the test
testRedisConnection()