#!/usr/bin/env node

const fetch = require('node-fetch');

async function triggerSync() {
  console.log('🚀 Triggering Finale inventory sync...\n');

  try {
    const response = await fetch('http://localhost:3001/api/sync-finale', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        syncType: 'full',
        options: {
          filterYear: new Date().getFullYear()
        }
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Sync started successfully!');
      console.log('📊 Sync details:', data);
      
      if (data.syncId) {
        console.log(`\n👀 Monitor progress at: http://localhost:3001/api/sync-finale/status`);
        console.log(`📄 Sync ID: ${data.syncId}`);
      }
    } else {
      console.error('❌ Failed to start sync:', data.error || data.message);
      if (data.details) {
        console.error('Details:', data.details);
      }
    }
  } catch (error) {
    console.error('❌ Error triggering sync:', error.message);
  }
}

// Run the script
triggerSync();