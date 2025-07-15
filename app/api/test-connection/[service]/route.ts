import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { service: string } }
) {
  const service = params.service;
  
  try {
    const settings = await request.json();

    switch (service) {
      case 'finale':
        if (!settings.finale_api_key || !settings.finale_api_secret || !settings.finale_account_path) {
          return NextResponse.json({ 
            success: false, 
            error: 'Missing Finale credentials' 
          }, { status: 400 });
        }

        // Test Finale API connection
        const finaleUrl = `https://${settings.finale_account_path}/api/products`;
        const finaleAuth = Buffer.from(`${settings.finale_api_key}:${settings.finale_api_secret}`).toString('base64');
        
        const finaleResponse = await fetch(finaleUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${finaleAuth}`,
            'Content-Type': 'application/json'
          }
        });

        if (finaleResponse.ok) {
          return NextResponse.json({ 
            success: true, 
            message: 'Finale connection successful' 
          });
        } else {
          return NextResponse.json({ 
            success: false, 
            error: `Finale API error: ${finaleResponse.status} ${finaleResponse.statusText}` 
          });
        }

      case 'google-sheets':
        if (!settings.google_sheet_id || !settings.google_sheets_api_key) {
          return NextResponse.json({ 
            success: false, 
            error: 'Missing Google Sheets credentials' 
          }, { status: 400 });
        }

        // Test Google Sheets API connection
        const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${settings.google_sheet_id}?key=${settings.google_sheets_api_key}`;
        
        const sheetsResponse = await fetch(sheetsUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (sheetsResponse.ok) {
          const data = await sheetsResponse.json();
          return NextResponse.json({ 
            success: true, 
            message: `Connected to sheet: ${data.properties?.title || 'Unknown'}` 
          });
        } else {
          const error = await sheetsResponse.json();
          return NextResponse.json({ 
            success: false, 
            error: `Google Sheets API error: ${error.error?.message || 'Invalid credentials'}` 
          });
        }

      case 'sendgrid':
        if (!settings.sendgrid_api_key || !settings.from_email) {
          return NextResponse.json({ 
            success: false, 
            error: 'Missing SendGrid credentials' 
          }, { status: 400 });
        }

        // Test SendGrid API connection by verifying the API key
        const sendgridResponse = await fetch(
          'https://api.sendgrid.com/v3/scopes',
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${settings.sendgrid_api_key}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (sendgridResponse.ok) {
          const data = await sendgridResponse.json();
          return NextResponse.json({ 
            success: true, 
            message: `SendGrid connected with ${data.scopes?.length || 0} permission scopes` 
          });
        } else {
          const error = await sendgridResponse.json();
          return NextResponse.json({ 
            success: false, 
            error: `SendGrid API error: ${error.errors?.[0]?.message || 'Invalid API key'}` 
          });
        }

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Unknown service' 
        }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to test connection' 
    }, { status: 500 });
  }
}