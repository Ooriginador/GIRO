import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'giro-dashboard',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
}
