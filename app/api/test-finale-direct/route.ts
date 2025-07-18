import { NextResponse } from 'next/server'

export async function GET() {
  // Direct test with your credentials
  const apiKey = 'I9TVdRvblFod'
  const apiSecret = '63h4TCI62vlQUYM3btEA7bycoIflGQUz'
  const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
  
  const urls = [
    'https://app.finaleinventory.com/buildasoilorganics/api/product?limit=1',
    'https://app.finaleinventory.com/buildasoilorganics/api/auth/api/product?limit=1',
    'https://api.finaleinventory.com/buildasoilorganics/product?limit=1'
  ]
  
  const results = []
  
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      
      const text = await response.text()
      let data = null
      try {
        data = JSON.parse(text)
      } catch (e) {
        // Not JSON
      }
      
      results.push({
        url,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        isJson: !!data,
        preview: text.substring(0, 200)
      })
    } catch (error) {
      results.push({
        url,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    results
  })
}