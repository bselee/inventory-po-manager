/**
 * Shared inventory calculation utilities
 * These functions provide consistent business logic calculations across the application
 */

import { InventoryItem } from '@/app/types'

/**
 * Calculate the daily sales velocity for an inventory item
 * @param item - The inventory item to calculate velocity for
 * @returns Units sold per day (30-day average)
 */
export function calculateSalesVelocity(item: InventoryItem): number {
  const sales30 = item.sales_last_30_days || 0
  return sales30 / 30 // units per day
}

/**
 * Calculate the estimated days until an item runs out of stock
 * @param item - The inventory item to calculate stockout for
 * @returns Number of days until stockout (Infinity if velocity is 0)
 */
export function calculateDaysUntilStockout(item: InventoryItem): number {
  const velocity = calculateSalesVelocity(item)
  if (velocity === 0) return Infinity
  return Math.floor(item.current_stock / velocity)
}

/**
 * Determine the stock status level for an item
 * @param item - The inventory item to evaluate
 * @returns Stock status level: 'critical', 'low', 'adequate', or 'overstocked'
 */
export function determineStockStatus(item: InventoryItem): 'critical' | 'low' | 'adequate' | 'overstocked' {
  if (item.current_stock === 0) return 'critical'
  
  const velocity = calculateSalesVelocity(item)
  const daysLeft = calculateDaysUntilStockout(item)
  const minStock = item.minimum_stock || item.reorder_point || 0
  
  if (daysLeft <= 7) return 'critical'
  if (item.current_stock <= minStock || daysLeft <= 30) return 'low'
  if (item.maximum_stock && item.current_stock > item.maximum_stock * 0.8) return 'overstocked'
  return 'adequate'
}

/**
 * Calculate the demand trend based on 30 vs 90 day sales comparison
 * @param item - The inventory item to analyze
 * @returns Trend direction: 'increasing', 'decreasing', or 'stable'
 */
export function calculateTrend(item: InventoryItem): 'increasing' | 'decreasing' | 'stable' {
  const sales30 = item.sales_last_30_days || 0
  const sales90 = item.sales_last_90_days || 0
  const recent30DayAvg = sales30 / 30
  const previous60DayAvg = (sales90 - sales30) / 60
  
  const changeRatio = previous60DayAvg === 0 ? 0 : (recent30DayAvg - previous60DayAvg) / previous60DayAvg
  
  if (changeRatio > 0.1) return 'increasing'
  if (changeRatio < -0.1) return 'decreasing'
  return 'stable'
}

/**
 * Determine if an item should be reordered based on stock status and velocity
 * @param item - The inventory item to evaluate
 * @returns Whether the item should be reordered
 */
export function shouldReorder(item: InventoryItem): boolean {
  const status = determineStockStatus(item)
  const daysLeft = calculateDaysUntilStockout(item)
  
  return status === 'critical' || 
         (status === 'low' && daysLeft <= 14)
}

/**
 * Enhance inventory items with calculated fields
 * @param rawItems - Array of raw inventory items from database
 * @returns Array of items enhanced with calculated fields
 */
export function enhanceItemsWithCalculations(rawItems: InventoryItem[]): InventoryItem[] {
  return rawItems.map(item => ({
    ...item,
    sales_velocity: calculateSalesVelocity(item),
    days_until_stockout: calculateDaysUntilStockout(item),
    stock_status_level: determineStockStatus(item),
    trend: calculateTrend(item),
    reorder_recommended: shouldReorder(item)
  }))
}

/**
 * Get stock status display properties
 * @param item - The inventory item
 * @returns Object with text and color for display
 */
export function getStockStatusDisplay(item: InventoryItem): { text: string; color: string } {
  const status = item.stock_status_level || determineStockStatus(item)
  const statusMap = {
    critical: { text: 'Critical', color: 'red' },
    low: { text: 'Low Stock', color: 'yellow' },
    adequate: { text: 'In Stock', color: 'green' },
    overstocked: { text: 'Overstocked', color: 'blue' }
  }
  return statusMap[status] || statusMap.adequate
}

/**
 * Calculate inventory value for an item
 * @param item - The inventory item
 * @returns The total value of stock on hand
 */
export function calculateInventoryValue(item: InventoryItem): number {
  const stock = item.current_stock || 0
  const price = item.unit_price || item.cost || 0
  return stock * price
}

/**
 * Format inventory value for display
 * @param item - The inventory item or numeric value
 * @returns Formatted string with dollar sign
 */
export function formatInventoryValue(item: InventoryItem): string;
export function formatInventoryValue(value: number): string;
export function formatInventoryValue(itemOrValue: InventoryItem | number): string {
  let value: number;
  
  if (typeof itemOrValue === 'number') {
    value = itemOrValue;
  } else {
    value = calculateInventoryValue(itemOrValue);
  }
  
  return isNaN(value) || !isFinite(value) ? '$0.00' : `$${value.toFixed(2)}`;
}

/**
 * Get sales velocity category
 * @param velocity - The sales velocity value
 * @returns Category: 'fast', 'medium', 'slow', or 'dead'
 */
export function getVelocityCategory(velocity: number): 'fast' | 'medium' | 'slow' | 'dead' {
  if (velocity > 1) return 'fast'
  if (velocity > 0.1) return 'medium'
  if (velocity > 0) return 'slow'
  return 'dead'
}

/**
 * Get stock days category
 * @param days - Number of days of stock remaining
 * @returns Category for filtering
 */
export function getStockDaysCategory(days: number): string {
  if (days <= 30) return 'under-30'
  if (days <= 60) return '30-60'
  if (days <= 90) return '60-90'
  if (days <= 180) return '90-180'
  return 'over-180'
}