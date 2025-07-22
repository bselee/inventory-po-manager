import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET /api/inventory - Fetch inventory items
export async function GET() {
  try {
    // Fetch inventory from database
    const { data: inventory, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('sku', { ascending: true });

    if (error) {
      console.error('Error fetching inventory:', error);
      return NextResponse.json(
        { error: 'Failed to fetch inventory from database' },
        { status: 500 }
      );
    }

    return NextResponse.json({ inventory: inventory || [] });
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