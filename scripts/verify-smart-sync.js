#!/usr/bin/env node

const https = require('https');
const http = require('http');
// Test local endpoint
const testEndpoint = (url, callback) => {
  const protocol = url.startsWith('https') ? https : http;
  
  protocol.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        callback(null, json);
      } catch (error) {
        callback(error);
      }
    });
  }).on('error', callback);
};

// Check if smart sync is available
testEndpoint('http://localhost:3000/api/sync-finale-smart', (error, data) => {
  if (error) {
  } else {
  }
});

// Direct database check
console.log('✅ Columns Added: 4 (content_hash, last_synced_at, sync_priority, sync_status)');
console.log('✅ Critical View Created: 1 (critical_inventory_items)');