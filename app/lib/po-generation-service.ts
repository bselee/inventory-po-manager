/**
 * Purchase Order Generation Service
 * Handles intelligent PO creation based on inventory levels and sales velocity
 */

import { supabase } from './supabase'

interface InventoryItem {
  id: string
  sku: string
  product_name: string
  current_stock: number
  reorder_point: number
  reorder_quantity: number
  unit_cost: number
  sales_velocity_30d: number
  sales_velocity_90d: number
  vendor_id?: string
  vendor_name?: string
  days_until_stockout?: number
  lead_time_days?: number
}

interface POLineItem {
  sku: string
  product_name: string
  quantity: number
  unit_cost: number
  total_cost: number
  current_stock: number
  reorder_point: number
  sales_velocity: number
  days_until_stockout: number
  urgency: 'critical' | 'high' | 'medium' | 'low'
}

interface POSuggestion {
  vendor_id?: string
  vendor_name: string
  vendor_email?: string
  items: POLineItem[]
  total_amount: number
  total_items: number
  urgency_level: 'critical' | 'high' | 'medium' | 'low'
  estimated_stockout_days: number
}

export class POGenerationService {
  /**
   * Calculate Economic Order Quantity (EOQ)
   * EOQ = sqrt((2 * D * S) / H)
   * Where:
   * D = Annual demand
   * S = Order cost (estimated)
   * H = Holding cost per unit per year
   */
  private calculateEOQ(
    annualDemand: number,
    orderCost: number = 50, // Default order cost
    holdingCostRate: number = 0.25 // 25% of unit cost
  ): number {
    if (annualDemand <= 0) return 0
    
    const eoq = Math.sqrt((2 * annualDemand * orderCost) / holdingCostRate)
    return Math.ceil(eoq)
  }

  /**
   * Calculate suggested order quantity based on multiple factors
   */
  private calculateSuggestedQuantity(item: InventoryItem): number {
    // If no sales velocity, use reorder quantity
    if (!item.sales_velocity_30d || item.sales_velocity_30d === 0) {
      return item.reorder_quantity || 0
    }

    // Calculate annual demand based on 30-day velocity
    const annualDemand = item.sales_velocity_30d * 365

    // Calculate EOQ
    const holdingCost = (item.unit_cost || 10) * 0.25 // 25% holding cost
    const eoq = this.calculateEOQ(annualDemand, 50, holdingCost)

    // Calculate coverage days (aim for 30-60 days of inventory)
    const targetCoverageDays = 45
    const coverageQuantity = Math.ceil(item.sales_velocity_30d * targetCoverageDays)

    // Factor in lead time
    const leadTimeDays = item.lead_time_days || 7
    const leadTimeBuffer = Math.ceil(item.sales_velocity_30d * leadTimeDays * 1.5) // 50% buffer

    // Calculate safety stock (based on demand variability)
    const velocityVariance = Math.abs(item.sales_velocity_30d - (item.sales_velocity_90d || item.sales_velocity_30d))
    const safetyStock = Math.ceil(velocityVariance * leadTimeDays * 2)

    // Determine final quantity - take the maximum of different calculations
    const quantities = [
      eoq,
      coverageQuantity,
      item.reorder_quantity || 0,
      item.reorder_point - item.current_stock + leadTimeBuffer + safetyStock
    ]

    // Use the median value for balanced ordering
    quantities.sort((a, b) => a - b)
    const medianIndex = Math.floor(quantities.length / 2)
    let suggestedQuantity = quantities[medianIndex]

    // Round to reasonable ordering units
    if (suggestedQuantity > 100) {
      suggestedQuantity = Math.ceil(suggestedQuantity / 10) * 10 // Round to nearest 10
    } else if (suggestedQuantity > 500) {
      suggestedQuantity = Math.ceil(suggestedQuantity / 50) * 50 // Round to nearest 50
    }

    return Math.max(1, suggestedQuantity) // At least 1 unit
  }

  /**
   * Determine urgency level based on days until stockout
   */
  private determineUrgency(daysUntilStockout: number | undefined): 'critical' | 'high' | 'medium' | 'low' {
    if (!daysUntilStockout || daysUntilStockout <= 7) return 'critical'
    if (daysUntilStockout <= 14) return 'high'
    if (daysUntilStockout <= 30) return 'medium'
    return 'low'
  }

  /**
   * Get items that need reordering
   */
  async getItemsNeedingReorder(): Promise<InventoryItem[]> {
    try {
      // Fetch items where current stock is at or below reorder point
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          id,
          sku,
          product_name,
          current_stock,
          reorder_point,
          reorder_quantity,
          unit_cost,
          sales_velocity_30d,
          sales_velocity_90d,
          vendor_id,
          vendor_name,
          lead_time_days,
          active,
          discontinued
        `)
        .eq('active', true)
        .eq('discontinued', false)
        .or('current_stock.lte.reorder_point,and(current_stock.lt.50,sales_velocity_30d.gt.0)')
        .order('current_stock', { ascending: true })

      if (error) throw error

      // Calculate days until stockout for each item
      const itemsWithStockout = (data || []).map(item => {
        const daysUntilStockout = item.sales_velocity_30d > 0
          ? Math.floor(item.current_stock / item.sales_velocity_30d)
          : item.current_stock > 0 ? 999 : 0

        return {
          ...item,
          days_until_stockout: daysUntilStockout
        }
      })

      // Sort by urgency (days until stockout)
      return itemsWithStockout.sort((a, b) => 
        (a.days_until_stockout || 0) - (b.days_until_stockout || 0)
      )
    } catch (error) {
      console.error('Error fetching items needing reorder:', error)
      throw error
    }
  }

  /**
   * Generate PO suggestions grouped by vendor
   */
  async generatePOSuggestions(): Promise<POSuggestion[]> {
    try {
      const itemsNeedingReorder = await this.getItemsNeedingReorder()
      
      if (itemsNeedingReorder.length === 0) {
        return []
      }

      // Get vendor information
      const { data: vendors } = await supabase
        .from('vendors')
        .select('id, name, contact_email, lead_time_days')
        .eq('active', true)

      const vendorMap = new Map(vendors?.map(v => [v.id, v]) || [])
      const vendorNameMap = new Map(vendors?.map(v => [v.name.toLowerCase(), v]) || [])

      // Group items by vendor
      const vendorGroups = new Map<string, InventoryItem[]>()
      
      for (const item of itemsNeedingReorder) {
        let vendorKey = 'unknown'
        
        if (item.vendor_id) {
          vendorKey = item.vendor_id
        } else if (item.vendor_name) {
          // Try to match vendor by name
          const vendor = vendorNameMap.get(item.vendor_name.toLowerCase())
          if (vendor) {
            vendorKey = vendor.id
          } else {
            vendorKey = item.vendor_name
          }
        }

        if (!vendorGroups.has(vendorKey)) {
          vendorGroups.set(vendorKey, [])
        }
        vendorGroups.get(vendorKey)!.push(item)
      }

      // Generate PO suggestions for each vendor
      const suggestions: POSuggestion[] = []
      
      for (const [vendorKey, items] of vendorGroups) {
        const vendor = vendorMap.get(vendorKey)
        const vendorName = vendor?.name || vendorKey
        
        const poItems: POLineItem[] = items.map(item => {
          const suggestedQuantity = this.calculateSuggestedQuantity(item)
          const urgency = this.determineUrgency(item.days_until_stockout)
          
          return {
            sku: item.sku,
            product_name: item.product_name,
            quantity: suggestedQuantity,
            unit_cost: item.unit_cost || 0,
            total_cost: suggestedQuantity * (item.unit_cost || 0),
            current_stock: item.current_stock,
            reorder_point: item.reorder_point,
            sales_velocity: item.sales_velocity_30d || 0,
            days_until_stockout: item.days_until_stockout || 999,
            urgency
          }
        })

        // Calculate total and determine overall urgency
        const totalAmount = poItems.reduce((sum, item) => sum + item.total_cost, 0)
        const criticalCount = poItems.filter(i => i.urgency === 'critical').length
        const highCount = poItems.filter(i => i.urgency === 'high').length
        
        let overallUrgency: 'critical' | 'high' | 'medium' | 'low' = 'low'
        if (criticalCount > 0) overallUrgency = 'critical'
        else if (highCount > 0) overallUrgency = 'high'
        else if (poItems.some(i => i.urgency === 'medium')) overallUrgency = 'medium'

        // Calculate minimum days until stockout
        const minStockoutDays = Math.min(...poItems.map(i => i.days_until_stockout))

        suggestions.push({
          vendor_id: vendor?.id,
          vendor_name: vendorName,
          vendor_email: vendor?.contact_email,
          items: poItems,
          total_amount: totalAmount,
          total_items: poItems.length,
          urgency_level: overallUrgency,
          estimated_stockout_days: minStockoutDays
        })
      }

      // Sort suggestions by urgency
      return suggestions.sort((a, b) => {
        const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 }
        return urgencyOrder[a.urgency_level] - urgencyOrder[b.urgency_level]
      })
    } catch (error) {
      console.error('Error generating PO suggestions:', error)
      throw error
    }
  }

  /**
   * Create a purchase order from a suggestion
   */
  async createPurchaseOrder(suggestion: POSuggestion, userId?: string) {
    try {
      // Generate PO number
      const timestamp = Date.now().toString().slice(-6)
      const year = new Date().getFullYear()
      const poNumber = `PO-${year}-${timestamp}`

      // Prepare items for storage
      const items = suggestion.items.map(item => ({
        sku: item.sku,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_cost: item.total_cost,
        notes: `Reorder: Stock ${item.current_stock}/${item.reorder_point}, Velocity: ${item.sales_velocity}/day`
      }))

      // Create the purchase order
      const { data, error } = await supabase
        .from('purchase_orders')
        .insert({
          po_number: poNumber,
          vendor_id: suggestion.vendor_id,
          vendor_name: suggestion.vendor_name,
          vendor_email: suggestion.vendor_email,
          status: 'draft',
          items: items,
          total_amount: suggestion.total_amount,
          urgency_level: suggestion.urgency_level,
          created_by: userId,
          notes: `Auto-generated PO. Urgency: ${suggestion.urgency_level}. Min stockout: ${suggestion.estimated_stockout_days} days.`
        })
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error creating purchase order:', error)
      throw error
    }
  }

  /**
   * Get existing draft POs to avoid duplicates
   */
  async getDraftPurchaseOrders() {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('status', 'draft')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching draft POs:', error)
      throw error
    }
  }
}

export default POGenerationService