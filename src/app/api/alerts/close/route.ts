import { NextResponse } from 'next/server';
import { broadcastCloseAlertToDevice } from '@/lib/wsServer';
import { alerts } from '@/lib/alertStore';

export async function POST(request: Request) {
  try {
    const { deviceId } = await request.json();
    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId is required' }, { status: 400 });
    }
    // 해당 디바이스의 모든 알림 삭제
    for (let i = alerts.length - 1; i >= 0; i--) {
      if (alerts[i].targetDeviceIds.includes(deviceId)) {
        alerts.splice(i, 1);
      }
    }
    await broadcastCloseAlertToDevice(deviceId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: '알림 닫기 처리 중 오류 발생' }, { status: 500 });
  }
}
