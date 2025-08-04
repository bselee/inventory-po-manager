import { NextResponse } from 'next/server'
import { getFinaleConfig } from '@/app/lib/finale-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    console.log('[Test Party] Testing party/supplier endpoints...')
    
    const config = await getFinaleConfig()
    
    if (!config) {
      return NextResponse.json({ 
        error: 'Finale API credentials not configured' 
      }, { status: 400 })
    }

    const authHeader = `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`
    const baseUrl = `https://app.finaleinventory.com/${config.accountPath}/api`
    
    const results = {
      partyEndpoints: [],
      productWithSupplier: null,
      supplierMapping: []
    }
    
    // Test party endpoints
    const partyEndpoints = [
      'party',
      'partygroup',
      'supplier',
      'vendors'
    ]
    
    for (const endpoint of partyEndpoints) {
      try {
        const url = `${baseUrl}/${endpoint}?limit=5`
        console.log(`[Test Party] Testing ${endpoint} endpoint...`)
        
        const response = await fetch(url, {
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          results.partyEndpoints.push({
            endpoint,
            status: response.status,
            success: true,
            dataStructure: Array.isArray(data) ? 'array' : 'object',
            sampleData: Array.isArray(data) ? data[0] : data,
            count: Array.isArray(data) ? data.length : (data.partyId ? data.partyId.length : 0)
          })
        } else {
          results.partyEndpoints.push({
            endpoint,
            status: response.status,
            success: false
          })
        }
      } catch (error) {
        results.partyEndpoints.push({
          endpoint,
          error: error.message
        })
      }
    }
    
    // Now try to get a product with detailed info
    try {
      // First get a product
      const productUrl = `${baseUrl}/product?limit=1`
      const productResponse = await fetch(productUrl, {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      })
      
      if (productResponse.ok) {
        const productData = await productResponse.json()
        
        // If we have a product ID, try to get its detailed view
        if (productData.productId && productData.productId[0]) {
          const productId = productData.productId[0]
          const detailUrl = `${baseUrl}/product/${productId}`
          
          console.log(`[Test Party] Getting detailed view of product ${productId}...`)
          
          const detailResponse = await fetch(detailUrl, {
            headers: {
              'Authorization': authHeader,
              'Accept': 'application/json'
            }
          })
          
          if (detailResponse.ok) {
            const detailData = await detailResponse.json()
            results.productWithSupplier = {
              productId,
              hasSupplierData: false,
              supplierFields: []
            }
            
            // Look for supplier fields in detailed view
            const checkForSupplierData = (obj, prefix = '') => {
              Object.keys(obj).forEach(key => {
                const fullKey = prefix ? `${prefix}.${key}` : key
                const lowerKey = key.toLowerCase()
                
                if (lowerKey.includes('supplier') || 
                    lowerKey.includes('vendor') || 
                    lowerKey.includes('party') ||
                    key === 'supplierProductId' ||
                    key === 'supplierPartyUrl') {
                  results.productWithSupplier.supplierFields.push({
                    field: fullKey,
                    value: obj[key]
                  })
                  results.productWithSupplier.hasSupplierData = true
                }
                
                if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                  checkForSupplierData(obj[key], fullKey)
                }
              })
            }
            
            checkForSupplierData(detailData)
            results.productWithSupplier.fullData = detailData
          }
        }
      }
    } catch (error) {
      console.error('[Test Party] Error getting product details:', error)
    }
    
    // Analyze results
    const workingPartyEndpoint = results.partyEndpoints.find(ep => ep.success)
    const recommendation = []
    
    if (workingPartyEndpoint) {
      recommendation.push(`Found working party endpoint: ${workingPartyEndpoint.endpoint}`)
    }
    
    if (results.productWithSupplier?.hasSupplierData) {
      recommendation.push(`Product detail view contains supplier fields: ${results.productWithSupplier.supplierFields.map(f => f.field).join(', ')}`)
    } else {
      recommendation.push('Supplier data may need to be fetched separately or through a different API pattern')
    }
    
    return NextResponse.json({
      success: true,
      results,
      recommendation: recommendation.join('. ')
    })
    
  } catch (error) {
    console.error('[Test Party] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}