import { NextRequest, NextResponse } from 'next/server';
import '@/lib/wsServer'; // WebSocket 서버 초기화

export async function GET(req: NextRequest) {
  return NextResponse.json({ status: 'WebSocket server initialized' });
}