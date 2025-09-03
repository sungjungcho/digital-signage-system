import { NextRequest, NextResponse } from 'next/server';
import { addAlert, getAlertsForDevice, removeAlert, alerts } from '@/lib/alertStore';
import { broadcastAlertToDevices } from '@/lib/wsServer';

// POST /api/alerts
export async function POST(req: NextRequest) {
  const { message, targetDeviceIds, expiresAt, duration } = await req.json();
  if (!message || !Array.isArray(targetDeviceIds) || targetDeviceIds.length === 0) {
    return NextResponse.json({ error: 'message, targetDeviceIds required' }, { status: 400 });
  }
  const alert = addAlert(message, targetDeviceIds, expiresAt ? new Date(expiresAt) : undefined, duration);
  // WebSocket 브로드캐스트
  broadcastAlertToDevices(alert);
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
