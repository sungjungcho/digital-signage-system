import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'signage.db');

// 모든 디바이스 요청 조회 (슈퍼관리자 전용)
export async function GET() {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role');

    if (!userId || userRole !== 'superadmin') {
      return NextResponse.json(
        { error: '슈퍼관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const db = new Database(dbPath);

    const requests = db.prepare(`
      SELECT dr.*, u.username, u.name as user_name, u.max_devices as user_max_devices,
             (SELECT COUNT(*) FROM device WHERE user_id = dr.user_id) as current_device_count
      FROM device_requests dr
      JOIN users u ON dr.user_id = u.id
      ORDER BY
        CASE WHEN dr.status = 'pending' THEN 0 ELSE 1 END,
        dr.created_at DESC
    `).all();

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

// 디바이스 요청 승인/거절 (슈퍼관리자 전용)
export async function PATCH(req: Request) {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role');

    if (!userId || userRole !== 'superadmin') {
      return NextResponse.json(
        { error: '슈퍼관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const data = await req.json();
    const { requestId, action, approvedCount } = data;

    if (!requestId || !action) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: '잘못된 액션입니다.' },
        { status: 400 }
      );
    }

    const db = new Database(dbPath);

    // 요청 조회
    const request = db.prepare(`
      SELECT * FROM device_requests WHERE id = ? AND status = 'pending'
    `).get(requestId) as {
      id: string;
      user_id: string;
      requested_count: number;
      current_max: number;
    } | undefined;

    if (!request) {
      db.close();
      return NextResponse.json(
        { error: '요청을 찾을 수 없거나 이미 처리되었습니다.' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      // 승인: 사용자의 max_devices 업데이트
      const newMaxDevices = approvedCount || (request.current_max + request.requested_count);

      db.prepare(`
        UPDATE users SET max_devices = ?, updated_at = ? WHERE id = ?
      `).run(newMaxDevices, now, request.user_id);

      db.prepare(`
        UPDATE device_requests
        SET status = 'approved', approved_count = ?, approved_by = ?, approved_at = ?, updated_at = ?
        WHERE id = ?
      `).run(newMaxDevices, userId, now, now, requestId);
    } else {
      // 거절
      db.prepare(`
        UPDATE device_requests
        SET status = 'rejected', approved_by = ?, approved_at = ?, updated_at = ?
        WHERE id = ?
      `).run(userId, now, now, requestId);
    }

    const updatedRequest = db.prepare('SELECT * FROM device_requests WHERE id = ?').get(requestId);
    db.close();

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Error processing device request:', error);
    return NextResponse.json(
      { error: '요청 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
