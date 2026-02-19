import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// DELETE: 디바이스에서 콘텐츠 연결 해제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string; contentId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { deviceId, contentId } = await params;

    // 디바이스 존재 확인
    const device = await queryOne(
      'SELECT * FROM device WHERE id = ? OR alias = ?',
      [deviceId, deviceId]
    ) as any;

    if (!device) {
      return NextResponse.json({ error: '디바이스를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 권한 확인
    if (user.role !== 'superadmin' && device.user_id !== user.userId) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    // 연결 존재 확인
    const link = await queryOne(
      'SELECT id FROM device_content WHERE device_id = ? AND content_id = ?',
      [device.id, contentId]
    );

    if (!link) {
      return NextResponse.json({ error: '연결을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 연결 삭제
    await execute(
      'DELETE FROM device_content WHERE device_id = ? AND content_id = ?',
      [device.id, contentId]
    );

    return NextResponse.json({
      success: true,
      message: '연결이 해제되었습니다.'
    });
  } catch (error) {
    console.error('연결 해제 오류:', error);
    return NextResponse.json(
      { error: '연결 해제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT: 개별 연결 설정 수정 (스케줄 등)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string; contentId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { deviceId, contentId } = await params;
    const data = await request.json();

    // 디바이스 존재 확인
    const device = await queryOne(
      'SELECT * FROM device WHERE id = ? OR alias = ?',
      [deviceId, deviceId]
    ) as any;

    if (!device) {
      return NextResponse.json({ error: '디바이스를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 권한 확인
    if (user.role !== 'superadmin' && device.user_id !== user.userId) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    // 연결 존재 확인
    const link = await queryOne(
      'SELECT * FROM device_content WHERE device_id = ? AND content_id = ?',
      [device.id, contentId]
    ) as any;

    if (!link) {
      return NextResponse.json({ error: '연결을 찾을 수 없습니다.' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // 연결 설정 업데이트
    await execute(`
      UPDATE device_content SET
        active = ?,
        scheduleType = ?,
        specificDate = ?,
        daysOfWeek = ?,
        startDate = ?,
        endDate = ?,
        startTime = ?,
        endTime = ?,
        updatedAt = ?
      WHERE device_id = ? AND content_id = ?
    `, [
      data.active !== undefined ? (data.active ? 1 : 0) : link.active,
      data.scheduleType ?? link.scheduleType,
      data.specificDate ?? link.specificDate,
      data.daysOfWeek ?? link.daysOfWeek,
      data.startDate ?? link.startDate,
      data.endDate ?? link.endDate,
      data.startTime ?? link.startTime,
      data.endTime ?? link.endTime,
      now,
      device.id,
      contentId
    ]);

    const updatedLink = await queryOne(
      'SELECT * FROM device_content WHERE device_id = ? AND content_id = ?',
      [device.id, contentId]
    );

    return NextResponse.json(updatedLink);
  } catch (error) {
    console.error('연결 수정 오류:', error);
    return NextResponse.json(
      { error: '연결 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
