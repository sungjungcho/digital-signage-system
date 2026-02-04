import { NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;
    const { status, lastConnected } = await req.json();

    // 디바이스 상태 업데이트
    const lastConnectedDate = lastConnected ? new Date(lastConnected).toISOString() : null;

    await execute(
      'UPDATE device SET status = ?, lastConnected = ?, updatedAt = ? WHERE id = ?',
      [status, lastConnectedDate, new Date().toISOString(), deviceId]
    );

    const updatedDevice = await queryOne('SELECT * FROM device WHERE id = ?', [deviceId]);

    return NextResponse.json(updatedDevice);
  } catch (error) {
    console.error('디바이스 상태 업데이트 오류:', error);
    return NextResponse.json(
      { error: '디바이스 상태를 업데이트하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
