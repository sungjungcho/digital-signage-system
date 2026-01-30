import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

const dbPath = path.join(process.cwd(), 'data', 'signage.db');

// 사용자의 디바이스 추가 요청 목록 조회 또는 슈퍼관리자의 모든 요청 조회
export async function GET() {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const db = new Database(dbPath);

    let requests;
    if (userRole === 'superadmin') {
      // 슈퍼관리자는 모든 대기 중인 요청 조회
      requests = db.prepare(`
        SELECT dr.*, u.username, u.name as user_name,
               (SELECT COUNT(*) FROM device WHERE user_id = dr.user_id) as current_device_count
        FROM device_requests dr
        JOIN users u ON dr.user_id = u.id
        ORDER BY
          CASE WHEN dr.status = 'pending' THEN 0 ELSE 1 END,
          dr.created_at DESC
      `).all();
    } else {
      // 일반 사용자는 본인 요청만 조회
      requests = db.prepare(`
        SELECT * FROM device_requests
        WHERE user_id = ?
        ORDER BY created_at DESC
      `).all(userId);
    }

    db.close();

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching device requests:', error);
    return NextResponse.json(
      { error: '요청 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 디바이스 추가 요청 생성
export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 슈퍼관리자는 요청할 필요 없음
    if (userRole === 'superadmin') {
      return NextResponse.json(
        { error: '슈퍼관리자는 디바이스 제한이 없습니다.' },
        { status: 400 }
      );
    }

    const data = await req.json();
    const { requestedCount, reason } = data;

    if (!requestedCount || requestedCount < 1) {
      return NextResponse.json(
        { error: '요청할 디바이스 수를 입력해주세요.' },
        { status: 400 }
      );
    }

    const db = new Database(dbPath);

    // 현재 사용자의 max_devices 확인
    const user = db.prepare('SELECT max_devices FROM users WHERE id = ?').get(userId) as { max_devices: number } | undefined;
    const currentMax = user?.max_devices ?? 3;

    // 이미 대기 중인 요청이 있는지 확인
    const pendingRequest = db.prepare(`
      SELECT id FROM device_requests
      WHERE user_id = ? AND status = 'pending'
    `).get(userId);

    if (pendingRequest) {
      db.close();
      return NextResponse.json(
        { error: '이미 대기 중인 요청이 있습니다.' },
        { status: 400 }
      );
    }

    const requestId = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO device_requests (id, user_id, requested_count, current_max, reason, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(requestId, userId, requestedCount, currentMax, reason || null, now, now);

    const newRequest = db.prepare('SELECT * FROM device_requests WHERE id = ?').get(requestId);
    db.close();

    return NextResponse.json(newRequest);
  } catch (error) {
    console.error('Error creating device request:', error);
    return NextResponse.json(
      { error: '요청 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
