import { NextResponse } from 'next/server'
import { getFinaleConfig } from '@/app/lib/finale-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    console.log('[Test Suppliers] Looking for products with supplier data...')
    
    // Get Finale config
    const config = await getFinaleConfig()
    
    if (!config) {
      return NextResponse.json({ 
        error: 'Finale API credentials not configured' 
      }, { status: 400 })
    }

    const authHeader = `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`
    const baseUrl = `https://app.finaleinventory.com/${config.accountPath}/api`
    
    // Get more products to find ones with suppliers
    const productUrl = `${baseUrl}/product?limit=100`
    
    console.log('[Test Suppliers] Fetching 100 products to analyze supplier data...')
    
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
    
    // Find products with non-empty supplier data
    const productsWithSuppliers = []
    const supplierFieldAnalysis = {
      totalProducts: 0,
      productsWithSupplierList: 0,
      productsWithNonEmptySuppliers: 0,
      supplierFieldNames: new Set(),
      sampleSupplierData: []
    }
    
    if (rawData.productId && Array.isArray(rawData.productId)) {
      supplierFieldAnalysis.totalProducts = rawData.productId.length
      
      // Check each product
      for (let i = 0; i < rawData.productId.length; i++) {
        const hasSupplierList = rawData.supplierList && 
                               rawData.supplierList[i] !== undefined && 
                               rawData.supplierList[i] !== null
        
        if (hasSupplierList) {
          supplierFieldAnalysis.productsWithSupplierList++
          
          const supplierData = rawData.supplierList[i]
          const isNonEmpty = Array.isArray(supplierData) ? 
                            supplierData.length > 0 : 
                            (typeof supplierData === 'object' && Object.keys(supplierData).length > 0)
          
          if (isNonEmpty) {
            supplierFieldAnalysis.productsWithNonEmptySuppliers++
            
            // Reconstruct this product
            const product = {}
            Object.keys(rawData).forEach(key => {
              if (Array.isArray(rawData[key]) && rawData[key][i] !== undefined) {
                product[key] = rawData[key][i]
              }
            })
            
            productsWithSuppliers.push({
              productId: product['productId'],
              productName: product['internalName'],
              supplierData: supplierData
            })
            
            // Analyze supplier field structure
            if (Array.isArray(supplierData) && supplierData.length > 0) {
              supplierData.forEach(supplier => {
                if (typeof supplier === 'object' && supplier !== null) {
                  Object.keys(supplier).forEach(key => {
                    supplierFieldAnalysis.supplierFieldNames.add(key)
                  })
                }
              })
              
              // Keep first few as samples
              if (supplierFieldAnalysis.sampleSupplierData.length < 3) {
                supplierFieldAnalysis.sampleSupplierData.push({
                  productId: product['productId'],
                  suppliers: supplierData
                })
              }
            }
          }
        }
      }
    }
    
    // Look for any fields containing "supplier1" or similar patterns
    const supplier1Fields = []
    Object.keys(rawData).forEach(fieldName => {
      if (/supplier\d+/i.test(fieldName) || /vendor\d+/i.test(fieldName)) {
        supplier1Fields.push({
          fieldName,
          hasData: Array.isArray(rawData[fieldName]) ? 
                  rawData[fieldName].some(v => v !== null && v !== '' && v !== undefined) :
                  false
        })
      }
    })
    
    return NextResponse.json({
      success: true,
      analysis: {
        ...supplierFieldAnalysis,
        supplierFieldNames: Array.from(supplierFieldAnalysis.supplierFieldNames)
      },
      productsWithSuppliers: productsWithSuppliers.slice(0, 5), // First 5 products with suppliers
      supplier1Fields,
      recommendation: supplierFieldAnalysis.productsWithNonEmptySuppliers > 0 ?
        `Found ${supplierFieldAnalysis.productsWithNonEmptySuppliers} products with supplier data! Check the supplier field structure.` :
        'No products found with actual supplier data. The supplierList arrays are empty.'
    })
    
  } catch (error) {
    console.error('[Test Suppliers] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}