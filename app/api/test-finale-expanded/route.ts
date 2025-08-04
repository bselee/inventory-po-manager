import { NextResponse } from 'next/server'
import { getFinaleConfig } from '@/app/lib/finale-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    console.log('[Test Expanded] Testing Finale API with expansion parameters...')
    
    // Get Finale config
    const config = await getFinaleConfig()
    
    if (!config) {
      return NextResponse.json({ 
        error: 'Finale API credentials not configured' 
      }, { status: 400 })
    }

    const authHeader = `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`
    const baseUrl = `https://app.finaleinventory.com/${config.accountPath}/api`
    
    // Try different expansion patterns
    const expansionTests = [
      {
        name: 'Standard product',
        url: `${baseUrl}/product?limit=2`
      },
      {
        name: 'With expand=supplier',
        url: `${baseUrl}/product?limit=2&expand=supplier`
      },
      {
        name: 'With expand=supplierList',
        url: `${baseUrl}/product?limit=2&expand=supplierList`
      },
      {
        name: 'With expand=all',
        url: `${baseUrl}/product?limit=2&expand=all`
      },
      {
        name: 'With include=supplier',
        url: `${baseUrl}/product?limit=2&include=supplier`
      },
      {
        name: 'With fields expansion',
        url: `${baseUrl}/product?limit=2&fields=productId,internalName,supplier1,supplier2,vendor1,vendor2,supplierName,vendorName`
      }
    ]
    
    const results = []
    
    for (const test of expansionTests) {
      console.log(`[Test Expanded] Testing: ${test.name}`)
      
      try {
        const response = await fetch(test.url, {
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json'
          }
        })

        const responseText = await response.text()
        let data = null
        let parseError = null
        
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          parseError = e.message
        }
        
        // Analyze the response
        let analysis = {
          hasSupplierData: false,
          supplierFields: [],
          sampleProduct: null
        }
        
        if (data && !parseError) {
          // Check for any supplier-related fields
          const checkForSupplierFields = (obj, prefix = '') => {
            Object.keys(obj).forEach(key => {
              const fullKey = prefix ? `${prefix}.${key}` : key
              const lowerKey = key.toLowerCase()
              
              if (lowerKey.includes('supplier') || 
                  lowerKey.includes('vendor') || 
                  lowerKey.includes('manufacturer') ||
                  key === 'supplier1' || 
                  key === 'supplier2' ||
                  key === 'vendor1' ||
                  key === 'vendor2') {
                analysis.supplierFields.push({
                  field: fullKey,
                  value: obj[key]
                })
                analysis.hasSupplierData = true
              }
              
              // Recurse into objects
              if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                checkForSupplierFields(obj[key], fullKey)
              }
            })
          }
          
          // If it's the parallel array format
          if (data.productId && Array.isArray(data.productId)) {
            checkForSupplierFields(data)
            
            // Reconstruct first product
            if (data.productId.length > 0) {
              analysis.sampleProduct = {}
              Object.keys(data).forEach(key => {
                if (Array.isArray(data[key]) && data[key].length > 0) {
                  analysis.sampleProduct[key] = data[key][0]
                }
              })
            }
          }
          // If it's a direct array of products
          else if (Array.isArray(data) && data.length > 0) {
            data.forEach(product => checkForSupplierFields(product))
            analysis.sampleProduct = data[0]
          }
          // If it's an object response
          else if (typeof data === 'object') {
            checkForSupplierFields(data)
          }
        }
        
        results.push({
          test: test.name,
          url: test.url.replace(authHeader, '***'),
          status: response.status,
          success: response.ok,
          parseError,
          analysis,
          responsePreview: responseText.substring(0, 200)
        })
        
      } catch (error) {
        results.push({
          test: test.name,
          url: test.url.replace(authHeader, '***'),
          error: error.message
        })
      }
    }
    
    // Find the test with the most supplier data
    const bestResult = results.reduce((best, current) => {
      const currentFields = current.analysis?.supplierFields?.length || 0
      const bestFields = best?.analysis?.supplierFields?.length || 0
      return currentFields > bestFields ? current : best
    }, null)
    
    return NextResponse.json({
      success: true,
      results,
      recommendation: bestResult?.analysis?.hasSupplierData ? 
        `Use "${bestResult.test}" - found ${bestResult.analysis.supplierFields.length} supplier fields` :
        'No expansion parameter revealed supplier data. It may be in custom fields or require different API access.',
      bestResult
    })
    
  } catch (error) {
    console.error('[Test Expanded] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}