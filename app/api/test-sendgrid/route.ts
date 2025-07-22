import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const settings = await request.json()
    
    if (!settings.sendgrid_api_key || !settings.from_email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing SendGrid credentials' 
      }, { status: 400 })
    }

    // Test SendGrid API connection by verifying the API key
    const response = await fetch(
      'https://api.sendgrid.com/v3/scopes',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${settings.sendgrid_api_key}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({ 
        success: true, 
        message: `SendGrid connected with ${data.scopes?.length || 0} permission scopes` 
      })
    } else {
      const error = await response.json()
      return NextResponse.json({ 
        success: false, 
        error: `SendGrid API error: ${error.errors?.[0]?.message || 'Invalid API key'}` 
      })
    }
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to test SendGrid connection' 
    }, { status: 500 })
  }
}