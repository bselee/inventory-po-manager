#!/usr/bin/env node

// Seed vendors script - populates basic vendors when Finale API is unavailable
// This ensures the vendor page works even without external API connectivity

const vendors = [
  {
    name: 'BuildASoil',
    contact_name: 'Jeremy Silva',
    email: 'jeremy@buildasoil.com',
    phone: '970-555-0100',
    address: '123 Main St, Berthoud, CO 80513',
    notes: 'Primary manufacturer - internal products',
    active: true
  },
  {
    name: 'Mountain Rose Herbs',
    contact_name: 'Sales Team',
    email: 'orders@mountainroseherbs.com',
    phone: '800-555-0200',
    address: 'Eugene, OR',
    notes: 'Organic herbs and botanicals supplier',
    active: true
  },
  {
    name: 'Azure Standard',
    contact_name: 'Customer Service',
    email: 'service@azurestandard.com',
    phone: '541-555-0300',
    address: 'Dufur, OR',
    notes: 'Bulk organic foods and supplements',
    active: true
  },
  {
    name: 'Frontier Co-op',
    contact_name: 'Wholesale Team',
    email: 'wholesale@frontiercoop.com',
    phone: '800-555-0400',
    address: 'Norway, IA',
    notes: 'Spices, herbs, and natural products',
    active: true
  },
  {
    name: 'Starwest Botanicals',
    contact_name: 'Sales Department',
    email: 'sales@starwestbotanicals.com',
    phone: '916-555-0500',
    address: 'Rancho Cordova, CA',
    notes: 'Botanical ingredients and essential oils',
    active: true
  }
]

async function seedVendors() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  let successCount = 0
  let errorCount = 0
  
  for (const vendor of vendors) {
    try {
      const response = await fetch(`${baseUrl}/api/vendors`, {
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
        const error = await response.text()
        errorCount++
      }
    } catch (error) {
      errorCount++
    }
  }
  if (successCount > 0) {
  } else {
  }
}

// Add error handling for fetch in Node.js environments
if (typeof fetch === 'undefined') {
  process.exit(1)
}

seedVendors().catch(error => {
  console.error('❌ Seeding failed:', error.message)
  process.exit(1)
})
