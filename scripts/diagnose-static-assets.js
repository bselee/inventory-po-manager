#!/usr/bin/env node

const http = require('http');
const https = require('https');

async function diagnoseStaticAssets() {
  console.log('🔍 Diagnosing Static Asset Issues...\n');
  
  // Helper to make HTTP requests
  function makeRequest(url) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      protocol.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ 
          status: res.statusCode, 
          headers: res.headers,
          data: data.substring(0, 1000) // First 1000 chars
        }));
      }).on('error', reject);
    });
  }
  
  try {
    // 1. Check if server is running
    console.log('1. Checking server status...');
    const serverCheck = await makeRequest('http://localhost:3000/api/health');
    console.log(`   Server status: ${serverCheck.status === 200 ? '✅ Running' : '❌ Not running'}`);
    
    // 2. Check settings page HTML
    console.log('\n2. Checking settings page HTML...');
    const pageRes = await makeRequest('http://localhost:3000/settings');
    console.log(`   Page status: ${pageRes.status}`);
    
    // Look for key indicators
    const html = pageRes.data;
    console.log(`   Has __next div: ${html.includes('id="__next"') ? '✅ Yes' : '❌ No'}`);
    console.log(`   Has React root: ${html.includes('_app') || html.includes('main-app') ? '✅ Yes' : '❌ No'}`);
    console.log(`   Has loading spinner: ${html.includes('animate-spin') ? '✅ Yes' : '❌ No'}`);
    
    // 3. Check for static asset references in HTML
    console.log('\n3. Checking static asset references...');
    const cssMatches = html.match(/\/_next\/static\/css\/[^"]+/g) || [];
    const jsMatches = html.match(/\/_next\/static\/chunks\/[^"]+/g) || [];
    
    console.log(`   CSS files referenced: ${cssMatches.length}`);
    console.log(`   JS chunks referenced: ${jsMatches.length}`);
    
    // 4. Test actual static asset URLs
    if (cssMatches.length > 0) {
      console.log('\n4. Testing CSS asset access...');
      const cssUrl = `http://localhost:3000${cssMatches[0]}`;
      const cssRes = await makeRequest(cssUrl);
      console.log(`   ${cssMatches[0]}`);
      console.log(`   Status: ${cssRes.status} ${cssRes.status === 404 ? '❌ NOT FOUND' : '✅ OK'}`);
    }
    
    if (jsMatches.length > 0) {
      console.log('\n5. Testing JS asset access...');
      const jsUrl = `http://localhost:3000${jsMatches[0]}`;
      const jsRes = await makeRequest(jsUrl);
      console.log(`   ${jsMatches[0]}`);
      console.log(`   Status: ${jsRes.status} ${jsRes.status === 404 ? '❌ NOT FOUND' : '✅ OK'}`);
    }
    
    // 6. Check if it's a development vs production issue
    console.log('\n6. Environment diagnosis...');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`   Port: 3000 (dev mode default)`);
    
    // 7. Provide diagnosis
    console.log('\n📋 DIAGNOSIS:');
    if (cssMatches.length > 0 || jsMatches.length > 0) {
      const testUrl = cssMatches[0] || jsMatches[0];
      const testRes = await makeRequest(`http://localhost:3000${testUrl}`);
      
      if (testRes.status === 404) {
        console.log('   ❌ Static assets are referenced but returning 404');
        console.log('   This indicates the dev server is not serving static files properly.');
        console.log('\n   LIKELY CAUSES:');
        console.log('   1. Dev server needs restart after code changes');
        console.log('   2. Build cache is corrupted');
        console.log('   3. Next.js configuration issue');
        
        console.log('\n   RECOMMENDED FIXES:');
        console.log('   1. Stop the dev server (Ctrl+C)');
        console.log('   2. Clear Next.js cache: rm -rf .next');
        console.log('   3. Restart dev server: npm run dev');
      } else {
        console.log('   ✅ Static assets are being served correctly');
      }
    } else {
      console.log('   ⚠️  No static asset references found in HTML');
      console.log('   The page might be in an error state');
    }
    
  } catch (error) {
    console.error('\n❌ Error during diagnosis:', error.message);
  }
}

// Run diagnosis
diagnoseStaticAssets();