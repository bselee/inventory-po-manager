import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const settings = await request.json()
    
    if (!settings.google_sheet_id || !settings.google_sheets_api_key) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing Google Sheets credentials' 
      }, { status: 400 })
    }

    // Test Google Sheets API connection
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${settings.google_sheet_id}?key=${settings.google_sheets_api_key}`
    
    const response = await fetch(sheetsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({ 
        success: true, 
        message: `Connected to sheet: ${data.properties?.title || 'Unknown'}` 
      })
    } else {
      const error = await response.json()
      return NextResponse.json({ 
        success: false, 
        error: `Google Sheets API error: ${error.error?.message || 'Invalid credentials'}` 
      })
    }
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to test Google Sheets connection' 
    }, { status: 500 })
  }
}