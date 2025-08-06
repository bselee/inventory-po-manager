const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSyncLogs() {
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
      if (log.metadata) {
        if (log.metadata.totalProducts) {
        }
        if (log.metadata.insertedCount) {
        }
      }
    });
  } else {
  }
}

checkSyncLogs().catch(console.error);
