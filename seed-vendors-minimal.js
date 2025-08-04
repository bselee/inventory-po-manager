/**
 * Database schema verification and vendor seeding script
 * This will check and create the vendors table if needed, then seed data
 */

const { createClient } = require('@supabase/supabase-js')

// Simple vendor data (only essential fields)
const sampleVendors = [
  {
    name: 'BuildASoil',
    contact_name: 'Jeremy Silva',
    email: 'orders@buildasoil.com',
    phone: '720-398-4042',
    active: true
  },
  {
    name: 'Mountain Rose Herbs',
    contact_name: 'Wholesale Department',
    email: 'wholesale@mountainroseherbs.com',
    phone: '800-879-3337',
    active: true
  },
  {
    name: 'Azure Standard',
    contact_name: 'Ordering Department',
    email: 'info@azurestandard.com',
    phone: '541-467-2230',
    active: true
  },
  {
    name: 'Frontier Co-op',
    contact_name: 'Customer Service',
    email: 'customercare@frontiercoop.com',
    phone: '800-669-3275',
    active: true
  },
  {
    name: 'Starwest Botanicals',
    contact_name: 'Sales Team',
    email: 'sales@starwest-botanicals.com',
    phone: '800-800-4372',
    active: true
  }
]

async function getSupabaseClient() {
  // Try to get the Supabase URL and key from the health endpoint
  try {
    const response = await fetch('http://localhost:3000/api/debug-db')
    const data = await response.json()
    
    console.log('🔐 Database configuration check:')
    console.log('Has URL:', data.environment?.hasUrl || false)
    console.log('Has Key:', data.environment?.hasKey || false)
    
    if (!data.environment?.hasUrl || !data.environment?.hasKey) {
      throw new Error('Database configuration incomplete')
    }
    
    // Use hardcoded values based on the working health check
    const supabaseUrl = 'https://zkgaozwmqmdbmmyjfyhe.supabase.co'
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprZ2FventtcW1kYm1teWpmeWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NTQxNzQsImV4cCI6MjA1MTEzMDE3NH0.Jzb0UgUCzNk2t5zkOZqrN5fSyK7PvIClw5W5G-lT-8k'
    
    return createClient(supabaseUrl, supabaseKey)
  } catch (error) {
    console.error('❌ Failed to get database configuration:', error.message)
    throw error
  }
}

async function verifyAndCreateTable(supabase) {
  console.log('🔍 Checking vendors table schema...')
  
  // First, try a simple select to see what happens
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .limit(1)
  
  if (error) {
    console.log('❌ Table access error:', error.message)
    
    if (error.message.includes('relation "vendors" does not exist')) {
      console.log('📝 Creating vendors table...')
      
      // Create the table using raw SQL
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS vendors (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            contact_name TEXT,
            email TEXT,
            phone TEXT,
            address TEXT,
            payment_terms TEXT,
            lead_time_days INTEGER,
            minimum_order DECIMAL(10, 2),
            notes TEXT,
            active BOOLEAN DEFAULT true,
            finale_vendor_id TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          
          ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
          
          DROP POLICY IF EXISTS "Enable all access for vendors" ON vendors;
          CREATE POLICY "Enable all access for vendors" ON vendors
            FOR ALL USING (true) WITH CHECK (true);
        `
      })
      
      if (createError) {
        console.error('❌ Failed to create table:', createError)
        throw createError
      }
      
      console.log('✅ Vendors table created successfully')
    } else {
      throw error
    }
  } else {
    console.log('✅ Vendors table exists and is accessible')
  }
}

async function seedVendorsMinimal() {
  console.log('🌱 Starting minimal vendor seeding...')
  
  try {
    const supabase = await getSupabaseClient()
    
    // Verify table exists
    await verifyAndCreateTable(supabase)
    
    // Check existing vendors
    const { data: existingVendors, error: checkError } = await supabase
      .from('vendors')
      .select('name')
    
    if (checkError) {
      console.error('❌ Error checking existing vendors:', checkError)
      throw checkError
    }
    
    const existingNames = existingVendors?.map(v => v.name) || []
    console.log(`📊 Found ${existingNames.length} existing vendors:`, existingNames)
    
    // Filter new vendors
    const vendorsToCreate = sampleVendors.filter(vendor => 
      !existingNames.includes(vendor.name)
    )
    
    if (vendorsToCreate.length === 0) {
      console.log('✅ All sample vendors already exist!')
      return
    }
    
    console.log(`📝 Creating ${vendorsToCreate.length} new vendors...`)
    
    // Insert vendors one by one for better error handling
    let successCount = 0
    let failCount = 0
    
    for (const vendor of vendorsToCreate) {
      const { data: newVendor, error: insertError } = await supabase
        .from('vendors')
        .insert(vendor)
        .select()
      
      if (insertError) {
        console.error(`❌ Failed to create ${vendor.name}:`, insertError.message)
        failCount++
      } else {
        console.log(`✅ Created ${vendor.name} (ID: ${newVendor[0].id})`)
        successCount++
      }
    }
    
    console.log('\n📊 Summary:')
    console.log(`✅ Successfully created: ${successCount} vendors`)
    console.log(`❌ Failed to create: ${failCount} vendors`)
    
    if (successCount > 0) {
      console.log('🎉 Vendor seeding completed! Visit http://localhost:3000/vendors to see the results.')
    }
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message)
    process.exit(1)
  }
}

// Execute the seeding
seedVendorsMinimal()
