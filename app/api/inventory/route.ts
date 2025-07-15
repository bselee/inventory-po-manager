import { NextResponse } from 'next/server';

// GET /api/inventory - Fetch inventory items
export async function GET() {
  try {
    // Placeholder: Fetch inventory from database
    const inventory = [
      {
        id: '1',
        name: 'Sample Product 1',
        sku: 'SKU001',
        quantity: 100,
        minQuantity: 20,
        maxQuantity: 500,
        price: 25.99,
        lastUpdated: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Sample Product 2',
        sku: 'SKU002',
        quantity: 50,
        minQuantity: 10,
        maxQuantity: 200,
        price: 15.99,
        lastUpdated: new Date().toISOString()
      }
    ];

    return NextResponse.json({ inventory });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

// POST /api/inventory - Create new inventory item
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Placeholder: Validate and save to database
    const newItem = {
      id: Date.now().toString(),
      ...body,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(
      { message: 'Inventory item created successfully', item: newItem },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    );
  }
}