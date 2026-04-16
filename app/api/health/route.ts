import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'kc-energy-next',
    timestamp: new Date().toISOString(),
    ghl_webhook_configured: Boolean(process.env.GHL_WEBHOOK_URL),
  });
}
