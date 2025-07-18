import { NextResponse } from 'next/server'
import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'

export async function GET() {
  try {
    // Step 1: Get config
    const config = await getFinaleConfig()
    if (!config) {
      return NextResponse.json({ error: 'No config', step: 1 })
    }
    
    // Step 2: Create service
    const finaleApi = new FinaleApiService(config)
    
    // Step 3: Test connection
    const testUrl = `https://app.finaleinventory.com/${config.accountPath}/api/product?limit=1`
    const authHeader = `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`
    
    const response = await fetch(testUrl, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: 'Connection failed', 
        step: 3,
        status: response.status 
      })
    }
    
    // Step 4: Try to get one product
    try {
      const products = await finaleApi.getInventoryData(new Date().getFullYear())
      return NextResponse.json({
        success: true,
        productCount: products.length,
        sampleProduct: products[0] || null,
        message: 'Sync should work!'
      })
    } catch (err) {
      return NextResponse.json({
        error: 'Failed to get products',
        step: 4,
        details: err instanceof Error ? err.message : 'Unknown error'
      })
    }
  } catch (error) {
    return NextResponse.json({
      error: 'Unexpected error',
      message: error instanceof Error ? error.message : 'Unknown'
    })
  }
}