#!/usr/bin/env node

/**
 * Rollback KV Migration
 * Restores data from Supabase backups if migration needs to be reversed
 */

const { createClient } = require('@supabase/supabase-js');
const { kv } = require('@vercel/kv');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
  backupDir: './migration-backups',
  logFile: './rollback.log'
};

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Logging utility
async function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  try {
    await fs.appendFile(config.logFile, logMessage);
  } catch (error) {
    console.warn('Failed to write to log file:', error.message);
  }
}

// Load backup data
async function loadBackupData(tableName) {
  try {
    const backupPath = path.join(config.backupDir, `${tableName}.json`);
    const data = await fs.readFile(backupPath, 'utf8');
    const parsed = JSON.parse(data);
    await log(`📄 Loaded ${parsed.length} records from ${tableName} backup`);
    return parsed;
  } catch (error) {
    await log(`❌ Failed to load backup for ${tableName}: ${error.message}`);
    throw error;
  }
}

// Clear KV data
async function clearKVData() {
  await log('🧹 Clearing KV data...');
  
  try {
    // Get all keys with our patterns
    const patterns = [
      'settings:*',
      'purchase-order:*',
      'vendor:*',
      'sync-log:*',
      'purchase-orders:*',
      'vendors:*',
      'sync-logs:*'
    ];
    
    let totalDeleted = 0;
    
    for (const pattern of patterns) {
      const keys = await kv.keys(pattern);
      if (keys.length > 0) {
        await kv.del(...keys);
        totalDeleted += keys.length;
        await log(`   Deleted ${keys.length} keys matching ${pattern}`);
      }
    }
    
    await log(`✅ Cleared ${totalDeleted} keys from KV`);
  } catch (error) {
    await log(`❌ Failed to clear KV data: ${error.message}`);
    throw error;
  }
}

// Restore table data to Supabase
async function restoreTable(tableName, data) {
  try {
    await log(`🔄 Restoring ${tableName}...`);
    
    // Clear existing data
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .neq('id', 0); // Delete all records
    
    if (deleteError) {
      await log(`⚠️  Warning: Could not clear ${tableName}: ${deleteError.message}`);
    }
    
    // Insert backup data in batches
    const batchSize = 100;
    let restored = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from(tableName)
        .insert(batch);
      
      if (error) {
        await log(`❌ Failed to restore batch ${i}-${i + batch.length} for ${tableName}: ${error.message}`);
        throw error;
      }
      
      restored += batch.length;
    }
    
    await log(`✅ Restored ${restored} records to ${tableName}`);
  } catch (error) {
    await log(`❌ Failed to restore ${tableName}: ${error.message}`);
    throw error;
  }
}

// Verify rollback
async function verifyRollback() {
  await log('🔍 Verifying rollback...');
  
  try {
    const tables = ['settings', 'purchase_orders', 'sync_logs', 'vendors'];
    const stats = {};
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      
      stats[table] = count;
      await log(`📊 ${table}: ${count} records`);
    }
    
    // Verify KV is empty
    const kvKeys = await kv.keys('*');
    const appKeys = kvKeys.filter(key => 
      key.startsWith('settings:') ||
      key.startsWith('purchase-order:') ||
      key.startsWith('vendor:') ||
      key.startsWith('sync-log:')
    );
    
    await log(`📊 KV application keys remaining: ${appKeys.length}`);
    
    if (appKeys.length > 0) {
      await log(`⚠️  Warning: ${appKeys.length} application keys still in KV`);
    }
    
    await log('✅ Rollback verification complete');
    return stats;
  } catch (error) {
    await log(`❌ Rollback verification failed: ${error.message}`);
    throw error;
  }
}

// Main rollback function
async function runRollback() {
  const startTime = Date.now();
  await log('🔄 Starting KV migration rollback...');
  
  try {
    // Check if backup directory exists
    try {
      await fs.access(config.backupDir);
    } catch {
      throw new Error(`Backup directory not found: ${config.backupDir}`);
    }
    
    // Load all backup data
    const tables = ['settings', 'purchase_orders', 'sync_logs', 'vendors'];
    const backupData = {};
    
    for (const table of tables) {
      try {
        backupData[table] = await loadBackupData(table);
      } catch (error) {
        await log(`⚠️  Warning: Could not load backup for ${table}: ${error.message}`);
        backupData[table] = [];
      }
    }
    
    // Clear KV data
    await clearKVData();
    
    // Restore each table
    for (const table of tables) {
      if (backupData[table] && backupData[table].length > 0) {
        await restoreTable(table, backupData[table]);
      } else {
        await log(`⚠️  Skipping ${table} - no backup data found`);
      }
    }
    
    // Verify rollback
    const stats = await verifyRollback();
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    await log(`🎉 Rollback completed successfully in ${duration} seconds`);
    await log(`📊 Rollback Summary:`);
    
    for (const [table, count] of Object.entries(stats)) {
      await log(`   ${table}: ${count} records restored`);
    }
  } catch (error) {
    await log(`💥 Rollback failed: ${error.message}`);
    console.error('\n❌ Rollback Failed!');
    console.error(`Error: ${error.message}`);
    console.error(`📄 Check rollback log: ${config.logFile}`);
    console.error('\n⚠️  Manual intervention may be required');
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  process.exit(0);
}

const isDryRun = args.includes('--dry-run');

if (isDryRun) {
  // Show backup contents without making changes
  (async () => {
    try {
      const tables = ['settings', 'purchase_orders', 'sync_logs', 'vendors'];
      
      for (const table of tables) {
        try {
          const data = await loadBackupData(table);
        } catch (error) {
        }
      }
    } catch (error) {
      console.error('Error during dry run:', error.message);
    }
  })();
} else {
  // Confirm before running
  console.log('Are you sure you want to continue? (y/N)');
  
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  
  process.stdin.on('data', (text) => {
    const answer = text.toString().trim().toLowerCase();
    
    if (answer === 'y' || answer === 'yes') {
      runRollback().catch(console.error);
    } else {
      process.exit(0);
    }
    
    process.stdin.pause();
  });
}
