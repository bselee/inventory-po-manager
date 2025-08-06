const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://htsconqmnzthnkvogbwu.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2NvbnFtbnp0aG5rdm9nYnd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjYwNTc3NSwiZXhwIjoyMDY4MTgxNzc1fQ.uQDz6k9xfa8NxuEPEGUi9bjeuUD2-n8tqBKFSZYCn2c'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  const migrationSQL = `
    -- Add report URL columns
    ALTER TABLE settings 
    ADD COLUMN IF NOT EXISTS finale_inventory_report_url TEXT,
    ADD COLUMN IF NOT EXISTS finale_consumption_14day_url TEXT,
    ADD COLUMN IF NOT EXISTS finale_consumption_30day_url TEXT,
    ADD COLUMN IF NOT EXISTS finale_stock_report_url TEXT,
    ADD COLUMN IF NOT EXISTS inventory_data_source TEXT DEFAULT 'supabase' CHECK (inventory_data_source IN ('supabase', 'vercel-kv', 'finale-cache', 'enhanced'));
  `
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('Migration failed:', error)
      
      // Try alternative approach - add columns one by one
      const columns = [
        'finale_inventory_report_url TEXT',
        'finale_consumption_14day_url TEXT', 
        'finale_consumption_30day_url TEXT',
        'finale_stock_report_url TEXT',
        "inventory_data_source TEXT DEFAULT 'supabase'"
      ]
      
      for (const column of columns) {
        const [colName] = column.split(' ')
        // Check if column exists first
        const { data: cols } = await supabase
          .from('settings')
          .select(colName)
          .limit(1)
        
        if (!cols) {
        } else {
        }
      }
    } else {
    }
    
    // Verify columns exist
    const { data, error: selectError } = await supabase
      .from('settings')
      .select('*')
      .limit(1)
      .maybeSingle()
    
    if (selectError) {
      console.error('Error checking settings:', selectError)
    } else {
      console.log('Current settings columns:', Object.keys(data || {}))
    }
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

applyMigration().then(() => {
  process.exit(0)
}).catch(error => {
  console.error('Migration failed:', error)
  process.exit(1)
})