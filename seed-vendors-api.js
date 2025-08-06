/**
 * Simple vendor seeding script using local API
 * This gets environment variables from the running app and bypasses Finale API
 */

async function getEnvVariables() {
  try {
    const response = await fetch('http://localhost:3000/api/health')
    const data = await response.json()
    
    console.log('🔍 Health check response:', JSON.stringify(data, null, 2))
    
    const dbConnected = data.checks && data.checks.database && data.checks.database.connected
    const envConfigured = data.checks && data.checks.environment && data.checks.environment.configured
    
    if (dbConnected && envConfigured) {
      return true
    } else {
      return false
    }
  } catch (error) {
    console.error('❌ Failed to check environment:', error.message)
    return false
  }
}

async function createVendorDirectly(vendor) {
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
      return { success: true, data: result }
    } else {
      const error = await response.text()
      return { success: false, error }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

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
    notes: 'Organic soil amendments and gardening supplies'
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
    notes: 'Organic herbs, spices, and botanical products'
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
    notes: 'Organic and natural foods, bulk ordering'
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
    notes: 'Natural and organic products, member-owned cooperative'
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
    notes: 'Bulk herbs, spices, and botanicals'
  }
]

async function seedVendorsAPI() {
  // Check if server is running and configured
  const envOk = await getEnvVariables()
  if (!envOk) {
    process.exit(1)
  }

  let successCount = 0
  let failCount = 0

  for (const vendor of sampleVendors) {
    const result = await createVendorDirectly(vendor)
    
    if (result.success) {
      successCount++
    } else {
      failCount++
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  if (successCount > 0) {
  } else {
  }
}

// Run the seeding
seedVendorsAPI()
