import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

async function getDeviceByIdOrAlias(deviceIdOrAlias: string) {
  if (isUUID(deviceIdOrAlias)) {
    return await queryOne('SELECT id, user_id FROM device WHERE id = ?', [deviceIdOrAlias]) as any;
  }
  return await queryOne('SELECT id, user_id FROM device WHERE alias = ?', [deviceIdOrAlias]) as any;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { deviceId: deviceIdOrAlias } = await params;
    const device = await getDeviceByIdOrAlias(deviceIdOrAlias);
    if (!device) {
      return NextResponse.json({ error: '디바이스를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (user.role !== 'superadmin' && device.user_id !== user.userId) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    // wsServer를 직접 import하면 Next 프로세스가 3031 포트를 다시 점유하려고 할 수 있으므로
    // 별도 실행 중인 wsServerEntry(3032)에 HTTP 브로드캐스트 요청을 보낸다.
    try {
      await fetch('http://127.0.0.1:3032/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'contentUpdate',
          data: { deviceId: device.id },
        }),
      });
    } catch (error) {
      console.error('공지 설정 적용 브로드캐스트 오류:', error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('디스플레이 설정 적용 오류:', error);
    return NextResponse.json(
      { error: '디스플레이 설정 적용 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
