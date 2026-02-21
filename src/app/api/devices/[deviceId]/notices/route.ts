import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { queryOne, queryAll, execute } from '@/lib/db';
import { ensureNoticeSchema } from '@/lib/noticeSchema';

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

// GET: 디바이스별 공지사항 목록 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    await ensureNoticeSchema();

    const { deviceId: deviceIdOrAlias } = await params;
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const forDisplay = searchParams.get('forDisplay') === '1';

    const deviceId = await getDeviceId(deviceIdOrAlias);
    if (!deviceId) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    let query = 'SELECT * FROM device_notices WHERE device_id = ?';
    const queryParams: any[] = [deviceId];

    if (forDisplay) {
      const now = new Date().toISOString();
      query += ' AND active = 1 AND (startAt IS NULL OR startAt <= ?) AND (endAt IS NULL OR endAt >= ?)';
      queryParams.push(now, now);
    }

    if (category && category !== 'all') {
      query += ' AND category = ?';
      queryParams.push(category);
    }

    if (search) {
      query += ' AND (title LIKE ? OR content LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY priority DESC, favorite DESC, lastUsedAt DESC, createdAt DESC';

    const notices = await queryAll(query, queryParams);

    return NextResponse.json(notices);
  } catch (error) {
    console.error('공지사항 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '공지사항 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 공지사항 생성
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    await ensureNoticeSchema();

    const { deviceId: deviceIdOrAlias } = await params;
    const { title, content, category, active, priority, startAt, endAt } = await req.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: '제목과 내용은 필수입니다.' },
        { status: 400 }
      );
    }

    const deviceId = await getDeviceId(deviceIdOrAlias);
    if (!deviceId) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const noticeId = randomUUID();
    const now = new Date().toISOString();

    await execute(`
      INSERT INTO device_notices (
        id, device_id, title, content, category, favorite, usageCount, active, priority, startAt, endAt, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      noticeId,
      deviceId,
      title,
      content,
      category || null,
      0,
      0,
      active === undefined ? 1 : (active ? 1 : 0),
      Number.isFinite(Number(priority)) ? Number(priority) : 0,
      startAt || null,
      endAt || null,
      now,
      now
    ]);

    const newNotice = await queryOne('SELECT * FROM device_notices WHERE id = ?', [noticeId]);

    return NextResponse.json(newNotice);
  } catch (error) {
    console.error('공지사항 생성 오류:', error);
    return NextResponse.json(
      { error: '공지사항 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 디바이스의 모든 공지사항 삭제
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId: deviceIdOrAlias } = await params;

    const deviceId = await getDeviceId(deviceIdOrAlias);
    if (!deviceId) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    await execute('DELETE FROM device_notices WHERE device_id = ?', [deviceId]);

    return NextResponse.json({ success: true, message: '모든 공지사항이 삭제되었습니다.' });
  } catch (error) {
    console.error('공지사항 전체 삭제 오류:', error);
    return NextResponse.json(
      { error: '공지사항 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
