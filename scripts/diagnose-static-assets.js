#!/usr/bin/env node

const http = require('http');
const https = require('https');

async function diagnoseStaticAssets() {
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
    const serverCheck = await makeRequest('http://localhost:3000/api/health');
    // 2. Check settings page HTML
    const pageRes = await makeRequest('http://localhost:3000/settings');
    // Look for key indicators
    const html = pageRes.data;
    // 3. Check for static asset references in HTML
    const cssMatches = html.match(/\/_next\/static\/css\/[^"]+/g) || [];
    const jsMatches = html.match(/\/_next\/static\/chunks\/[^"]+/g) || [];
    // 4. Test actual static asset URLs
    if (cssMatches.length > 0) {
      const cssUrl = `http://localhost:3000${cssMatches[0]}`;
      const cssRes = await makeRequest(cssUrl);
    }
    
    if (jsMatches.length > 0) {
      const jsUrl = `http://localhost:3000${jsMatches[0]}`;
      const jsRes = await makeRequest(jsUrl);
    }
    
    // 6. Check if it's a development vs production issue
    // 7. Provide diagnosis
    if (cssMatches.length > 0 || jsMatches.length > 0) {
      const testUrl = cssMatches[0] || jsMatches[0];
      const testRes = await makeRequest(`http://localhost:3000${testUrl}`);
      
      if (testRes.status === 404) {
        console.log('   1. Stop the dev server (Ctrl+C)');
      } else {
      }
    } else {
    }
    
  } catch (error) {
    console.error('\n❌ Error during diagnosis:', error.message);
  }
}

// Run diagnosis
diagnoseStaticAssets();