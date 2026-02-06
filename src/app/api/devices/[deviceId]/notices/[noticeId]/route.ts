import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';

// UUID 형식인지 확인하는 함수
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// deviceId 또는 alias로 실제 deviceId 조회
async function getDeviceId(deviceIdOrAlias: string): Promise<string | null> {
  if (isUUID(deviceIdOrAlias)) {
    const device = await queryOne('SELECT id FROM device WHERE id = ?', [deviceIdOrAlias]) as any;
    return device?.id || null;
  }
  const device = await queryOne('SELECT id FROM device WHERE alias = ?', [deviceIdOrAlias]) as any;
  return device?.id || null;
}

// PUT: 공지사항 수정
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string; noticeId: string }> }
) {
  try {
    const { deviceId: deviceIdOrAlias, noticeId } = await params;
    const { title, content, category, favorite } = await req.json();

    const deviceId = await getDeviceId(deviceIdOrAlias);
    if (!deviceId) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 공지사항 존재 확인
    const notice = await queryOne(
      'SELECT id FROM device_notices WHERE id = ? AND device_id = ?',
      [noticeId, deviceId]
    );

    if (!notice) {
      return NextResponse.json(
        { error: '공지사항을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    await execute(
      'UPDATE device_notices SET title = ?, content = ?, category = ?, favorite = ?, updatedAt = ? WHERE id = ?',
      [title, content, category || null, favorite ? 1 : 0, now, noticeId]
    );

    const updatedNotice = await queryOne('SELECT * FROM device_notices WHERE id = ?', [noticeId]);

    return NextResponse.json(updatedNotice);
  } catch (error) {
    console.error('공지사항 수정 오류:', error);
    return NextResponse.json(
      { error: '공지사항 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 공지사항 삭제
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ deviceId: string; noticeId: string }> }
) {
  try {
    const { deviceId: deviceIdOrAlias, noticeId } = await params;

    const deviceId = await getDeviceId(deviceIdOrAlias);
    if (!deviceId) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 공지사항 존재 확인
    const notice = await queryOne(
      'SELECT id FROM device_notices WHERE id = ? AND device_id = ?',
      [noticeId, deviceId]
    );

    if (!notice) {
      return NextResponse.json(
        { error: '공지사항을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    await execute('DELETE FROM device_notices WHERE id = ?', [noticeId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('공지사항 삭제 오류:', error);
    return NextResponse.json(
      { error: '공지사항 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PATCH: 공지사항 사용 기록 업데이트
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ deviceId: string; noticeId: string }> }
) {
  try {
    const { deviceId: deviceIdOrAlias, noticeId } = await params;

    const deviceId = await getDeviceId(deviceIdOrAlias);
    if (!deviceId) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    await execute(
      'UPDATE device_notices SET lastUsedAt = ?, usageCount = usageCount + 1 WHERE id = ? AND device_id = ?',
      [now, noticeId, deviceId]
    );

    const updatedNotice = await queryOne('SELECT * FROM device_notices WHERE id = ?', [noticeId]);

    return NextResponse.json(updatedNotice);
  } catch (error) {
    console.error('공지사항 사용 기록 업데이트 오류:', error);
    return NextResponse.json(
      { error: '공지사항 사용 기록 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
