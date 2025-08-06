const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// We need to compile TypeScript first
const fs = require('fs');
const { execSync } = require('child_process');

// Simplified inline test to avoid import issues
async function testFinaleDirectly() {
  // Test if we have environment variables
  const host = process.env.FINALE_API_HOST;
  const user = process.env.FINALE_API_USER;
  const key = process.env.FINALE_API_KEY;
  if (!host || !user || !key) {
    return;
  }
  
  // Direct API test
  const fetch = require('node-fetch');
  const auth = Buffer.from(`${user}:${key}`).toString('base64');
  try {
    // Test the ProductListScreen report
    const url = `${host}/api/report/ProductListScreen`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      return;
    }
    
    const data = await response.json();
    console.log('Data keys:', data ? Object.keys(data) : 'null');
    
    if (data && data.data) {
      if (data.data.length > 0) {
        console.log(JSON.stringify(data.data[0], null, 2));
        
        // Check for active products
        const activeProducts = data.data.filter(p => 
          p.ProductStatus === 'Active' || 
          p.status === 'Active' ||
          p.Status === 'Active'
        );
      }
    } else {
    }
    
  } catch (error) {
    console.error('❌ API call failed:', error.message);
  }
}

testFinaleDirectly();
