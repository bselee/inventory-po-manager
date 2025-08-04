/**
 * Direct database seeding script for vendors
 * This bypasses the API and directly inserts into Supabase
 */

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zkgaozwmqmdbmmyjfyhe.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseKey) {
  console.error('❌ Supabase key not found. Please set SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const sampleVendors = [
  {
    name: 'BuildASoil',
    contact_name: 'Jeremy Silva',
    email: 'orders@buildasoil.com',
    phone: '720-398-4042',
    address: '1065 Osage Street, Denver, CO 80204',
    payment_terms: 'Net 30',
    lead_time_days: 3,
    minimum_order: 50.00,
    notes: 'Organic soil amendments and gardening supplies',
    active: true
  },
  {
    name: 'Mountain Rose Herbs',
    contact_name: 'Wholesale Department',
    email: 'wholesale@mountainroseherbs.com',
    phone: '800-879-3337',
    address: 'Eugene, OR',
    payment_terms: 'Net 30',
    lead_time_days: 5,
    minimum_order: 100.00,
    notes: 'Organic herbs, spices, and botanical products',
    active: true
  },
  {
    name: 'Azure Standard',
    contact_name: 'Ordering Department',
    email: 'info@azurestandard.com',
    phone: '541-467-2230',
    address: 'Dufur, OR',
    payment_terms: 'Prepaid',
    lead_time_days: 7,
    minimum_order: 50.00,
    notes: 'Organic and natural foods, bulk ordering',
    active: true
  },
  {
    name: 'Frontier Co-op',
    contact_name: 'Customer Service',
    email: 'customercare@frontiercoop.com',
    phone: '800-669-3275',
    address: 'Norway, IA',
    payment_terms: 'Net 30',
    lead_time_days: 4,
    minimum_order: 75.00,
    notes: 'Natural and organic products, member-owned cooperative',
    active: true
  },
  {
    name: 'Starwest Botanicals',
    contact_name: 'Sales Team',
    email: 'sales@starwest-botanicals.com',
    phone: '800-800-4372',
    address: 'Rancho Cordova, CA',
    payment_terms: 'Net 30',
    lead_time_days: 5,
    minimum_order: 100.00,
    notes: 'Bulk herbs, spices, and botanicals',
    active: true
  }
]

async function seedVendors() {
  console.log('🌱 Seeding vendors directly into database...')
  
  try {
    // First, check if we can connect to the database
    const { data: testData, error: testError } = await supabase
      .from('vendors')
      .select('count(*)')
      .single()

    if (testError) {
      console.error('❌ Database connection failed:', testError)
      process.exit(1)
    }

    console.log('✅ Database connection successful')

    // Check if vendors already exist
    const { data: existingVendors, error: checkError } = await supabase
      .from('vendors')
      .select('name')

    if (checkError) {
      console.error('❌ Error checking existing vendors:', checkError)
      process.exit(1)
    }

    const existingNames = existingVendors.map(v => v.name)
    console.log(`📊 Found ${existingVendors.length} existing vendors:`, existingNames)

    // Filter out vendors that already exist
    const vendorsToCreate = sampleVendors.filter(vendor => 
      !existingNames.includes(vendor.name)
    )

    if (vendorsToCreate.length === 0) {
      console.log('✅ All sample vendors already exist!')
      return
    }

    console.log(`📝 Creating ${vendorsToCreate.length} new vendors...`)

    // Insert new vendors
    const { data: newVendors, error: insertError } = await supabase
      .from('vendors')
      .insert(vendorsToCreate)
      .select()

    if (insertError) {
      console.error('❌ Error inserting vendors:', insertError)
      process.exit(1)
    }

    console.log(`✅ Successfully created ${newVendors.length} vendors:`)
    newVendors.forEach((vendor, index) => {
      console.log(`   ${index + 1}. ${vendor.name} (ID: ${vendor.id})`)
    })

    // Final count
    const { data: finalCount, error: countError } = await supabase
      .from('vendors')
      .select('count(*)')
      .single()

    if (!countError) {
      console.log(`📊 Total vendors in database: ${finalCount.count}`)
    }

    console.log('🎉 Vendor seeding completed successfully!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Run the seeding
seedVendors()
