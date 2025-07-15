import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // TODO: Implement get Vendor by id
  return NextResponse.json({ id: params.id });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  // TODO: Implement update Vendor
  return NextResponse.json({ id: params.id, ...body });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // TODO: Implement delete Vendor
  return NextResponse.json({ message: 'Vendor deleted' });
}
