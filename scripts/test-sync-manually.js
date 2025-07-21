// Manual test script for Finale sync
// Run with: node scripts/test-sync-manually.js

const { createClient } = require('@supabase/supabase-js')

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSync() {
  console.log('Testing Finale Sync System...\n')
  
  try {
    // Test 1: Check database connection
    console.log('1. Testing database connection...')
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('*')
      .limit(1)
      .single()
    
    if (settingsError) {
      console.error('❌ Database connection failed:', settingsError.message)
      return
    }
    
    console.log('✅ Database connected')
    console.log('   Sync enabled:', settings?.sync_enabled || false)
    console.log('   Has Finale credentials:', !!(settings?.finale_api_key && settings?.finale_api_secret))
    
    // Test 2: Check sync_logs table
    console.log('\n2. Checking sync_logs table...')
    const { data: recentSyncs, error: logsError } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('sync_type', 'finale_inventory')
      .order('synced_at', { ascending: false })
      .limit(5)
    
    if (logsError) {
      console.error('❌ sync_logs query failed:', logsError.message)
    } else {
      console.log('✅ sync_logs table accessible')
      console.log('   Recent syncs:', recentSyncs?.length || 0)
      
      if (recentSyncs && recentSyncs.length > 0) {
        const lastSync = recentSyncs[0]
        console.log('   Last sync:', {
          status: lastSync.status,
          date: lastSync.synced_at,
          items: lastSync.items_processed,
          duration: lastSync.duration_ms ? `${lastSync.duration_ms}ms` : 'N/A'
        })
      }
    }
    
    // Test 3: Check for running syncs
    console.log('\n3. Checking for running syncs...')
    const { data: runningSyncs, error: runningError } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('status', 'running')
    
    if (!runningError && runningSyncs) {
      if (runningSyncs.length > 0) {
        console.log('⚠️  Found running syncs:', runningSyncs.length)
        runningSyncs.forEach(sync => {
          const minutes = Math.round((Date.now() - new Date(sync.synced_at).getTime()) / 60000)
          console.log(`   - Sync ${sync.id}: running for ${minutes} minutes`)
        })
      } else {
        console.log('✅ No running syncs')
      }
    }
    
    // Test 4: Check failed_items table
    console.log('\n4. Checking failed_items table...')
    const { count: failedCount, error: failedError } = await supabase
      .from('failed_items')
      .select('*', { count: 'exact', head: true })
      .is('resolved_at', null)
    
    if (failedError) {
      console.error('❌ failed_items query failed:', failedError.message)
    } else {
      console.log('✅ failed_items table accessible')
      console.log('   Unresolved failures:', failedCount || 0)
    }
    
    // Test 5: Check inventory data
    console.log('\n5. Checking inventory data...')
    const { count: itemCount, error: itemError } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
    
    if (itemError) {
      console.error('❌ inventory_items query failed:', itemError.message)
    } else {
      console.log('✅ inventory_items table accessible')
      console.log('   Total items:', itemCount || 0)
    }
    
    // Test 6: Test RPC functions
    console.log('\n6. Testing RPC functions...')
    try {
      const { data: metrics, error: metricsError } = await supabase
        .rpc('get_sync_metrics', { days_back: 7 })
      
      if (metricsError) throw metricsError
      
      console.log('✅ get_sync_metrics function works')
      if (metrics && metrics.length > 0) {
        metrics.forEach(m => {
          console.log(`   - ${m.metric_name}: ${m.metric_value}`)
        })
      }
    } catch (error) {
      console.error('❌ RPC function test failed:', error.message)
    }
    
    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('SYNC SYSTEM STATUS SUMMARY:')
    console.log('='.repeat(50))
    
    if (settings?.finale_api_key && settings?.finale_api_secret && settings?.finale_account_path) {
      console.log('✅ Finale credentials configured')
      console.log('✅ Ready to sync')
      console.log('\nTo trigger a sync:')
      console.log('- Dry run: POST /api/sync-finale with { "dryRun": true }')
      console.log('- Full sync: POST /api/sync-finale')
      console.log('- Check status: GET /api/sync-finale/status')
    } else {
      console.log('❌ Finale credentials NOT configured')
      console.log('\nTo configure:')
      console.log('1. Go to Settings page')
      console.log('2. Enter Finale API credentials')
      console.log('3. Save settings')
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
  }
}

// Run the test
testSync().catch(console.error)