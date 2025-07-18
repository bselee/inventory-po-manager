import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = 'I9TVdRvblFod'
  const apiSecret = '63h4TCI62vlQUYM3btEA7bycoIflGQUz'
  const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
  const baseUrl = 'https://app.finaleinventory.com/buildasoilorganics/api'
  
  const endpoints = [
    '/product?limit=2',
    '/inventory?limit=2',
    '/invItem?limit=2',
    '/product?limit=2&statusId=PRODUCT_ACTIVE',
    '/facilityAsset?limit=2'
  ]
  
  const results = []
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(baseUrl + endpoint, {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Accept': 'application/json'
        }
      })
      
      const text = await response.text()
      let data = null
      let sampleKeys = []
      
      try {
        data = JSON.parse(text)
        if (data && typeof data === 'object') {
          sampleKeys = Object.keys(data).slice(0, 10)
        }
      } catch (e) {
        // Not JSON
      }
      
      results.push({
        endpoint,
        status: response.status,
        ok: response.ok,
        isJson: !!data,
        sampleKeys,
        hasData: data && ((Array.isArray(data) && data.length > 0) || (data.productId && data.productId.length > 0))
      })
    } catch (error) {
      results.push({
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
  
  return NextResponse.json({
    message: 'Testing various Finale endpoints for inventory data',
    results
  })
}