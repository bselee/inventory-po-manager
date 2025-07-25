const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('🚀 FINALE INVENTORY SYNC - DIRECT EXECUTION');
console.log('============================================');

// Test environment variables first
const finaleApiKey = process.env.FINALE_API_KEY;
const finaleApiSecret = process.env.FINALE_API_SECRET;
const finaleAccountPath = process.env.FINALE_ACCOUNT_PATH;

console.log('Environment variables:');
console.log('- FINALE_API_KEY:', finaleApiKey ? '✅' : '❌');
console.log('- FINALE_API_SECRET:', finaleApiSecret ? '✅' : '❌');
console.log('- FINALE_ACCOUNT_PATH:', finaleAccountPath ? '✅' : '❌');

if (!finaleApiKey || !finaleApiSecret || !finaleAccountPath) {
  console.log('❌ Missing Finale credentials in environment');
  process.exit(1);
}

// Test the API directly
async function syncFromFinale() {
  console.log('\n📡 TESTING FINALE API CONNECTION');
  console.log('=================================');

  const fetch = require('node-fetch');
  
  // Clean the account path
  const cleanPath = finaleAccountPath
    .replace('https://app.finaleinventory.com/', '')
    .replace('/1', '');
  
  const baseUrl = `https://app.finaleinventory.com/${cleanPath}/api`;
  const authString = Buffer.from(`${finaleApiKey}:${finaleApiSecret}`).toString('base64');
  
  console.log('Base URL:', baseUrl);
  console.log('Account Path:', cleanPath);

  try {
    // Test with ProductListScreen report (like the CSV you showed me)
    const url = `${baseUrl}/report/ProductListScreen`;
    console.log('\n🔍 Fetching products from:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ API Error:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ API Response received!');
    
    if (data && data.data) {
      console.log(`📦 Found ${data.data.length} products from Finale API`);
      
      if (data.data.length > 0) {
        console.log('\n📋 First 3 products:');
        data.data.slice(0, 3).forEach((product, index) => {
          console.log(`${index + 1}. ${product.ProductName || product.Name} (${product.SKU})`);
        });
        
        // Count active products
        const activeProducts = data.data.filter(p => 
          p.ProductStatus === 'Active' || 
          p.Status === 'Active' ||
          p.status === 'Active'
        );
        console.log(`✅ Active products: ${activeProducts.length}`);
        
        if (activeProducts.length >= 2000) {
          console.log('🎉 This matches your expected ~2,866 products!');
          console.log('\n🔄 The sync should now work properly with the updated code.');
          console.log('💡 Try accessing the inventory page - it should show all products now!');
        }
      }
    } else {
      console.log('❌ No data field in response');
      console.log('Response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.log('❌ Sync failed:', error.message);
  }
}

// Execute the sync test
syncFromFinale().then(() => {
  console.log('\n✅ Sync test completed!');
}).catch(console.error);
