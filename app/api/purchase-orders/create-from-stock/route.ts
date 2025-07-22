import { NextResponse } from 'next/server';

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/purchase-orders/create-from-stock - Create purchase order based on stock levels
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { threshold = 'min' } = body; // min, reorder, custom
    
    // Placeholder: Analyze stock levels and create purchase order
    const suggestedItems = [
      {
        productId: '1',
        productName: 'Sample Product 1',
        currentStock: 15,
        minStock: 20,
        suggestedQuantity: 50,
        unitPrice: 20.00
      },
      {
        productId: '3',
        productName: 'Sample Product 3',
        currentStock: 5,
        minStock: 10,
        suggestedQuantity: 30,
        unitPrice: 35.00
      }
    ];

    const purchaseOrder = {
      id: Date.now().toString(),
      orderNumber: `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-3)}`,
      status: 'draft',
      vendor: 'Auto-selected Vendor',
      items: suggestedItems,
      totalAmount: suggestedItems.reduce((sum, item) => sum + (item.suggestedQuantity * item.unitPrice), 0),
      createdFrom: 'stock-levels',
      threshold,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json(
      { 
        message: 'Purchase order created from stock levels', 
        purchaseOrder,
        suggestedItems 
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create purchase order from stock levels' },
      { status: 500 }
    );
  }
}