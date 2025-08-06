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
  try {
    // Test 1: Check database connection
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('*')
      .limit(1)
      .single()
    
    if (settingsError) {
      console.error('❌ Database connection failed:', settingsError.message)
      return
    }
    console.log('   Has Finale credentials:', !!(settings?.finale_api_key && settings?.finale_api_secret))
    
    // Test 2: Check sync_logs table
    const { data: recentSyncs, error: logsError } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('sync_type', 'finale_inventory')
      .order('synced_at', { ascending: false })
      .limit(5)
    
    if (logsError) {
      console.error('❌ sync_logs query failed:', logsError.message)
    } else {
      if (recentSyncs && recentSyncs.length > 0) {
        const lastSync = recentSyncs[0]
      }
    }
    
    // Test 3: Check for running syncs
    const { data: runningSyncs, error: runningError } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('status', 'running')
    
    if (!runningError && runningSyncs) {
      if (runningSyncs.length > 0) {
        runningSyncs.forEach(sync => {
          const minutes = Math.round((Date.now() - new Date(sync.synced_at).getTime()) / 60000)
        })
      } else {
      }
    }
    
    // Test 4: Check failed_items table
    const { count: failedCount, error: failedError } = await supabase
      .from('failed_items')
      .select('*', { count: 'exact', head: true })
      .is('resolved_at', null)
    
    if (failedError) {
      console.error('❌ failed_items query failed:', failedError.message)
    } else {
    }
    
    // Test 5: Check inventory data
    const { count: itemCount, error: itemError } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
    
    if (itemError) {
      console.error('❌ inventory_items query failed:', itemError.message)
    } else {
    }
    
    // Test 6: Test RPC functions
    try {
      const { data: metrics, error: metricsError } = await supabase
        .rpc('get_sync_metrics', { days_back: 7 })
      
      if (metricsError) throw metricsError
      if (metrics && metrics.length > 0) {
        metrics.forEach(m => {
        })
      }
    } catch (error) {
      console.error('❌ RPC function test failed:', error.message)
    }
    
    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('='.repeat(50))
    
    if (settings?.finale_api_key && settings?.finale_api_secret && settings?.finale_account_path) {
    } else {
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
  }
}

// Run the test
testSync().catch(console.error)