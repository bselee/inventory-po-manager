import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { POPDFGenerator } from '@/app/lib/pdf-generator';
import { getSettings } from '@/app/lib/data-access';

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET /api/purchase-orders/[id]/export - Export purchase order
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'pdf';
    
    // Fetch PO data
    const { data: purchaseOrder, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !purchaseOrder) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    // Get company settings
    const settings = await getSettings();
    const companyInfo = {
      name: settings?.company_name || 'BuildASoil',
      address: settings?.company_address || '',
      phone: settings?.company_phone || '',
      email: settings?.company_email || '',
      logo: settings?.company_logo || ''
    };
    
    // Generate export based on format
    if (format === 'pdf') {
      try {
        const generator = new POPDFGenerator();
        const pdfBlob = await generator.generatePO(purchaseOrder, companyInfo);
        
        // Convert blob to buffer
        const buffer = Buffer.from(await pdfBlob.arrayBuffer());
        
        // Create audit log
        await supabase
          .from('audit_logs')
          .insert({
            action: 'EXPORT_PDF',
            entity_type: 'purchase_order',
            entity_id: id,
            user_id: 'system',
            details: { format, timestamp: new Date().toISOString() }
          });

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="PO-${purchaseOrder.order_number}.pdf"`,
            'Content-Length': buffer.length.toString()
          }
        });
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
        return NextResponse.json(
          { error: 'Failed to generate PDF' },
          { status: 500 }
        );
      }
    } else if (format === 'csv') {
      // Generate CSV
      let csvContent = 'Order Number,SKU,Product,Quantity,Unit Price,Total\n';
      purchaseOrder.items.forEach((item: any) => {
        csvContent += `${purchaseOrder.order_number},${item.sku},${item.product_name},${item.quantity},${item.unit_cost},${(item.quantity * item.unit_cost).toFixed(2)}\n`;
      });
      
      // Add summary row
      csvContent += `\nTotal,,,,,${purchaseOrder.total_amount.toFixed(2)}\n`;
      
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="PO-${purchaseOrder.order_number}.csv"`
        }
      });
    } else if (format === 'json') {
      // Return JSON data
      const orderData = {
        ...purchaseOrder,
        exportedAt: new Date().toISOString(),
        companyInfo
      };
      
      return NextResponse.json(orderData);
    } else {
      return NextResponse.json(
        { error: 'Invalid export format. Supported formats: pdf, csv, json' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export purchase order' },
      { status: 500 }
    );
  }
}