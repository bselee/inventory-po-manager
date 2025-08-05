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
  console.log(message);
  
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
    
    console.log('\n✅ Rollback Complete!');
    console.log('🔄 All data has been restored to Supabase');
    console.log('🧹 KV data has been cleared');
    console.log(`📄 Full rollback log: ${config.logFile}`);
    
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
  console.log('KV Migration Rollback Tool');
  console.log('');
  console.log('Usage: node rollback-kv-migration.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h     Show this help message');
  console.log('  --dry-run      Show what would be restored without making changes');
  console.log('');
  console.log('This tool will:');
  console.log('1. Clear all application data from Vercel KV');
  console.log('2. Restore data from migration backups to Supabase');
  console.log('3. Verify the restoration was successful');
  console.log('');
  console.log('⚠️  This operation cannot be undone!');
  process.exit(0);
}

const isDryRun = args.includes('--dry-run');

if (isDryRun) {
  console.log('🔍 Dry run mode - showing what would be restored...');
  
  // Show backup contents without making changes
  (async () => {
    try {
      const tables = ['settings', 'purchase_orders', 'sync_logs', 'vendors'];
      
      for (const table of tables) {
        try {
          const data = await loadBackupData(table);
          console.log(`📄 ${table}: ${data.length} records would be restored`);
        } catch (error) {
          console.log(`❌ ${table}: No backup found or error loading`);
        }
      }
      
      console.log('\n🔍 Run without --dry-run to perform the actual rollback');
    } catch (error) {
      console.error('Error during dry run:', error.message);
    }
  })();
} else {
  // Confirm before running
  console.log('⚠️  WARNING: This will permanently delete all KV data and restore from Supabase backups!');
  console.log('⚠️  Make sure you have recent backups before proceeding.');
  console.log('');
  console.log('Are you sure you want to continue? (y/N)');
  
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  
  process.stdin.on('data', (text) => {
    const answer = text.toString().trim().toLowerCase();
    
    if (answer === 'y' || answer === 'yes') {
      console.log('\n🔄 Starting rollback...');
      runRollback().catch(console.error);
    } else {
      console.log('\n✅ Rollback cancelled');
      process.exit(0);
    }
    
    process.stdin.pause();
  });
}
