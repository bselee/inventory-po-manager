const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSyncLogs() {
  console.log('🔍 Checking recent sync logs...');
  
  const { data: syncLogs, error } = await supabase
    .from('sync_logs')
    .select('*')
    .order('synced_at', { ascending: false })
    .limit(5);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
    
  if (syncLogs && syncLogs.length > 0) {
    syncLogs.forEach(log => {
      console.log(`📊 ${log.synced_at}: ${log.sync_type} - ${log.status}`);
      if (log.metadata) {
        console.log(`   Strategy: ${log.metadata.strategy || 'unknown'}`);
        console.log(`   Progress: ${log.metadata.progress || 'unknown'}`);
        if (log.metadata.totalProducts) {
          console.log(`   Total Products: ${log.metadata.totalProducts}`);
        }
        if (log.metadata.insertedCount) {
          console.log(`   Inserted: ${log.metadata.insertedCount}`);
        }
      }
      console.log('');
    });
  } else {
    console.log('No sync logs found');
  }
}

checkSyncLogs().catch(console.error);
