// Finale vendor sync functionality
import { FinaleApiConfig } from './finale-api'
import { supabase } from './supabase'

interface FinaleVendor {
  vendorId: string
  vendorName: string
  contactName?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  active?: boolean
}

export class FinaleVendorService {
  private config: FinaleApiConfig
  private baseUrl: string
  private authHeader: string

  constructor(config: FinaleApiConfig) {
    this.config = config
    this.baseUrl = `https://app.finaleinventory.com/${config.accountPath}/api`
    
    const authString = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')
    this.authHeader = `Basic ${authString}`
  }

  // Get all vendors from Finale
  async getVendors(): Promise<FinaleVendor[]> {
    try {
      const response = await fetch(`${this.baseUrl}/vendors`, {
        headers: {
          'Authorization': this.authHeader,
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Vendor API error: ${response.status}`)
      }

      const data = await response.json()
      
      // Parse Finale's parallel array format
      const vendors: FinaleVendor[] = []
      
      if (data.partyId && Array.isArray(data.partyId)) {
        for (let i = 0; i < data.partyId.length; i++) {
          vendors.push({
            vendorId: data.partyId[i],
            vendorName: data.partyName?.[i] || data.partyId[i],
            contactName: data.contactName?.[i],
            email: data.email?.[i],
            phone: data.phone?.[i],
            address: data.address?.[i],
            notes: data.notes?.[i],
            active: data.statusId?.[i] !== 'INACTIVE'
          })
        }
      }
      
      return vendors
    } catch (error) {
      console.error('Error fetching vendors:', error)
      throw error
    }
  }

  // Sync vendors to Supabase
  async syncVendorsToSupabase(): Promise<any> {
    console.log('🏢 Syncing vendors from Finale...')
    
    try {
      const vendors = await this.getVendors()
      console.log(`Found ${vendors.length} vendors`)
      
      // Filter active vendors only
      const activeVendors = vendors.filter(v => v.active !== false)
      console.log(`Active vendors: ${activeVendors.length}`)
      
      // Prepare for upsert
      const vendorData = activeVendors.map(vendor => ({
        vendor_id: vendor.vendorId,
        name: vendor.vendorName,
        contact_name: vendor.contactName || null,
        email: vendor.email || null,
        phone: vendor.phone || null,
        address: vendor.address || null,
        notes: vendor.notes || null,
        is_active: true,
        last_synced: new Date().toISOString()
      }))
      
      // Batch upsert
      const batchSize = 50
      let updated = 0
      
      for (let i = 0; i < vendorData.length; i += batchSize) {
        const batch = vendorData.slice(i, i + batchSize)
        
        const { error } = await supabase
          .from('vendors')
          .upsert(batch, {
            onConflict: 'vendor_id',
            ignoreDuplicates: false
          })
        
        if (error) {
          console.error(`Batch ${i / batchSize + 1} error:`, error)
        } else {
          updated += batch.length
        }
      }
      
      // Log sync
      await supabase
        .from('sync_logs')
        .insert({
          sync_type: 'finale_vendors',
          status: 'success',
          synced_at: new Date().toISOString(),
          items_processed: vendors.length,
          items_updated: updated,
          metadata: {
            totalVendors: vendors.length,
            activeVendors: activeVendors.length
          }
        })
      
      return {
        success: true,
        totalVendors: vendors.length,
        activeVendors: activeVendors.length,
        updated,
        message: `Synced ${updated} vendors successfully`
      }
      
    } catch (error) {
      console.error('Vendor sync error:', error)
      
      await supabase
        .from('sync_logs')
        .insert({
          sync_type: 'finale_vendors',
          status: 'error',
          synced_at: new Date().toISOString(),
          errors: [error instanceof Error ? error.message : 'Unknown error']
        })
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Get vendor products (items supplied by a specific vendor)
  async getVendorProducts(vendorId: string): Promise<any[]> {
    try {
      // This would require querying products and filtering by supplier
      // For now, return empty array as this needs product-supplier mapping
      return []
    } catch (error) {
      console.error('Error fetching vendor products:', error)
      return []
    }
  }
}