#!/usr/bin/env node

async function testFinaleUrl() {
  const apiKey = process.env.FINALE_API_KEY || 'I9TVdRvblFod';
  const apiSecret = process.env.FINALE_API_SECRET || '63h4TCI62vlQUYM3btEA7bycoIflGQUz';
  const accountPath = 'buildasoilorganics';
  
  // Create auth header
  const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const headers = {
    'Authorization': `Basic ${authString}`,
    'Accept': 'application/json'
  };
  
  const urls = [
    `https://app.finaleinventory.com/${accountPath}/api/product?limit=1`,
    `https://app.finaleinventory.com/api/${accountPath}/product?limit=1`,
    `https://app.finaleinventory.com/${accountPath}/api/auth/api/product?limit=1`
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json();
        console.log('Sample response:', JSON.stringify(data).substring(0, 100) + '...');
        return;
      } else {
        const text = await response.text();
        console.log('❌ Failed:', text.substring(0, 100));
      }
    } catch (error) {
    }
  }
}

testFinaleUrl();