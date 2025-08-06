const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const finaleApiKey = process.env.FINALE_API_KEY;
const finaleApiSecret = process.env.FINALE_API_SECRET;
const finaleAccountPath = process.env.FINALE_ACCOUNT_PATH;
if (finaleApiKey && finaleApiSecret && finaleAccountPath) {
  // Clean the account path like the function does
  const cleanPath = finaleAccountPath.replace('https://app.finaleinventory.com/', '').replace('/1', '');
} else {
}

// Test direct API call
async function testFinaleAPI() {
  if (!finaleApiKey || !finaleApiSecret || !finaleAccountPath) {
    return;
  }
  const fetch = require('node-fetch');
  const cleanPath = finaleAccountPath.replace('https://app.finaleinventory.com/', '').replace('/1', '');
  const baseUrl = `https://app.finaleinventory.com/${cleanPath}/api`;
  const authString = Buffer.from(`${finaleApiKey}:${finaleApiSecret}`).toString('base64');
  try {
    const response = await fetch(`${baseUrl}/report/ProductListScreen`, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      }
    });
    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        console.log(JSON.stringify(data.data[0], null, 2));
      }
    } else {
      const errorText = await response.text();
    }
  } catch (error) {
  }
}

testFinaleAPI();
