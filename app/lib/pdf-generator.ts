import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { supabase } from './supabase';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  vendor: string;
  vendor_email?: string;
  vendor_id?: string;
  status: string;
  items: POItem[];
  total_amount: number;
  shipping_cost?: number;
  tax_amount?: number;
  notes?: string;
  expected_date?: string;
  created_at: string;
  created_by?: string;
  urgency_level?: string;
}

interface POItem {
  sku: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total_cost?: number;
}

interface CompanyInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
}

export class POPDFGenerator {
  private doc: jsPDF;
  private pageHeight: number;
  private pageWidth: number;
  private margins = { top: 20, right: 20, bottom: 20, left: 20 };
  private currentY: number = 0;

  constructor() {
    this.doc = new jsPDF();
    this.pageHeight = this.doc.internal.pageSize.height;
    this.pageWidth = this.doc.internal.pageSize.width;
    this.currentY = this.margins.top;
  }

  async generatePO(purchaseOrder: PurchaseOrder, companyInfo?: CompanyInfo): Promise<Blob> {
    // Fetch vendor details if needed
    let vendorDetails: any = null;
    if (purchaseOrder.vendor_id) {
      const { data } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', purchaseOrder.vendor_id)
        .single();
      vendorDetails = data;
    }

    // Header with company info
    this.addHeader(companyInfo);
    
    // PO Title and Number
    this.addPOTitle(purchaseOrder);
    
    // Vendor and Company Info Columns
    this.addAddressSection(purchaseOrder, vendorDetails, companyInfo);
    
    // PO Details
    this.addPODetails(purchaseOrder);
    
    // Items Table
    this.addItemsTable(purchaseOrder);
    
    // Financial Summary
    this.addFinancialSummary(purchaseOrder);
    
    // Notes and Terms
    this.addNotesAndTerms(purchaseOrder);
    
    // Footer
    this.addFooter(purchaseOrder);

    return this.doc.output('blob');
  }

  private addHeader(companyInfo?: CompanyInfo) {
    // Company Logo and Name
    if (companyInfo?.logo) {
      // Add logo image if available
      // this.doc.addImage(companyInfo.logo, 'PNG', this.margins.left, this.currentY, 40, 20);
    }
    
    this.doc.setFontSize(20);
    this.doc.setTextColor(33, 37, 41);
    this.doc.text(companyInfo?.name || 'BuildASoil', this.pageWidth / 2, this.currentY + 10, { align: 'center' });
    
    this.currentY += 25;
  }

  private addPOTitle(purchaseOrder: PurchaseOrder) {
    // Purchase Order Title
    this.doc.setFontSize(24);
    this.doc.setTextColor(13, 110, 253);
    this.doc.text('PURCHASE ORDER', this.pageWidth / 2, this.currentY, { align: 'center' });
    
    this.currentY += 10;
    
    // PO Number
    this.doc.setFontSize(14);
    this.doc.setTextColor(108, 117, 125);
    this.doc.text(`PO #${purchaseOrder.order_number}`, this.pageWidth / 2, this.currentY, { align: 'center' });
    
    // Urgency Badge
    if (purchaseOrder.urgency_level) {
      const urgencyColors: Record<string, [number, number, number]> = {
        critical: [220, 53, 69],
        high: [253, 126, 20],
        medium: [255, 193, 7],
        low: [25, 135, 84]
      };
      
      const color = urgencyColors[purchaseOrder.urgency_level] || [108, 117, 125];
      this.doc.setTextColor(...color);
      this.doc.setFontSize(10);
      this.doc.text(
        `[${purchaseOrder.urgency_level.toUpperCase()} PRIORITY]`,
        this.pageWidth / 2,
        this.currentY + 6,
        { align: 'center' }
      );
    }
    
    this.currentY += 20;
  }

  private addAddressSection(purchaseOrder: PurchaseOrder, vendorDetails: any, companyInfo?: CompanyInfo) {
    const colWidth = (this.pageWidth - this.margins.left - this.margins.right) / 2;
    const leftX = this.margins.left;
    const rightX = this.margins.left + colWidth + 10;
    
    // Vendor Information (Left)
    this.doc.setFontSize(12);
    this.doc.setTextColor(33, 37, 41);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('VENDOR:', leftX, this.currentY);
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(11);
    let vendorY = this.currentY + 6;
    
    this.doc.text(purchaseOrder.vendor, leftX, vendorY);
    vendorY += 5;
    
    if (vendorDetails?.address) {
      this.doc.text(vendorDetails.address, leftX, vendorY);
      vendorY += 5;
    }
    
    if (purchaseOrder.vendor_email) {
      this.doc.text(purchaseOrder.vendor_email, leftX, vendorY);
      vendorY += 5;
    }
    
    if (vendorDetails?.phone) {
      this.doc.text(vendorDetails.phone, leftX, vendorY);
      vendorY += 5;
    }
    
    // Bill To Information (Right)
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('BILL TO:', rightX, this.currentY);
    
    this.doc.setFont('helvetica', 'normal');
    let billY = this.currentY + 6;
    
    this.doc.text(companyInfo?.name || 'BuildASoil', rightX, billY);
    billY += 5;
    
    if (companyInfo?.address) {
      this.doc.text(companyInfo.address, rightX, billY);
      billY += 5;
    }
    
    if (companyInfo?.email) {
      this.doc.text(companyInfo.email, rightX, billY);
      billY += 5;
    }
    
    if (companyInfo?.phone) {
      this.doc.text(companyInfo.phone, rightX, billY);
    }
    
    this.currentY = Math.max(vendorY, billY) + 10;
  }

  private addPODetails(purchaseOrder: PurchaseOrder) {
    // Draw background box
    this.doc.setFillColor(248, 249, 250);
    this.doc.rect(this.margins.left, this.currentY - 5, this.pageWidth - this.margins.left - this.margins.right, 25, 'F');
    
    const detailsY = this.currentY;
    const colWidth = (this.pageWidth - this.margins.left - this.margins.right) / 3;
    
    // Date
    this.doc.setFontSize(10);
    this.doc.setTextColor(108, 117, 125);
    this.doc.text('Date:', this.margins.left + 5, detailsY);
    this.doc.setTextColor(33, 37, 41);
    this.doc.text(new Date(purchaseOrder.created_at).toLocaleDateString(), this.margins.left + 5, detailsY + 5);
    
    // Expected Delivery
    this.doc.setTextColor(108, 117, 125);
    this.doc.text('Expected Delivery:', this.margins.left + colWidth + 5, detailsY);
    this.doc.setTextColor(33, 37, 41);
    this.doc.text(
      purchaseOrder.expected_date ? new Date(purchaseOrder.expected_date).toLocaleDateString() : 'TBD',
      this.margins.left + colWidth + 5,
      detailsY + 5
    );
    
    // Status
    this.doc.setTextColor(108, 117, 125);
    this.doc.text('Status:', this.margins.left + (colWidth * 2) + 5, detailsY);
    this.doc.setTextColor(33, 37, 41);
    this.doc.text(purchaseOrder.status.toUpperCase(), this.margins.left + (colWidth * 2) + 5, detailsY + 5);
    
    this.currentY += 30;
  }

  private addItemsTable(purchaseOrder: PurchaseOrder) {
    const tableData = purchaseOrder.items.map(item => [
      item.sku,
      item.product_name,
      item.quantity.toString(),
      `$${item.unit_cost.toFixed(2)}`,
      `$${(item.quantity * item.unit_cost).toFixed(2)}`
    ]);

    this.doc.autoTable({
      head: [['SKU', 'Product', 'Quantity', 'Unit Price', 'Total']],
      body: tableData,
      startY: this.currentY,
      theme: 'grid',
      headStyles: {
        fillColor: [13, 110, 253],
        textColor: 255,
        fontSize: 11,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 10,
        textColor: [33, 37, 41]
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' }
      },
      margin: { left: this.margins.left, right: this.margins.right }
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  private addFinancialSummary(purchaseOrder: PurchaseOrder) {
    const rightX = this.pageWidth - this.margins.right - 60;
    const labelX = rightX - 30;
    
    // Subtotal
    const subtotal = purchaseOrder.total_amount - (purchaseOrder.shipping_cost || 0) - (purchaseOrder.tax_amount || 0);
    
    this.doc.setFontSize(11);
    this.doc.setTextColor(108, 117, 125);
    this.doc.text('Subtotal:', labelX, this.currentY, { align: 'right' });
    this.doc.setTextColor(33, 37, 41);
    this.doc.text(`$${subtotal.toFixed(2)}`, rightX, this.currentY, { align: 'right' });
    
    this.currentY += 6;
    
    // Shipping
    if (purchaseOrder.shipping_cost && purchaseOrder.shipping_cost > 0) {
      this.doc.setTextColor(108, 117, 125);
      this.doc.text('Shipping:', labelX, this.currentY, { align: 'right' });
      this.doc.setTextColor(33, 37, 41);
      this.doc.text(`$${purchaseOrder.shipping_cost.toFixed(2)}`, rightX, this.currentY, { align: 'right' });
      this.currentY += 6;
    }
    
    // Tax
    if (purchaseOrder.tax_amount && purchaseOrder.tax_amount > 0) {
      this.doc.setTextColor(108, 117, 125);
      this.doc.text('Tax:', labelX, this.currentY, { align: 'right' });
      this.doc.setTextColor(33, 37, 41);
      this.doc.text(`$${purchaseOrder.tax_amount.toFixed(2)}`, rightX, this.currentY, { align: 'right' });
      this.currentY += 6;
    }
    
    // Draw line
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(labelX - 20, this.currentY, rightX, this.currentY);
    this.currentY += 6;
    
    // Total
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(13, 110, 253);
    this.doc.text('TOTAL:', labelX, this.currentY, { align: 'right' });
    this.doc.text(`$${purchaseOrder.total_amount.toFixed(2)}`, rightX, this.currentY, { align: 'right' });
    
    this.currentY += 15;
  }

  private addNotesAndTerms(purchaseOrder: PurchaseOrder) {
    if (!purchaseOrder.notes) return;
    
    // Notes Section
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.setTextColor(33, 37, 41);
    this.doc.text('NOTES:', this.margins.left, this.currentY);
    
    this.currentY += 6;
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.setTextColor(108, 117, 125);
    
    const lines = this.doc.splitTextToSize(purchaseOrder.notes, this.pageWidth - this.margins.left - this.margins.right);
    lines.forEach((line: string) => {
      this.doc.text(line, this.margins.left, this.currentY);
      this.currentY += 5;
    });
    
    this.currentY += 10;
  }

  private addFooter(purchaseOrder: PurchaseOrder) {
    const footerY = this.pageHeight - this.margins.bottom - 20;
    
    // Signature Lines
    const signatureWidth = (this.pageWidth - this.margins.left - this.margins.right - 20) / 2;
    
    // Authorized By
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margins.left, footerY, this.margins.left + signatureWidth, footerY);
    this.doc.setFontSize(10);
    this.doc.setTextColor(108, 117, 125);
    this.doc.text('Authorized By', this.margins.left, footerY + 5);
    
    // Date
    this.doc.line(this.pageWidth - this.margins.right - signatureWidth, footerY, this.pageWidth - this.margins.right, footerY);
    this.doc.text('Date', this.pageWidth - this.margins.right - signatureWidth, footerY + 5);
    
    // Footer text
    this.doc.setFontSize(8);
    this.doc.setTextColor(173, 181, 189);
    this.doc.text(
      `Generated on ${new Date().toLocaleString()} | PO #${purchaseOrder.order_number}`,
      this.pageWidth / 2,
      this.pageHeight - 10,
      { align: 'center' }
    );
  }

  async saveToFile(purchaseOrder: PurchaseOrder, companyInfo?: CompanyInfo): Promise<void> {
    await this.generatePO(purchaseOrder, companyInfo);
    this.doc.save(`PO-${purchaseOrder.order_number}.pdf`);
  }

  async getDataUrl(purchaseOrder: PurchaseOrder, companyInfo?: CompanyInfo): Promise<string> {
    await this.generatePO(purchaseOrder, companyInfo);
    return this.doc.output('datauristring');
  }
}