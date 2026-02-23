import { NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';

function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

async function findDevice(deviceIdOrAlias: string) {
  if (isUUID(deviceIdOrAlias)) {
    return await queryOne('SELECT * FROM device WHERE id = ?', [deviceIdOrAlias]);
  }
  return await queryOne('SELECT * FROM device WHERE alias = ?', [deviceIdOrAlias]);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;
    const { status, lastConnected } = await req.json();
    const device = await findDevice(deviceId) as any;

    if (!device) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 디바이스 상태 업데이트
    const lastConnectedDate = lastConnected ? new Date(lastConnected).toISOString() : null;

    await execute(
      'UPDATE device SET status = ?, lastConnected = ?, updatedAt = ? WHERE id = ?',
      [status, lastConnectedDate, new Date().toISOString(), device.id]
    );

    const updatedDevice = await queryOne('SELECT * FROM device WHERE id = ?', [device.id]);

    return NextResponse.json(updatedDevice);
  } catch (error) {
    console.error('디바이스 상태 업데이트 오류:', error);
    return NextResponse.json(
      { error: '디바이스 상태를 업데이트하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
