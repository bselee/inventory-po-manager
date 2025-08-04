import { NextResponse } from 'next/server'
import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    console.log('[Test Product Structure] Starting test...')
    
    // Get Finale config
    const config = await getFinaleConfig()
    
    if (!config) {
      return NextResponse.json({ 
        error: 'Finale API credentials not configured' 
      }, { status: 400 })
    }

    // Initialize Finale API service
    const finaleApi = new FinaleApiService(config)
    
    // Get raw product data
    const authHeader = `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`
    const baseUrl = `https://app.finaleinventory.com/${config.accountPath}/api`
    const productUrl = `${baseUrl}/product?limit=3`
    
    console.log('[Test Product Structure] Fetching products from:', productUrl)
    
    const response = await fetch(productUrl, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ 
        error: `Finale API error: ${response.status}`,
        details: errorText.substring(0, 500)
      }, { status: response.status })
    }

    const rawData = await response.json()
    
    // Analyze the response structure
    const analysis = {
      isArray: Array.isArray(rawData),
      hasProductId: !!rawData.productId,
      isParallelArray: rawData.productId && Array.isArray(rawData.productId),
      columnNames: Object.keys(rawData),
      productCount: rawData.productId ? rawData.productId.length : 0
    }
    
    // Check for supplier-related columns
    const supplierColumns = Object.keys(rawData).filter(key => 
      key.toLowerCase().includes('supplier') || 
      key.toLowerCase().includes('vendor') ||
      key.toLowerCase().includes('party') ||
      key.toLowerCase().includes('manufacturer')
    )
    
    // If we have parallel arrays, reconstruct first product
    let firstProduct = null
    if (analysis.isParallelArray && rawData.productId.length > 0) {
      firstProduct = {}
      Object.keys(rawData).forEach(key => {
        if (Array.isArray(rawData[key]) && rawData[key].length > 0) {
          firstProduct[key] = rawData[key][0]
        }
      })
    }
    
    // Check specific supplier fields
    const supplierFieldAnalysis = {}
    if (firstProduct) {
      const fieldsToCheck = [
        'supplierList', 'supplier', 'suppliers', 'vendor', 'vendors',
        'vendorName', 'vendorList', 'primarySupplier', 'primaryVendor',
        'partyList', 'party', 'supplierName', 'primarySupplierName',
        'manufacturerName', 'manufacturer', 'supplierPartyName'
      ]
      
      fieldsToCheck.forEach(field => {
        if (field in firstProduct) {
          supplierFieldAnalysis[field] = {
            exists: true,
            value: firstProduct[field],
            type: typeof firstProduct[field],
            isArray: Array.isArray(firstProduct[field]),
            length: Array.isArray(firstProduct[field]) ? firstProduct[field].length : null
          }
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      analysis,
      supplierColumns,
      supplierFieldAnalysis,
      firstProduct,
      rawStructure: {
        columnNames: Object.keys(rawData),
        firstThreeProducts: analysis.isParallelArray ? {
          productIds: rawData.productId?.slice(0, 3),
          productNames: rawData.productName?.slice(0, 3),
          productSkus: rawData.productSku?.slice(0, 3)
        } : null
      }
    })
    
  } catch (error) {
    console.error('[Test Product Structure] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}