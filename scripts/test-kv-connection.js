#!/usr/bin/env node

/**
 * Test Vercel KV Connection
 * Verifies KV database connectivity and performance
 */

const { kv } = require('@vercel/kv');

async function testKVConnection() {
  console.log('🔍 Testing Vercel KV Connection...\n');

  try {
    // Test basic connectivity
    console.log('1. Testing basic connectivity...');
    const start = Date.now();
    
    const testKey = `health-check-${Date.now()}`;
    const testData = {
      message: 'KV connection test',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };

    // Test write
    await kv.set(testKey, JSON.stringify(testData), { ex: 60 });
    console.log('   ✅ Write operation successful');

    // Test read
    const retrieved = await kv.get(testKey);
    const parsed = JSON.parse(retrieved);
    console.log('   ✅ Read operation successful');
    console.log(`   📊 Latency: ${Date.now() - start}ms`);

    // Test delete
    await kv.del(testKey);
    console.log('   ✅ Delete operation successful');

    // Test connection info
    console.log('\n2. Connection Information:');
    console.log(`   🔗 KV URL: ${process.env.KV_REST_API_URL ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   🔑 KV Token: ${process.env.KV_REST_API_TOKEN ? '✅ Configured' : '❌ Missing'}`);

    // Test performance with multiple operations
    console.log('\n3. Performance Testing...');
    const perfStart = Date.now();
    const promises = [];
    
    for (let i = 0; i < 10; i++) {
      promises.push(kv.set(`perf-test-${i}`, `test-data-${i}`, { ex: 60 }));
    }
    
    await Promise.all(promises);
    const perfTime = Date.now() - perfStart;
    console.log(`   📈 10 concurrent writes: ${perfTime}ms`);

    // Cleanup performance test keys
    const cleanupPromises = [];
    for (let i = 0; i < 10; i++) {
      cleanupPromises.push(kv.del(`perf-test-${i}`));
    }
    await Promise.all(cleanupPromises);

    console.log('\n✅ All KV tests passed!');
    console.log('\n🎉 Vercel KV is ready for production use.');

  } catch (error) {
    console.error('\n❌ KV Connection Test Failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
      console.error('\n🔧 Possible Solutions:');
      console.error('   • Check your internet connection');
      console.error('   • Verify KV_REST_API_URL is correct');
      console.error('   • Ensure you\'re not behind a firewall blocking the connection');
    } else if (error.message.includes('unauthorized') || error.message.includes('403')) {
      console.error('\n🔧 Possible Solutions:');
      console.error('   • Verify KV_REST_API_TOKEN is correct');
      console.error('   • Check token hasn\'t expired');
      console.error('   • Ensure token has proper permissions');
    } else {
      console.error('\n🔧 Debug Information:');
      console.error(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.error(`   KV URL Set: ${process.env.KV_REST_API_URL ? 'Yes' : 'No'}`);
      console.error(`   KV Token Set: ${process.env.KV_REST_API_TOKEN ? 'Yes' : 'No'}`);
    }
    
    process.exit(1);
  }
}

// Run the test
testKVConnection().catch(console.error);
