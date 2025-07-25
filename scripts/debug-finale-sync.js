const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// We need to compile TypeScript first
const fs = require('fs');
const { execSync } = require('child_process');

// Simplified inline test to avoid import issues
async function testFinaleDirectly() {
  console.log('🔍 TESTING FINALE API SYNC');
  console.log('==========================');
  
  // Test if we have environment variables
  const host = process.env.FINALE_API_HOST;
  const user = process.env.FINALE_API_USER;
  const key = process.env.FINALE_API_KEY;
  
  console.log('Environment check:');
  console.log('- FINALE_API_HOST:', host ? '✅' : '❌');
  console.log('- FINALE_API_USER:', user ? '✅' : '❌');
  console.log('- FINALE_API_KEY:', key ? '✅' : '❌');
  
  if (!host || !user || !key) {
    console.log('❌ Missing Finale API credentials');
    return;
  }
  
  // Direct API test
  const fetch = require('node-fetch');
  const auth = Buffer.from(`${user}:${key}`).toString('base64');
  
  console.log('\n📡 Testing direct API call...');
  
  try {
    // Test the ProductListScreen report
    const url = `${host}/api/report/ProductListScreen`;
    console.log('URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ API Response received');
    console.log('Data type:', typeof data);
    console.log('Data keys:', data ? Object.keys(data) : 'null');
    
    if (data && data.data) {
      console.log(`📦 Found ${data.data.length} products in API response`);
      
      if (data.data.length > 0) {
        console.log('\n📝 First product sample:');
        console.log(JSON.stringify(data.data[0], null, 2));
        
        // Check for active products
        const activeProducts = data.data.filter(p => 
          p.ProductStatus === 'Active' || 
          p.status === 'Active' ||
          p.Status === 'Active'
        );
        console.log(`✅ Active products: ${activeProducts.length}`);
      }
    } else {
      console.log('❌ No data field in response');
    }
    
  } catch (error) {
    console.error('❌ API call failed:', error.message);
  }
}

testFinaleDirectly();
