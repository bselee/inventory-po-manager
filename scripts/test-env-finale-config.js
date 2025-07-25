const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('🔍 TESTING ENVIRONMENT VARIABLES');
console.log('=================================');

const finaleApiKey = process.env.FINALE_API_KEY;
const finaleApiSecret = process.env.FINALE_API_SECRET;
const finaleAccountPath = process.env.FINALE_ACCOUNT_PATH;

console.log('Environment variables found:');
console.log('- FINALE_API_KEY:', finaleApiKey ? '✅ Set' : '❌ Not found');
console.log('- FINALE_API_SECRET:', finaleApiSecret ? '✅ Set' : '❌ Not found');
console.log('- FINALE_ACCOUNT_PATH:', finaleAccountPath ? '✅ Set' : '❌ Not found');

if (finaleApiKey && finaleApiSecret && finaleAccountPath) {
  console.log('\n🎉 All Finale credentials found in environment!');
  console.log('- API Key:', finaleApiKey);
  console.log('- API Secret:', finaleApiSecret);
  console.log('- Account Path:', finaleAccountPath);
  
  // Clean the account path like the function does
  const cleanPath = finaleAccountPath.replace('https://app.finaleinventory.com/', '').replace('/1', '');
  console.log('- Cleaned Account Path:', cleanPath);
} else {
  console.log('\n❌ Missing environment variables');
}

// Test direct API call
async function testFinaleAPI() {
  if (!finaleApiKey || !finaleApiSecret || !finaleAccountPath) {
    console.log('\n❌ Cannot test API - missing credentials');
    return;
  }

  console.log('\n🧪 TESTING DIRECT FINALE API CALL');
  console.log('==================================');

  const fetch = require('node-fetch');
  const cleanPath = finaleAccountPath.replace('https://app.finaleinventory.com/', '').replace('/1', '');
  const baseUrl = `https://app.finaleinventory.com/${cleanPath}/api`;
  const authString = Buffer.from(`${finaleApiKey}:${finaleApiSecret}`).toString('base64');

  console.log('Testing URL:', `${baseUrl}/report/ProductListScreen`);

  try {
    const response = await fetch(`${baseUrl}/report/ProductListScreen`, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API call successful!');
      console.log(`📦 Found ${data.data ? data.data.length : 0} products`);
      
      if (data.data && data.data.length > 0) {
        console.log('\n📋 First product sample:');
        console.log(JSON.stringify(data.data[0], null, 2));
      }
    } else {
      const errorText = await response.text();
      console.log('❌ API call failed');
      console.log('Error:', errorText);
    }
  } catch (error) {
    console.log('❌ API call error:', error.message);
  }
}

testFinaleAPI();
