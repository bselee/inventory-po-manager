import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { getSettings, getFinaleConfig } from '@/app/lib/data-access';
import { FinaleReportApiService } from '@/app/lib/finale-report-api';
import { purchaseOrderSchema, paginationSchema } from '@/app/lib/validation-schemas';
import { createApiHandler, apiResponse } from '@/app/lib/api-handler';
import { logError, logWarn } from '@/app/lib/logger';

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET /api/purchase-orders - Fetch purchase orders
export async function GET() {
  try {
    const settings = await getSettings();
    const finaleConfig = await getFinaleConfig();
    
    // Try to fetch from Finale report first if configured
    if (finaleConfig && settings?.finale_purchase_orders_url) {
      try {
        const reportApi = new FinaleReportApiService({
          apiKey: finaleConfig.apiKey,
          apiSecret: finaleConfig.apiSecret,
          accountPath: finaleConfig.accountPath
        });

        const reportData = await reportApi.fetchReport(settings.finale_purchase_orders_url);
        
        // Transform and validate report data
        const validPurchaseOrders = [];
        const invalidOrders = [];
        
        reportData.forEach((row: any, index: number) => {
          try {
            const mappedOrder = {
              id: row['Purchase Order ID'] || row['PO Number'] || `PO-${index}`,
              orderNumber: row['PO Number'] || row['Purchase Order Number'] || `PO-${new Date().getFullYear()}-${index}`,
              vendor: row['Vendor'] || row['Supplier'] || 'Unknown Vendor',
              vendor_email: row['Vendor Email'] || row['Supplier Email'] || '',
              status: (row['Status'] || 'draft').toLowerCase(),
              total_amount: parseFloat(row['Total Amount'] || row['Total'] || '0'),
              created_at: row['Created Date'] || row['Date Created'] || new Date().toISOString(),
              updated_at: row['Updated Date'] || row['Last Modified'] || new Date().toISOString(),
              expected_date: row['Expected Date'] || row['Due Date'] || null,
              items: [],
              // Additional fields from report
              shipping_cost: parseFloat(row['Shipping Cost'] || '0'),
              tax_amount: parseFloat(row['Tax Amount'] || '0'),
              notes: row['Notes'] || row['Comments'] || ''
            };
            
            // Validate the order
            const validatedOrder = purchaseOrderSchema.parse(mappedOrder);
            validPurchaseOrders.push(validatedOrder);
          } catch (error) {
            logWarn(`[Purchase Orders API] Invalid order data at index ${index}:`, error);
            invalidOrders.push({ index, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        });
        
        if (invalidOrders.length > 0) {

        }
        
        return NextResponse.json({ 
          purchaseOrders: validPurchaseOrders,
          source: 'finale-report',
          totalCount: validPurchaseOrders.length,
          invalidCount: invalidOrders.length
        });
      } catch (error) {
        logError('[Purchase Orders API] Error fetching from Finale:', error);
        // Fall through to database
      }
    }
    
    // Fallback to database
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      logError('[Purchase Orders API] Database error:', error);
      
      // If database fails too, return sample data for development
      const samplePOs = [
        {
          id: '1',
          orderNumber: 'PO-2024-001',
          vendor: 'Widget Corp',
          vendor_email: 'orders@widgetcorp.com',
          status: 'draft',
          items: [
            { productId: '1', sku: 'WIDGET001', product_name: 'Premium Widget', quantity: 50, unit_cost: 12.99 }
          ],
          total_amount: 649.50,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          orderNumber: 'PO-2024-002',
          vendor: 'Gadget Inc',
          vendor_email: 'purchasing@gadgetinc.com',
          status: 'sent',
          items: [
            { productId: '2', sku: 'GADGET002', product_name: 'Smart Gadget', quantity: 30, unit_cost: 45.00 }
          ],
          total_amount: 1350.00,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      return NextResponse.json({ 
        purchaseOrders: samplePOs,
        source: 'sample-data',
        totalCount: samplePOs.length,
        error: 'Using sample data - configure Finale Purchase Orders Report URL in settings'
      });
    }

    return NextResponse.json({ 
      purchaseOrders: data || [],
      source: 'database',
      totalCount: data?.length || 0
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders' },
      { status: 500 }
    );
  }
}

// POST /api/purchase-orders - Create new purchase order
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Generate order number
    const orderNumber = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    
    // Insert into database
    const { data, error } = await supabase
      .from('purchase_orders')
      .insert({
        order_number: orderNumber,
        vendor: body.vendor,
        vendor_email: body.vendor_email,
        status: body.status || 'draft',
        items: body.items || [],
        total_amount: body.total_amount || 0,
        shipping_cost: body.shipping_cost || 0,
        tax_amount: body.tax_amount || 0,
        notes: body.notes || '',
        expected_date: body.expected_date || null
      })
      .select()
      .single();

    if (error) {
      logError('[Purchase Orders API] Error creating PO:', error);
      return NextResponse.json(
        { error: 'Failed to create purchase order' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Purchase order created successfully', purchaseOrder: data },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create purchase order' },
      { status: 500 }
    );
  }
}