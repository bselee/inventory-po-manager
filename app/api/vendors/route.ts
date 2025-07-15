import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // TODO: Implement list vendors
  return NextResponse.json({ vendors: [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // TODO: Implement create Vendor
  return NextResponse.json({ id: '1', ...body }, { status: 201 });
}
