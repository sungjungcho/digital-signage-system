import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { queryOne, queryAll, execute } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET: 디바이스에 연결된 콘텐츠 목록 조회 (새 구조)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { deviceId } = await params;

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

    // 연결된 콘텐츠 조회 (content 테이블과 JOIN)
    const linkedContents = await queryAll(`
      SELECT
        c.*,
        dc.id as link_id,
        dc.\`order\`,
        dc.active,
        dc.scheduleType,
        dc.specificDate,
        dc.daysOfWeek,
        dc.startDate,
        dc.endDate,
        dc.startTime,
        dc.endTime
      FROM device_content dc
      JOIN content c ON dc.content_id = c.id
      WHERE dc.device_id = ?
      ORDER BY dc.\`order\` ASC
    `, [device.id]);

    return NextResponse.json(linkedContents);
  } catch (error) {
    console.error('연결된 콘텐츠 조회 오류:', error);
    return NextResponse.json(
      { error: '콘텐츠 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 디바이스에 콘텐츠 연결
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { deviceId } = await params;
    const data = await request.json();
    const { contentId, contentIds } = data;

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

    // 현재 최대 order 값 조회
    const maxOrder = await queryOne(
      'SELECT MAX(`order`) as maxOrder FROM device_content WHERE device_id = ?',
      [device.id]
    ) as any;
    let nextOrder = (maxOrder?.maxOrder ?? -1) + 1;

    const now = new Date().toISOString();
    const linkedIds: string[] = [];

    // 단일 또는 다중 콘텐츠 연결
    const idsToLink = contentIds || (contentId ? [contentId] : []);

    for (const cId of idsToLink) {
      // 콘텐츠 존재 확인
      const content = await queryOne(
        'SELECT id, user_id FROM content WHERE id = ?',
        [cId]
      ) as any;
      if (!content) {
        continue;
      }

      // 슈퍼관리자가 아니면 자신의 콘텐츠만 연결 가능
      if (user.role !== 'superadmin' && content.user_id !== user.userId) {
        continue;
      }

      // 이미 연결되어 있는지 확인
      const existing = await queryOne(
        'SELECT id FROM device_content WHERE device_id = ? AND content_id = ?',
        [device.id, cId]
      );

      if (existing) {
        continue; // 이미 연결됨
      }

      // 연결 생성
      const linkId = randomUUID();
      await execute(`
        INSERT INTO device_content (
          id, device_id, content_id, \`order\`, active,
          scheduleType, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        linkId,
        device.id,
        cId,
        nextOrder++,
        1,
        'always',
        now,
        now
      ]);

      linkedIds.push(linkId);
    }

    return NextResponse.json({
      success: true,
      message: `${linkedIds.length}개의 콘텐츠가 연결되었습니다.`,
      linkedIds
    });
  } catch (error) {
    console.error('콘텐츠 연결 오류:', error);
    return NextResponse.json(
      { error: '콘텐츠 연결 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT: 콘텐츠 순서 변경
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { deviceId } = await params;
    const data = await request.json();
    const { orderedContentIds } = data;

    if (!Array.isArray(orderedContentIds)) {
      return NextResponse.json({ error: 'orderedContentIds 배열이 필요합니다.' }, { status: 400 });
    }

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

    const now = new Date().toISOString();

    // 순서 업데이트
    for (let i = 0; i < orderedContentIds.length; i++) {
      await execute(
        'UPDATE device_content SET `order` = ?, updatedAt = ? WHERE device_id = ? AND content_id = ?',
        [i, now, device.id, orderedContentIds[i]]
      );
    }

    return NextResponse.json({
      success: true,
      message: '순서가 변경되었습니다.'
    });
  } catch (error) {
    console.error('순서 변경 오류:', error);
    return NextResponse.json(
      { error: '순서 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
