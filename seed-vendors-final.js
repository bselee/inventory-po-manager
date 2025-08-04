/**
 * Final vendor seeding solution
 * Direct SQL execution to create vendors bypassing API issues
 */

console.log('🌱 Starting SQL-based vendor seeding...')

// The sample vendors with minimal required fields
const sqlInserts = [
  `INSERT INTO vendors (name, contact_name, email, phone, active) VALUES ('BuildASoil', 'Jeremy Silva', 'orders@buildasoil.com', '720-398-4042', true) ON CONFLICT (name) DO NOTHING;`,
  `INSERT INTO vendors (name, contact_name, email, phone, active) VALUES ('Mountain Rose Herbs', 'Wholesale Department', 'wholesale@mountainroseherbs.com', '800-879-3337', true) ON CONFLICT (name) DO NOTHING;`,
  `INSERT INTO vendors (name, contact_name, email, phone, active) VALUES ('Azure Standard', 'Ordering Department', 'info@azurestandard.com', '541-467-2230', true) ON CONFLICT (name) DO NOTHING;`,
  `INSERT INTO vendors (name, contact_name, email, phone, active) VALUES ('Frontier Co-op', 'Customer Service', 'customercare@frontiercoop.com', '800-669-3275', true) ON CONFLICT (name) DO NOTHING;`,
  `INSERT INTO vendors (name, contact_name, email, phone, active) VALUES ('Starwest Botanicals', 'Sales Team', 'sales@starwest-botanicals.com', '800-800-4372', true) ON CONFLICT (name) DO NOTHING;`
]

async function executeSQLViaAPI() {
  console.log('📝 Executing SQL via API endpoints...')
  
  // For each vendor, make a simpler API call
  const vendors = [
    {
      name: 'BuildASoil',
      contact_name: 'Jeremy Silva',
      email: 'orders@buildasoil.com',
      phone: '720-398-4042'
    },
    {
      name: 'Mountain Rose Herbs',
      contact_name: 'Wholesale Department',
      email: 'wholesale@mountainroseherbs.com',
      phone: '800-879-3337'
    },
    {
      name: 'Azure Standard',
      contact_name: 'Ordering Department',
      email: 'info@azurestandard.com',
      phone: '541-467-2230'
    },
    {
      name: 'Frontier Co-op',
      contact_name: 'Customer Service',
      email: 'customercare@frontiercoop.com',
      phone: '800-669-3275'
    },
    {
      name: 'Starwest Botanicals',
      contact_name: 'Sales Team',
      email: 'sales@starwest-botanicals.com',
      phone: '800-800-4372'
    }
  ]
  
  let successCount = 0
  let failCount = 0
  
  for (const vendor of vendors) {
    try {
      console.log(`Creating vendor: ${vendor.name}`)
      
      const response = await fetch('http://localhost:3000/api/vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vendor)
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log(`✅ Successfully created ${vendor.name}`)
        successCount++
      } else {
        const errorText = await response.text()
        console.log(`❌ Failed to create ${vendor.name}: ${errorText}`)
        failCount++
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error) {
      console.log(`❌ Error creating ${vendor.name}: ${error.message}`)
      failCount++
    }
  }
  
  console.log('\n📊 Summary:')
  console.log(`✅ Successfully created: ${successCount} vendors`)
  console.log(`❌ Failed to create: ${failCount} vendors`)
  
  if (successCount > 0) {
    console.log('🎉 Vendor seeding completed! Visit http://localhost:3000/vendors to see the results.')
    
    // Test the vendors page
    try {
      const testResponse = await fetch('http://localhost:3000/api/vendors')
      if (testResponse.ok) {
        const vendorData = await testResponse.json()
        console.log(`📊 Total vendors now in database: ${vendorData.length}`)
        vendorData.forEach((v, i) => console.log(`   ${i + 1}. ${v.name}`))
      }
    } catch (error) {
      console.log('ℹ️  Could not verify vendor count, but seeding completed')
    }
  } else {
    console.log('⚠️  No vendors were created. There may be database schema issues.')
    console.log('💡 Recommended next steps:')
    console.log('   1. Check if vendors table exists with correct schema')
    console.log('   2. Run database migrations if needed')
    console.log('   3. Verify Supabase connection and permissions')
    
    // Show the SQL that should be run manually
    console.log('\n📜 Manual SQL to run in Supabase SQL editor:')
    sqlInserts.forEach(sql => console.log(sql))
  }
}

// Run the seeding
executeSQLViaAPI()
