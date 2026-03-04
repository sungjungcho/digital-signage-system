import { NextRequest, NextResponse } from 'next/server';
import { addAlert, getAlertsForDevice, removeAlert } from '@/lib/alertStore';

const BROADCAST_URL = process.env.WS_BROADCAST_URL || 'http://127.0.0.1:3032/broadcast';

// POST /api/alerts
export async function POST(req: NextRequest) {
  const { message, targetDeviceIds, expiresAt, duration } = await req.json();
  if (!message || !Array.isArray(targetDeviceIds) || targetDeviceIds.length === 0) {
    return NextResponse.json({ error: 'message, targetDeviceIds required' }, { status: 400 });
  }
  const alert = addAlert(message, targetDeviceIds, expiresAt ? new Date(expiresAt) : undefined, duration);

  // WebSocket 서버의 HTTP API를 통해 알림 전송
  try {
    const response = await fetch(BROADCAST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'alert', data: { alert } }),
    });

    if (!response.ok) {
      console.error('WebSocket 서버로 알림 전송 실패:', response.status);
      return NextResponse.json(
        { error: '브로드캐스트 서버 응답 오류', details: `status=${response.status}` },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('WebSocket 서버 연결 오류:', error);
    return NextResponse.json(
      { error: '브로드캐스트 서버 연결 실패' },
      { status: 503 }
    );
  }

  return NextResponse.json(alert);
}

// GET /api/alerts?deviceId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get('deviceId');
  if (!deviceId) {
    return NextResponse.json({ error: 'deviceId required' }, { status: 400 });
  }
  const deviceAlerts = getAlertsForDevice(deviceId);
  return NextResponse.json(deviceAlerts);
}

// (선택) DELETE /api/alerts/:id
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  removeAlert(id);
  return NextResponse.json({ ok: true });
}
