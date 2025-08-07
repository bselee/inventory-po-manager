import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { POPDFGenerator } from '@/app/lib/pdf-generator';
import { getSettings } from '@/app/lib/data-access';
import sgMail from '@sendgrid/mail';

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/purchase-orders/[id]/send - Send purchase order to vendor
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { method = 'email', recipientEmail, ccEmail, message } = body;
    
    // Fetch PO data
    const { data: purchaseOrder, error: poError } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (poError || !purchaseOrder) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    // Check if PO can be sent
    if (purchaseOrder.status !== 'draft' && purchaseOrder.status !== 'approved') {
      return NextResponse.json(
        { error: `Cannot send PO with status: ${purchaseOrder.status}` },
        { status: 400 }
      );
    }

    // Get settings for email configuration
    const settings = await getSettings();
    const sendgridApiKey = settings?.sendgrid_api_key || process.env.SENDGRID_API_KEY;
    const fromEmail = settings?.company_email || 'noreply@buildasoil.com';
    const companyInfo = {
      name: settings?.company_name || 'BuildASoil',
      address: settings?.company_address || '',
      phone: settings?.company_phone || '',
      email: settings?.company_email || '',
      logo: settings?.company_logo || ''
    };

    // Generate PDF
    const generator = new POPDFGenerator();
    const pdfBlob = await generator.generatePO(purchaseOrder, companyInfo);
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
    const pdfBase64 = pdfBuffer.toString('base64');

    // Determine recipient email
    const toEmail = recipientEmail || purchaseOrder.vendor_email;
    
    if (!toEmail) {
      return NextResponse.json(
        { error: 'Vendor email address is required' },
        { status: 400 }
      );
    }

    // Send email based on method
    if (method === 'email' && sendgridApiKey) {
      sgMail.setApiKey(sendgridApiKey);
      
      const emailContent = {
        to: toEmail,
        from: fromEmail,
        cc: ccEmail,
        subject: `Purchase Order ${purchaseOrder.order_number} from ${companyInfo.name}`,
        text: message || `Please find attached Purchase Order ${purchaseOrder.order_number}.\n\nTotal Amount: $${purchaseOrder.total_amount.toFixed(2)}\nExpected Delivery: ${purchaseOrder.expected_date ? new Date(purchaseOrder.expected_date).toLocaleDateString() : 'TBD'}\n\nThank you for your business.\n\nBest regards,\n${companyInfo.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0d6efd;">Purchase Order ${purchaseOrder.order_number}</h2>
            <p>${message || 'Please find attached our purchase order.'}</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>PO Number:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${purchaseOrder.order_number}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Vendor:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${purchaseOrder.vendor}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Total Amount:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">$${purchaseOrder.total_amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Expected Delivery:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${purchaseOrder.expected_date ? new Date(purchaseOrder.expected_date).toLocaleDateString() : 'TBD'}</td>
              </tr>
            </table>
            
            <p style="color: #666; font-size: 14px;">
              Please review the attached PDF for complete details. If you have any questions, please contact us at ${companyInfo.email || fromEmail}.
            </p>
            
            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>${companyInfo.name}</strong><br>
              ${companyInfo.phone ? `Phone: ${companyInfo.phone}<br>` : ''}
              ${companyInfo.email ? `Email: ${companyInfo.email}` : ''}
            </p>
          </div>
        `,
        attachments: [
          {
            content: pdfBase64,
            filename: `PO-${purchaseOrder.order_number}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment'
          }
        ]
      };

      try {
        await sgMail.send(emailContent);
        
        // Update PO status to sent
        await supabase
          .from('purchase_orders')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            sent_to: toEmail,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        // Create audit log
        await supabase
          .from('audit_logs')
          .insert({
            action: 'SEND_EMAIL',
            entity_type: 'purchase_order',
            entity_id: id,
            user_id: 'system',
            details: {
              recipient: toEmail,
              cc: ccEmail,
              method: 'sendgrid',
              timestamp: new Date().toISOString()
            }
          });

        return NextResponse.json(
          { 
            message: 'Purchase order sent successfully via email',
            result: {
              orderId: id,
              orderNumber: purchaseOrder.order_number,
              method: 'email',
              recipientEmail: toEmail,
              status: 'sent',
              sentAt: new Date().toISOString()
            }
          },
          { status: 200 }
        );
      } catch (emailError) {
        console.error('SendGrid error:', emailError);
        return NextResponse.json(
          { error: 'Failed to send email. Please check email configuration.' },
          { status: 500 }
        );
      }
    } else {
      // Fallback: Just update status and create a download link
      await supabase
        .from('purchase_orders')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          action: 'MARK_SENT',
          entity_type: 'purchase_order',
          entity_id: id,
          user_id: 'system',
          details: {
            method: 'manual',
            note: 'Email service not configured, PO marked as sent',
            timestamp: new Date().toISOString()
          }
        });

      return NextResponse.json(
        { 
          message: 'Purchase order marked as sent (email service not configured)',
          result: {
            orderId: id,
            orderNumber: purchaseOrder.order_number,
            method: 'manual',
            status: 'sent',
            sentAt: new Date().toISOString(),
            note: 'Please download and send the PDF manually'
          }
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Send PO error:', error);
    return NextResponse.json(
      { error: 'Failed to send purchase order' },
      { status: 500 }
    );
  }
}