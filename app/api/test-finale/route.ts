import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const settings = await request.json()
    
    if (!settings.finale_api_key || !settings.finale_api_secret || !settings.finale_account_path) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing Finale credentials' 
      }, { status: 400 })
    }

    // Test Finale API connection - correct pattern is /{account}/api/
    const cleanPath = settings.finale_account_path
      .replace(/^https?:\/\//, '')
      .replace(/\.finaleinventory\.com.*$/, '')
      .replace(/^app\./, '')
      .replace(/\/$/, '')
      .trim()
    const finaleUrl = `https://app.finaleinventory.com/${cleanPath}/api/product?limit=1`
    const finaleAuth = Buffer.from(`${settings.finale_api_key}:${settings.finale_api_secret}`).toString('base64')
    
    const response = await fetch(finaleUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${finaleAuth}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      return NextResponse.json({ 
        success: true, 
        message: 'Finale connection successful' 
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: `Finale API error: ${response.status} ${response.statusText}` 
      })
    }
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to test Finale connection' 
    }, { status: 500 })
  }
}