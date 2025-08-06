import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Get Supabase credentials from environment or use the ones from the app
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.')
  process.exit(1)
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigrations() {
  const migrations = [
    'add-sales-cost-fields.sql',
    'add-finale-po-sync.sql'
  ]

  for (const migrationFile of migrations) {
    try {
      const sqlPath = path.join(__dirname, migrationFile)
      const sql = fs.readFileSync(sqlPath, 'utf8')
      
      // Split by semicolons to run statements separately
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0)

      for (const statement of statements) {
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        })

        if (error) {
          console.error(`❌ Error in ${migrationFile}:`, error.message)
          console.error(`Statement: ${statement.substring(0, 100)}...`)
        }
      }
    } catch (error) {
      console.error(`❌ Failed to run ${migrationFile}:`, error)
    }
  }
}

// Run migrations
runMigrations().catch(console.error)