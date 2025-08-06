const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
// Test environment variables first
const finaleApiKey = process.env.FINALE_API_KEY;
const finaleApiSecret = process.env.FINALE_API_SECRET;
const finaleAccountPath = process.env.FINALE_ACCOUNT_PATH;
if (!finaleApiKey || !finaleApiSecret || !finaleAccountPath) {
  process.exit(1);
}

// Test the API directly
async function syncFromFinale() {
  const fetch = require('node-fetch');
  
  // Clean the account path
  const cleanPath = finaleAccountPath
    .replace('https://app.finaleinventory.com/', '')
    .replace('/1', '');
  
  const baseUrl = `https://app.finaleinventory.com/${cleanPath}/api`;
  const authString = Buffer.from(`${finaleApiKey}:${finaleApiSecret}`).toString('base64');
  try {
    // Test with ProductListScreen report (like the CSV you showed me)
    const url = `${baseUrl}/report/ProductListScreen`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      return;
    }

    const data = await response.json();
    if (data && data.data) {
      if (data.data.length > 0) {
        data.data.slice(0, 3).forEach((product, index) => {
        });
        
        // Count active products
        const activeProducts = data.data.filter(p => 
          p.ProductStatus === 'Active' || 
          p.Status === 'Active' ||
          p.status === 'Active'
        );
        if (activeProducts.length >= 2000) {
        }
      }
    } else {
      console.log('Response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
  }
}

// Execute the sync test
syncFromFinale().then(() => {
}).catch(console.error);
