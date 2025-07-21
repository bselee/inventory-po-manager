import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const checkFinale = searchParams.get('checkFinale') === 'true'
    const sampleSize = parseInt(searchParams.get('sampleSize') || '10')
    
    const validationReport = {
      timestamp: new Date().toISOString(),
      issues: [] as any[],
      stats: {
        totalItems: 0,
        itemsWithIssues: 0,
        missingData: 0,
        negativeStock: 0,
        duplicateSkus: 0,
        orphanedItems: 0
      },
      samples: [] as any[]
    }
    
    // Get total count
    const { count: totalCount } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
    
    validationReport.stats.totalItems = totalCount || 0
    
    // Check for missing required fields
    const { data: missingData, count: missingCount } = await supabase
      .from('inventory_items')
      .select('id, sku, product_name, stock')
      .or('sku.is.null,product_name.is.null,product_name.eq.')
      .limit(sampleSize)
    
    if (missingCount) {
      validationReport.stats.missingData = missingCount
      validationReport.issues.push({
        type: 'missing_data',
        severity: 'high',
        count: missingCount,
        description: 'Items with missing SKU or product name',
        samples: missingData
      })
    }
    
    // Check for negative stock
    const { data: negativeStock, count: negativeCount } = await supabase
      .from('inventory_items')
      .select('id, sku, product_name, stock')
      .lt('stock', 0)
      .limit(sampleSize)
    
    if (negativeCount) {
      validationReport.stats.negativeStock = negativeCount
      validationReport.issues.push({
        type: 'negative_stock',
        severity: 'medium',
        count: negativeCount,
        description: 'Items with negative stock levels',
        samples: negativeStock
      })
    }
    
    // Check for duplicate SKUs
    const { data: duplicates } = await supabase.rpc('find_duplicate_skus')
    
    if (duplicates && duplicates.length > 0) {
      validationReport.stats.duplicateSkus = duplicates.length
      validationReport.issues.push({
        type: 'duplicate_skus',
        severity: 'critical',
        count: duplicates.length,
        description: 'Duplicate SKUs found',
        samples: duplicates.slice(0, sampleSize)
      })
    }
    
    // Check for items not updated in 30+ days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: staleItems, count: staleCount } = await supabase
      .from('inventory_items')
      .select('id, sku, product_name, last_updated')
      .lt('last_updated', thirtyDaysAgo.toISOString())
      .limit(sampleSize)
    
    if (staleCount) {
      validationReport.issues.push({
        type: 'stale_data',
        severity: 'low',
        count: staleCount,
        description: 'Items not updated in 30+ days',
        samples: staleItems
      })
    }
    
    // If requested, validate against Finale
    if (checkFinale) {
      const config = await getFinaleConfig()
      
      if (!config) {
        validationReport.issues.push({
          type: 'finale_config',
          severity: 'high',
          description: 'Finale API not configured - cannot validate against source'
        })
      } else {
        try {
          const finaleApi = new FinaleApiService(config)
          
          // Get a sample of SKUs to validate
          const { data: sampleItems } = await supabase
            .from('inventory_items')
            .select('sku, stock, cost')
            .limit(sampleSize)
          
          if (sampleItems) {
            // Fetch current data from Finale
            const finaleProducts = await finaleApi.getInventoryData(null)
            const finaleMap = new Map(
              finaleProducts.map(p => [p.productSku, p])
            )
            
            const mismatches = []
            for (const item of sampleItems) {
              const finaleProduct = finaleMap.get(item.sku)
              if (finaleProduct) {
                const stockDiff = Math.abs(item.stock - finaleProduct.quantityOnHand)
                const costDiff = Math.abs((item.cost || 0) - (finaleProduct.averageCost || 0))
                
                if (stockDiff > 0 || costDiff > 0.01) {
                  mismatches.push({
                    sku: item.sku,
                    local: { stock: item.stock, cost: item.cost },
                    finale: { 
                      stock: finaleProduct.quantityOnHand, 
                      cost: finaleProduct.averageCost 
                    },
                    stockDiff,
                    costDiff: costDiff.toFixed(2)
                  })
                }
              } else {
                validationReport.stats.orphanedItems++
              }
            }
            
            if (mismatches.length > 0) {
              validationReport.issues.push({
                type: 'data_mismatch',
                severity: 'medium',
                count: mismatches.length,
                description: 'Data discrepancies between local and Finale',
                samples: mismatches
              })
            }
          }
        } catch (error) {
          validationReport.issues.push({
            type: 'finale_validation_error',
            severity: 'medium',
            description: `Could not validate against Finale: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
        }
      }
    }
    
    // Calculate total items with issues
    validationReport.stats.itemsWithIssues = 
      validationReport.stats.missingData +
      validationReport.stats.negativeStock +
      validationReport.stats.duplicateSkus +
      validationReport.stats.orphanedItems
    
    // Determine overall health
    const healthScore = validationReport.stats.totalItems > 0
      ? Math.round(((validationReport.stats.totalItems - validationReport.stats.itemsWithIssues) / validationReport.stats.totalItems) * 100)
      : 0
    
    return NextResponse.json({
      ...validationReport,
      healthScore,
      recommendation: healthScore >= 95 
        ? 'Data integrity is excellent'
        : healthScore >= 80
        ? 'Data integrity is good, minor issues to address'
        : healthScore >= 60
        ? 'Data integrity needs attention'
        : 'Critical data integrity issues detected'
    })
  } catch (error) {
    console.error('Validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate data' },
      { status: 500 }
    )
  }
}

// Helper RPC function to find duplicate SKUs (add to your database)
// CREATE OR REPLACE FUNCTION find_duplicate_skus()
// RETURNS TABLE(sku text, count bigint, ids uuid[])
// LANGUAGE plpgsql
// AS $$
// BEGIN
//   RETURN QUERY
//   SELECT 
//     i.sku,
//     COUNT(*)::bigint as count,
//     ARRAY_AGG(i.id) as ids
//   FROM inventory_items i
//   WHERE i.sku IS NOT NULL
//   GROUP BY i.sku
//   HAVING COUNT(*) > 1;
// END;
// $$;