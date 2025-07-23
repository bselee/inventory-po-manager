import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Transform database fields to match frontend expectations
function transformInventoryItem(item: any) {
  return {
    ...item,
    current_stock: item.stock || 0,
    minimum_stock: item.reorder_point || 0,
    unit_price: item.cost || 0,
    name: item.product_name || item.name || '',
    // Calculate additional fields
    sales_velocity: item.sales_last_30_days ? (item.sales_last_30_days / 30) : 0,
    days_until_stockout: calculateDaysUntilStockout(item),
    stock_status_level: determineStockStatus(item),
    reorder_recommended: shouldReorder(item),
    trend: calculateTrend(item)
  };
}

function calculateDaysUntilStockout(item: any): number {
  const velocity = item.sales_last_30_days ? (item.sales_last_30_days / 30) : 0;
  if (velocity === 0) return Infinity;
  return Math.floor((item.stock || 0) / velocity);
}

function determineStockStatus(item: any): 'critical' | 'low' | 'adequate' | 'overstocked' {
  const stock = item.stock || 0;
  const reorderPoint = item.reorder_point || 0;
  
  if (stock === 0) return 'critical';
  
  const daysLeft = calculateDaysUntilStockout(item);
  if (daysLeft <= 7) return 'critical';
  if (stock <= reorderPoint || daysLeft <= 30) return 'low';
  
  // Check if overstocked (more than 90 days of inventory)
  if (daysLeft > 90) return 'overstocked';
  
  return 'adequate';
}

function shouldReorder(item: any): boolean {
  const status = determineStockStatus(item);
  const daysLeft = calculateDaysUntilStockout(item);
  return status === 'critical' || (status === 'low' && daysLeft <= 14);
}

function calculateTrend(item: any): 'increasing' | 'decreasing' | 'stable' {
  const sales30 = item.sales_last_30_days || 0;
  const sales90 = item.sales_last_90_days || 0;
  
  if (sales90 === 0) return 'stable';
  
  const avgDaily30 = sales30 / 30;
  const avgDaily90 = sales90 / 90;
  
  const changePercent = ((avgDaily30 - avgDaily90) / avgDaily90) * 100;
  
  if (changePercent > 20) return 'increasing';
  if (changePercent < -20) return 'decreasing';
  return 'stable';
}

// GET /api/inventory - Fetch inventory items with enhanced data
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // Support pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;
    
    // Support filtering
    const status = searchParams.get('status');
    const vendor = searchParams.get('vendor');
    const search = searchParams.get('search');
    
    // Build query
    let query = supabase
      .from('inventory_items')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (status === 'out-of-stock') {
      query = query.eq('stock', 0);
    } else if (status === 'low-stock') {
      query = query.or('stock.lte.reorder_point,stock.gt.0');
    }
    
    if (vendor) {
      query = query.ilike('vendor', `%${vendor}%`);
    }
    
    if (search) {
      query = query.or(`sku.ilike.%${search}%,product_name.ilike.%${search}%`);
    }
    
    // Apply pagination and ordering
    query = query
      .order('product_name', { ascending: true })
      .range(offset, offset + limit - 1);
    
    const { data: inventory, error, count } = await query;

    if (error) {
      console.error('Error fetching inventory:', error);
      return NextResponse.json(
        { error: 'Failed to fetch inventory from database' },
        { status: 500 }
      );
    }

    // Transform inventory items
    const transformedInventory = (inventory || []).map(transformInventoryItem);
    
    // Calculate summary statistics
    const summary = {
      total_items: count || 0,
      out_of_stock_count: transformedInventory.filter(i => i.current_stock === 0).length,
      low_stock_count: transformedInventory.filter(i => i.stock_status_level === 'low').length,
      critical_count: transformedInventory.filter(i => i.stock_status_level === 'critical').length,
      reorder_needed_count: transformedInventory.filter(i => i.reorder_recommended).length
    };

    return NextResponse.json({ 
      inventory: transformedInventory,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      summary
    });
  } catch (error) {
    console.error('Error in inventory API:', error);
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
    
    // Validate required fields
    if (!body.sku || !body.product_name) {
      return NextResponse.json(
        { error: 'SKU and product name are required' },
        { status: 400 }
      );
    }
    
    // Prepare data for database
    const inventoryData = {
      sku: body.sku,
      product_name: body.product_name || body.name,
      stock: body.stock || body.current_stock || 0,
      reorder_point: body.reorder_point || body.minimum_stock || 0,
      reorder_quantity: body.reorder_quantity || 0,
      vendor: body.vendor || null,
      cost: body.cost || body.unit_price || 0,
      location: body.location || 'Shipping',
      sales_last_30_days: body.sales_last_30_days || 0,
      sales_last_90_days: body.sales_last_90_days || 0,
      last_updated: new Date().toISOString()
    };
    
    // Insert into database
    const { data, error } = await supabase
      .from('inventory_items')
      .insert(inventoryData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating inventory item:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create inventory item' },
        { status: 500 }
      );
    }

    // Transform response
    const transformedItem = transformInventoryItem(data);

    return NextResponse.json(
      { message: 'Inventory item created successfully', item: transformedItem },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST inventory:', error);
    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    );
  }
}

// PUT /api/inventory/[id] - Update inventory item
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }
    
    // Prepare update data
    const updateData: any = {
      last_updated: new Date().toISOString()
    };
    
    // Map fields from request
    if (body.hasOwnProperty('stock') || body.hasOwnProperty('current_stock')) {
      updateData.stock = body.stock ?? body.current_stock;
    }
    if (body.hasOwnProperty('cost') || body.hasOwnProperty('unit_price')) {
      updateData.cost = body.cost ?? body.unit_price;
    }
    if (body.hasOwnProperty('reorder_point') || body.hasOwnProperty('minimum_stock')) {
      updateData.reorder_point = body.reorder_point ?? body.minimum_stock;
    }
    if (body.hasOwnProperty('product_name') || body.hasOwnProperty('name')) {
      updateData.product_name = body.product_name ?? body.name;
    }
    if (body.hasOwnProperty('vendor')) {
      updateData.vendor = body.vendor;
    }
    if (body.hasOwnProperty('location')) {
      updateData.location = body.location;
    }
    
    // Update in database
    const { data, error } = await supabase
      .from('inventory_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating inventory item:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update inventory item' },
        { status: 500 }
      );
    }
    
    // Transform response
    const transformedItem = transformInventoryItem(data);

    return NextResponse.json({
      message: 'Inventory item updated successfully',
      item: transformedItem
    });
  } catch (error) {
    console.error('Error in PUT inventory:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
      { status: 500 }
    );
  }
}