// Inventory forecasting based on sales velocity
import { supabase } from './supabase'

interface ForecastResult {
  sku: string
  productName: string
  currentStock: number
  avgDailySales: number
  daysUntilStockout: number
  recommendedReorderDate: Date
  recommendedOrderQuantity: number
}

export class InventoryForecastService {
  
  // Calculate sales velocity and forecast stockouts
  async generateForecast(days: number = 30): Promise<ForecastResult[]> {
    try {
      // Get inventory items with stock
      const { data: inventory } = await supabase
        .from('inventory_items')
        .select('*')
        .gt('stock', 0)
        .order('stock')
      
      if (!inventory || inventory.length === 0) {
        return []
      }
      
      const forecasts: ForecastResult[] = []
      
      for (const item of inventory) {
        // Calculate average daily sales
        // Using the sales_last_30_days field if available
        const avgDailySales = item.sales_last_30_days 
          ? item.sales_last_30_days / 30 
          : this.estimateSalesVelocity(item)
        
        if (avgDailySales > 0) {
          // Calculate days until stockout
          const daysUntilStockout = Math.floor(item.stock / avgDailySales)
          
          // Calculate recommended reorder date (order when 7 days of stock left)
          const reorderBuffer = 7 // days
          const daysUntilReorder = Math.max(0, daysUntilStockout - reorderBuffer)
          const recommendedReorderDate = new Date()
          recommendedReorderDate.setDate(recommendedReorderDate.getDate() + daysUntilReorder)
          
          // Calculate recommended order quantity (30 days of stock + buffer)
          const recommendedOrderQuantity = Math.ceil(avgDailySales * 45) // 45 days of stock
          
          forecasts.push({
            sku: item.sku,
            productName: item.product_name || item.sku,
            currentStock: item.stock,
            avgDailySales: Math.round(avgDailySales * 100) / 100,
            daysUntilStockout,
            recommendedReorderDate,
            recommendedOrderQuantity
          })
        }
      }
      
      // Sort by days until stockout (most urgent first)
      return forecasts.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout)
      
    } catch (error) {
      logError('Forecast error:', error)
      return []
    }
  }
  
  // Estimate sales velocity based on stock levels and reorder points
  private estimateSalesVelocity(item: any): number {
    // If we have reorder point, estimate based on that
    if (item.reorder_point > 0) {
      // Assume reorder point is set for 2 weeks of stock
      return item.reorder_point / 14
    }
    
    // Otherwise, make a conservative estimate
    // Assume 10% of stock sells per month
    return (item.stock * 0.1) / 30
  }
  
  // Get items that need reordering soon
  async getCriticalReorders(daysAhead: number = 7): Promise<ForecastResult[]> {
    const forecasts = await this.generateForecast()
    
    // Filter to items that need reordering within specified days
    return forecasts.filter(f => f.daysUntilStockout <= daysAhead + 7) // Add 7 day buffer
  }
  
  // Update sales velocity based on actual sales data
  async updateSalesVelocity(sku: string, soldQuantity: number, periodDays: number) {
    try {
      const dailySales = soldQuantity / periodDays
      
      // Get current item
      const { data: item } = await supabase
        .from('inventory_items')
        .select('sales_last_30_days, sales_last_90_days')
        .eq('sku', sku)
        .single()
      
      if (item) {
        // Update sales tracking
        await supabase
          .from('inventory_items')
          .update({
            sales_last_30_days: Math.round(dailySales * 30),
            sales_last_90_days: Math.round(dailySales * 90),
            last_sales_update: new Date().toISOString()
          })
          .eq('sku', sku)
      }
    } catch (error) {
      logError('Error updating sales velocity:', error)
    }
  }
}