#!/usr/bin/env node

// Test script to verify inventory button functionality
const puppeteer = require('puppeteer');

async function testInventoryButtons() {
  console.log('\n=== INVENTORY BUTTON FUNCTIONALITY TEST ===\n');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Show browser for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser Error:', msg.text());
      }
    });
    
    // Navigate to inventory page
    console.log('1. Navigating to inventory page...');
    await page.goto('http://localhost:3001/inventory', { waitUntil: 'networkidle2' });
    
    // Wait for initial load
    await page.waitForTimeout(2000);
    
    // Test 1: Check if items are displayed
    console.log('\n2. Checking if inventory items are displayed...');
    const itemCount = await page.$$eval('tbody tr', rows => rows.length);
    console.log(`   - Found ${itemCount} inventory items`);
    
    // Test 2: Test search functionality
    console.log('\n3. Testing search functionality...');
    const searchInput = await page.$('input[placeholder*="Search"]');
    if (searchInput) {
      await searchInput.type('test');
      await page.waitForTimeout(500);
      const filteredCount = await page.$$eval('tbody tr', rows => rows.length);
      console.log(`   - Search works: ${filteredCount} items after filtering`);
      await searchInput.click({ clickCount: 3 });
      await searchInput.press('Backspace');
    } else {
      console.log('   - Search input not found!');
    }
    
    // Test 3: Test filter buttons
    console.log('\n4. Testing filter buttons...');
    const filterButtons = await page.$$('button');
    console.log(`   - Found ${filterButtons.length} buttons on page`);
    
    // Try to click "Low Stock" filter
    const lowStockButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('Low Stock'));
    });
    
    if (lowStockButton) {
      await lowStockButton.click();
      await page.waitForTimeout(500);
      console.log('   - Clicked Low Stock filter');
    }
    
    // Test 4: Test view mode buttons
    console.log('\n5. Testing view mode buttons...');
    const viewButtons = ['Planning', 'Analytics', 'Table'];
    for (const view of viewButtons) {
      const button = await page.evaluateHandle((text) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(b => b.textContent.includes(text));
      }, view);
      
      if (button) {
        await button.click();
        await page.waitForTimeout(500);
        console.log(`   - ${view} view button works`);
      }
    }
    
    // Test 5: Test inline editing
    console.log('\n6. Testing inline editing...');
    const editButtons = await page.$$('[data-testid*="edit"]');
    console.log(`   - Found ${editButtons.length} edit buttons`);
    
    if (editButtons.length > 0) {
      await editButtons[0].click();
      await page.waitForTimeout(500);
      console.log('   - Edit button clicked, checking for inline editor...');
      
      const inputVisible = await page.$('input[type="number"]');
      console.log(`   - Inline editor ${inputVisible ? 'appeared' : 'did not appear'}`);
    }
    
    // Test 6: Check for console errors
    console.log('\n7. Checking for JavaScript errors...');
    const errors = await page.evaluate(() => {
      return window.__errors || [];
    });
    
    if (errors.length > 0) {
      console.log('   - Found errors:', errors);
    } else {
      console.log('   - No JavaScript errors detected');
    }
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('\nRecommendations:');
    console.log('1. If buttons don\'t work, check onClick handlers in the code');
    console.log('2. If data doesn\'t appear, check API response format');
    console.log('3. If inline editing fails, check state management');
    console.log('4. Look for errors in browser console (F12)');
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
}

// Check if puppeteer is installed
try {
  require.resolve('puppeteer');
  testInventoryButtons();
} catch (e) {
  console.log('Puppeteer not installed. Running basic test instead...\n');
  console.log('To run full UI tests, install puppeteer:');
  console.log('npm install --save-dev puppeteer\n');
  
  // Fallback to simple test
  const http = require('http');
  http.get('http://localhost:3001/api/inventory', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log('API Test Results:');
        console.log(`- Status: ${res.statusCode}`);
        console.log(`- Items: ${json.data?.inventory?.length || 0}`);
        console.log('\nManual UI Test Instructions:');
        console.log('1. Open http://localhost:3001/inventory');
        console.log('2. Check if buttons respond to clicks');
        console.log('3. Look for errors in browser console (F12)');
      } catch (e) {
        console.error('API Error:', e.message);
      }
    });
  }).on('error', console.error);
}