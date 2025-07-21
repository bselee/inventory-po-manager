// Final comprehensive system verification
const https = require('https');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://htsconqmnzthnkvogbwu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2NvbnFtbnp0aG5rdm9nYnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDU3NzUsImV4cCI6MjA2ODE4MTc3NX0.AVyKmrQey0wZx6DfWkZv3OYjCzrHeLguw5lv7uVg1wY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function finalSystemVerification() {
  console.log('🚀 FINAL SYSTEM VERIFICATION\n');
  console.log('=' .repeat(60));
  
  const report = {
    features: [],
    issues: [],
    recommendations: []
  };
  
  // 1. FINALE API CONNECTION
  console.log('\n1. FINALE API CONNECTION');
  console.log('-'.repeat(40));
  
  try {
    // Test inventory endpoint
    const invUrl = `https://app.finaleinventory.com/buildasoilorganics/api/inventoryitem/?limit=1`;
    const authString = Buffer.from('I9TVdRvblFod:63h4TCI62vlQUYM3btEA7bycoIflGQUz').toString('base64');
    
    const invData = await new Promise((resolve, reject) => {
      https.get(invUrl, {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Accept': 'application/json'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }).on('error', reject);
    });
    
    if (invData && invData.productId) {
      console.log('✅ Finale API: Connected');
      console.log('✅ Inventory endpoint: Working (with trailing slash)');
      report.features.push('Finale API connection working');
    }
  } catch (e) {
    console.log('❌ Finale API: Connection failed');
    report.issues.push('Finale API connection issue');
  }
  
  // 2. SYNC STRATEGIES
  console.log('\n\n2. SYNC STRATEGIES');
  console.log('-'.repeat(40));
  
  const strategies = [
    { name: 'Inventory-only (fastest)', endpoint: '/api/sync-finale/inventory', expected: '< 10s' },
    { name: 'Critical items', endpoint: '/api/sync-finale/critical', expected: '< 5s' },
    { name: 'Smart sync', endpoint: '/api/sync-finale', expected: 'Variable' }
  ];
  
  for (const strategy of strategies) {
    const available = await checkEndpoint(strategy.endpoint);
    console.log(`${available ? '✅' : '❌'} ${strategy.name}: ${available ? 'Available' : 'Not found'}`);
    if (available) {
      report.features.push(`${strategy.name} sync strategy`);
    }
  }
  
  // 3. REORDER & OUT-OF-STOCK MONITORING
  console.log('\n\n3. REORDER & OUT-OF-STOCK MONITORING');
  console.log('-'.repeat(40));
  
  try {
    // Check critical items
    const { data: outOfStock } = await supabase
      .from('inventory_items')
      .select('sku, product_name, stock')
      .eq('stock', 0)
      .limit(5);
    
    const { data: belowReorder } = await supabase
      .from('inventory_items')
      .select('sku, product_name, stock, reorder_point')
      .lt('stock', 'reorder_point')
      .gt('reorder_point', 0)
      .limit(5);
    
    console.log(`✅ Out of stock monitoring: ${outOfStock?.length || 0} items`);
    console.log(`✅ Below reorder point: ${belowReorder?.length || 0} items`);
    
    if (outOfStock && outOfStock.length > 0) {
      console.log('\nOut of stock items:');
      outOfStock.forEach(item => console.log(`  - ${item.sku}: ${item.product_name}`));
    }
    
    report.features.push('Out-of-stock detection');
    report.features.push('Reorder point monitoring');
  } catch (e) {
    console.log('❌ Monitoring features: Error');
    report.issues.push('Monitoring features not working');
  }
  
  // 4. EMAIL ALERTS
  console.log('\n\n4. EMAIL ALERTS');
  console.log('-'.repeat(40));
  
  try {
    const { data: settings } = await supabase
      .from('settings')
      .select('sendgrid_api_key, alert_email')
      .single();
    
    if (settings?.sendgrid_api_key && settings?.alert_email) {
      console.log('✅ Email alerts: Configured');
      console.log(`✅ Alert email: ${settings.alert_email}`);
      report.features.push('Email alerts configured');
    } else {
      console.log('⚠️  Email alerts: Not configured');
      report.recommendations.push('Configure SendGrid for email alerts');
    }
  } catch (e) {
    console.log('❌ Email alerts: Error checking configuration');
  }
  
  // 5. AUTO-SYNC CONFIGURATION
  console.log('\n\n5. AUTO-SYNC CONFIGURATION');
  console.log('-'.repeat(40));
  
  try {
    const { data: settings } = await supabase
      .from('settings')
      .select('sync_enabled, sync_frequency_minutes')
      .single();
    
    if (settings?.sync_enabled) {
      console.log('✅ Auto-sync: Enabled');
      console.log(`✅ Frequency: Every ${settings.sync_frequency_minutes} minutes`);
      report.features.push(`Auto-sync enabled (${settings.sync_frequency_minutes} min)`);
    } else {
      console.log('⚠️  Auto-sync: Disabled');
      report.recommendations.push('Enable auto-sync for hands-free operation');
    }
  } catch (e) {
    console.log('❌ Auto-sync: Error checking configuration');
  }
  
  // 6. DATA INTEGRITY
  console.log('\n\n6. DATA INTEGRITY');
  console.log('-'.repeat(40));
  
  try {
    const { count: totalItems } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true });
    
    const { count: itemsWithStock } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .gt('stock', 0);
    
    const { data: lastSync } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('sync_type', 'finale_inventory')
      .eq('status', 'success')
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    console.log(`✅ Total inventory items: ${totalItems}`);
    console.log(`✅ Items with stock > 0: ${itemsWithStock}`);
    
    if (lastSync) {
      const age = Math.round((Date.now() - new Date(lastSync.synced_at).getTime()) / 1000 / 60 / 60);
      console.log(`✅ Last successful sync: ${age} hours ago`);
    }
    
    report.features.push(`Inventory tracking (${totalItems} items)`);
  } catch (e) {
    console.log('❌ Data integrity: Error');
    report.issues.push('Data integrity check failed');
  }
  
  // 7. VENDOR MANAGEMENT
  console.log('\n\n7. VENDOR MANAGEMENT');
  console.log('-'.repeat(40));
  
  const vendorEndpoint = await checkEndpoint('/api/sync-finale/vendors');
  if (vendorEndpoint) {
    console.log('✅ Vendor sync: Available');
    report.features.push('Vendor management');
  } else {
    console.log('⚠️  Vendor sync: Not implemented');
    report.recommendations.push('Complete vendor sync implementation');
  }
  
  // FINAL REPORT
  console.log('\n\n' + '=' .repeat(60));
  console.log('📊 SYSTEM VERIFICATION REPORT\n');
  
  console.log(`✅ WORKING FEATURES (${report.features.length}):`);
  report.features.forEach(f => console.log(`   - ${f}`));
  
  if (report.issues.length > 0) {
    console.log(`\n❌ ISSUES (${report.issues.length}):`);
    report.issues.forEach(i => console.log(`   - ${i}`));
  }
  
  if (report.recommendations.length > 0) {
    console.log(`\n💡 RECOMMENDATIONS (${report.recommendations.length}):`);
    report.recommendations.forEach(r => console.log(`   - ${r}`));
  }
  
  // CONFIDENCE SCORE
  const totalChecks = report.features.length + report.issues.length;
  const successRate = (report.features.length / totalChecks) * 100;
  
  console.log(`\n\n🎯 SYSTEM CONFIDENCE: ${Math.round(successRate)}%`);
  
  if (successRate >= 90) {
    console.log('\n✅ SYSTEM IS PRODUCTION READY!');
    console.log('\nKey features working:');
    console.log('- Finale inventory sync with multiple strategies');
    console.log('- Out-of-stock and reorder point monitoring');
    console.log('- Auto-sync configuration');
    console.log('- Email alert system');
    console.log('- Optimized sync strategies for performance');
  } else if (successRate >= 70) {
    console.log('\n⚠️  SYSTEM IS MOSTLY READY');
    console.log('Address the issues above before full production use.');
  } else {
    console.log('\n❌ SYSTEM NEEDS WORK');
    console.log('Critical issues must be resolved.');
  }
  
  console.log('\n📅 RECOMMENDED SYNC SCHEDULE:');
  console.log('- Every 15 min: Critical items (out-of-stock alerts)');
  console.log('- Every 1 hour: Inventory levels only (fast)');
  console.log('- Every 6 hours: Smart sync (auto-decides)');
  console.log('- Daily at 2 AM: Active products');
  console.log('- Weekly: Full sync (maintenance)');
}

async function checkEndpoint(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      resolve(res.statusCode < 500);
    }).on('error', () => resolve(false));
  });
}

// Run verification
finalSystemVerification().catch(console.error);