/**
 * Final vendor seeding solution
 * Direct SQL execution to create vendors bypassing API issues
 */
// The sample vendors with minimal required fields
const sqlInserts = [
  `INSERT INTO vendors (name, contact_name, email, phone, active) VALUES ('BuildASoil', 'Jeremy Silva', 'orders@buildasoil.com', '720-398-4042', true) ON CONFLICT (name) DO NOTHING;`,
  `INSERT INTO vendors (name, contact_name, email, phone, active) VALUES ('Mountain Rose Herbs', 'Wholesale Department', 'wholesale@mountainroseherbs.com', '800-879-3337', true) ON CONFLICT (name) DO NOTHING;`,
  `INSERT INTO vendors (name, contact_name, email, phone, active) VALUES ('Azure Standard', 'Ordering Department', 'info@azurestandard.com', '541-467-2230', true) ON CONFLICT (name) DO NOTHING;`,
  `INSERT INTO vendors (name, contact_name, email, phone, active) VALUES ('Frontier Co-op', 'Customer Service', 'customercare@frontiercoop.com', '800-669-3275', true) ON CONFLICT (name) DO NOTHING;`,
  `INSERT INTO vendors (name, contact_name, email, phone, active) VALUES ('Starwest Botanicals', 'Sales Team', 'sales@starwest-botanicals.com', '800-800-4372', true) ON CONFLICT (name) DO NOTHING;`
]

async function executeSQLViaAPI() {
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
      const response = await fetch('http://localhost:3000/api/vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vendor)
      })
      
      if (response.ok) {
        const result = await response.json()
        successCount++
      } else {
        const errorText = await response.text()
        failCount++
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error) {
      failCount++
    }
  }
  if (successCount > 0) {
    // Test the vendors page
    try {
      const testResponse = await fetch('http://localhost:3000/api/vendors')
      if (testResponse.ok) {
        const vendorData = await testResponse.json()
        vendorData.forEach((v, i) => console.log(`   ${i + 1}. ${v.name}`))
      }
    } catch (error) {
    }
  } else {
    // Show the SQL that should be run manually
    sqlInserts.forEach(sql => console.log(sql))
  }
}

// Run the seeding
executeSQLViaAPI()
