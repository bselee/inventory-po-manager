#!/usr/bin/env node

// Test script to verify inventory button functionality
const puppeteer = require('puppeteer');

async function testInventoryButtons() {

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

    await page.goto('http://localhost:3001/inventory', { waitUntil: 'networkidle2' });
    
    // Wait for initial load
    await page.waitForTimeout(2000);
    
    // Test 1: Check if items are displayed

    const itemCount = await page.$$eval('tbody tr', rows => rows.length);

    // Test 2: Test search functionality

    const searchInput = await page.$('input[placeholder*="Search"]');
    if (searchInput) {
      await searchInput.type('test');
      await page.waitForTimeout(500);
      const filteredCount = await page.$$eval('tbody tr', rows => rows.length);

      await searchInput.click({ clickCount: 3 });
      await searchInput.press('Backspace');
    } else {

    }
    
    // Test 3: Test filter buttons

    const filterButtons = await page.$$('button');

    // Try to click "Low Stock" filter
    const lowStockButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('Low Stock'));
    });
    
    if (lowStockButton) {
      await lowStockButton.click();
      await page.waitForTimeout(500);

    }
    
    // Test 4: Test view mode buttons

    const viewButtons = ['Planning', 'Analytics', 'Table'];
    for (const view of viewButtons) {
      const button = await page.evaluateHandle((text) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(b => b.textContent.includes(text));
      }, view);
      
      if (button) {
        await button.click();
        await page.waitForTimeout(500);

      }
    }
    
    // Test 5: Test inline editing

    const editButtons = await page.$$('[data-testid*="edit"]');

    if (editButtons.length > 0) {
      await editButtons[0].click();
      await page.waitForTimeout(500);

      const inputVisible = await page.$('input[type="number"]');

    }
    
    // Test 6: Check for console errors

    const errors = await page.evaluate(() => {
      return window.__errors || [];
    });
    
    if (errors.length > 0) {

    } else {

    }


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


  // Fallback to simple test
  const http = require('http');
  http.get('http://localhost:3001/api/inventory', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);


        console.log('3. Look for errors in browser console (F12)');
      } catch (e) {
        console.error('API Error:', e.message);
      }
    });
  }).on('error', console.error);
}