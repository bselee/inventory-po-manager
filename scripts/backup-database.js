#!/usr/bin/env node

/**
 * Database Backup and Recovery Script
 * Creates backups of critical data and provides recovery utilities
 */

const { supabaseAdmin } = require('../lib/supabase');
const fs = require('fs').promises;
const path = require('path');

const BACKUP_DIR = './backups';
const MAX_BACKUPS = 10; // Keep last 10 backups

async function ensureBackupDirectory() {
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    console.log(`📁 Created backup directory: ${BACKUP_DIR}`);
  }
}

async function backupTable(tableName, filename) {
  try {
    console.log(`📦 Backing up ${tableName}...`);
    
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select('*');
    
    if (error) {
      throw new Error(`Failed to backup ${tableName}: ${error.message}`);
    }
    
    const backupData = {
      table: tableName,
      timestamp: new Date().toISOString(),
      recordCount: data.length,
      data: data,
    };
    
    await fs.writeFile(filename, JSON.stringify(backupData, null, 2), 'utf8');
    console.log(`✅ ${tableName}: ${data.length} records backed up`);
    
    return { success: true, recordCount: data.length };
  } catch (error) {
    console.error(`❌ ${tableName}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function createFullBackup() {
  console.log('🚀 Starting Full Database Backup...');
  
  await ensureBackupDirectory();
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`);
  
  await fs.mkdir(backupPath, { recursive: true });
  
  const tables = [
    'inventory_items',
    'purchase_orders',
    'sync_logs',
    'failed_items',
    'settings',
    'audit_log',
  ];
  
  const backupResults = {};
  let totalRecords = 0;
  
  for (const table of tables) {
    const filename = path.join(backupPath, `${table}.json`);
    const result = await backupTable(table, filename);
    backupResults[table] = result;
    
    if (result.success) {
      totalRecords += result.recordCount;
    }
  }
  
  // Create backup manifest
  const manifest = {
    timestamp: new Date().toISOString(),
    tables: backupResults,
    totalRecords,
    backupPath,
    version: '1.0.0',
  };
  
  await fs.writeFile(
    path.join(backupPath, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
  
  console.log('\n📋 Backup Summary:');
  console.log(`Total Records: ${totalRecords}`);
  console.log(`Backup Location: ${backupPath}`);
  
  // Clean up old backups
  await cleanupOldBackups();
  
  return manifest;
}

async function cleanupOldBackups() {
  try {
    const backupDirs = await fs.readdir(BACKUP_DIR);
    const backupPaths = backupDirs
      .filter(dir => dir.startsWith('backup-'))
      .map(dir => ({
        name: dir,
        path: path.join(BACKUP_DIR, dir),
        timestamp: dir.replace('backup-', ''),
      }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    
    if (backupPaths.length > MAX_BACKUPS) {
      const toDelete = backupPaths.slice(MAX_BACKUPS);
      
      for (const backup of toDelete) {
        await fs.rm(backup.path, { recursive: true, force: true });
        console.log(`🗑️  Removed old backup: ${backup.name}`);
      }
    }
  } catch (error) {
    console.warn(`⚠️  Could not cleanup old backups: ${error.message}`);
  }
}

async function listBackups() {
  try {
    await ensureBackupDirectory();
    
    const backupDirs = await fs.readdir(BACKUP_DIR);
    const backups = [];
    
    for (const dir of backupDirs) {
      if (dir.startsWith('backup-')) {
        const manifestPath = path.join(BACKUP_DIR, dir, 'manifest.json');
        
        try {
          const manifestData = await fs.readFile(manifestPath, 'utf8');
          const manifest = JSON.parse(manifestData);
          backups.push({
            name: dir,
            ...manifest,
          });
        } catch {
          // Backup without manifest
          backups.push({
            name: dir,
            timestamp: dir.replace('backup-', ''),
            incomplete: true,
          });
        }
      }
    }
    
    backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    
    console.log('📋 Available Backups:');
    if (backups.length === 0) {
      console.log('No backups found');
    } else {
      backups.forEach((backup, i) => {
        const status = backup.incomplete ? '⚠️  INCOMPLETE' : '✅ COMPLETE';
        console.log(`${i + 1}. ${backup.name} - ${backup.timestamp} ${status}`);
        if (!backup.incomplete) {
          console.log(`   Total Records: ${backup.totalRecords || 'unknown'}`);
        }
      });
    }
    
    return backups;
  } catch (error) {
    console.error(`❌ Could not list backups: ${error.message}`);
    return [];
  }
}

async function restoreFromBackup(backupName, options = {}) {
  console.log(`🔄 Restoring from backup: ${backupName}`);
  
  const backupPath = path.join(BACKUP_DIR, backupName);
  const manifestPath = path.join(backupPath, 'manifest.json');
  
  try {
    const manifestData = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestData);
    
    console.log(`📅 Backup Date: ${manifest.timestamp}`);
    console.log(`📊 Total Records: ${manifest.totalRecords}`);
    
    if (!options.confirmed) {
      console.log('\n⚠️  WARNING: This will replace existing data!');
      console.log('Add --confirmed flag to proceed with restore');
      return { success: false, message: 'Confirmation required' };
    }
    
    const restoreResults = {};
    
    for (const [tableName, tableInfo] of Object.entries(manifest.tables)) {
      if (!tableInfo.success) {
        console.log(`⏭️  Skipping ${tableName} (backup failed)`);
        continue;
      }
      
      console.log(`🔄 Restoring ${tableName}...`);
      
      try {
        const tableBackupPath = path.join(backupPath, `${tableName}.json`);
        const backupData = JSON.parse(await fs.readFile(tableBackupPath, 'utf8'));
        
        if (options.clearBefore) {
          // Clear existing data
          const { error: deleteError } = await supabaseAdmin
            .from(tableName)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
          
          if (deleteError) {
            console.warn(`⚠️  Could not clear ${tableName}: ${deleteError.message}`);
          }
        }
        
        // Insert backup data in chunks
        const chunkSize = 100;
        const chunks = [];
        for (let i = 0; i < backupData.data.length; i += chunkSize) {
          chunks.push(backupData.data.slice(i, i + chunkSize));
        }
        
        let restoredCount = 0;
        for (const chunk of chunks) {
          const { error } = await supabaseAdmin
            .from(tableName)
            .upsert(chunk);
          
          if (error) {
            throw new Error(`Failed to restore chunk: ${error.message}`);
          }
          
          restoredCount += chunk.length;
        }
        
        restoreResults[tableName] = {
          success: true,
          restoredCount,
          originalCount: backupData.recordCount,
        };
        
        console.log(`✅ ${tableName}: ${restoredCount} records restored`);
      } catch (error) {
        restoreResults[tableName] = {
          success: false,
          error: error.message,
        };
        console.error(`❌ ${tableName}: ${error.message}`);
      }
    }
    
    console.log('\n📋 Restore Summary:');
    const successfulTables = Object.values(restoreResults).filter(r => r.success).length;
    const totalTables = Object.keys(restoreResults).length;
    console.log(`Tables Restored: ${successfulTables}/${totalTables}`);
    
    return { success: true, results: restoreResults };
  } catch (error) {
    console.error(`❌ Restore failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'backup';
  
  if (!supabaseAdmin) {
    console.error('❌ Service role key required for database operations');
    process.exit(1);
  }
  
  switch (command) {
    case 'backup':
      await createFullBackup();
      break;
      
    case 'list':
      await listBackups();
      break;
      
    case 'restore':
      const backupName = args[1];
      if (!backupName) {
        console.error('❌ Please specify backup name to restore');
        console.log('Usage: node backup-database.js restore <backup-name> [--confirmed] [--clear-before]');
        process.exit(1);
      }
      
      const options = {
        confirmed: args.includes('--confirmed'),
        clearBefore: args.includes('--clear-before'),
      };
      
      await restoreFromBackup(backupName, options);
      break;
      
    default:
      console.log('📖 Database Backup Utility');
      console.log('');
      console.log('Commands:');
      console.log('  backup              Create a full database backup');
      console.log('  list                List available backups');
      console.log('  restore <name>      Restore from a specific backup');
      console.log('');
      console.log('Restore options:');
      console.log('  --confirmed         Confirm the restore operation');
      console.log('  --clear-before      Clear existing data before restore');
      console.log('');
      console.log('Examples:');
      console.log('  node backup-database.js backup');
      console.log('  node backup-database.js list');
      console.log('  node backup-database.js restore backup-2023-12-01T10-00-00-000Z --confirmed');
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Backup operation failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  createFullBackup,
  listBackups,
  restoreFromBackup,
  cleanupOldBackups,
};
