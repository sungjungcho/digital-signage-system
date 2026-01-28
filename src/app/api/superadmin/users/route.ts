import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'signage.db');

// 슈퍼관리자 권한 확인
async function checkSuperAdmin(): Promise<boolean> {
  const headersList = await headers();
  const userRole = headersList.get('x-user-role');
  return userRole === 'superadmin';
}

// 모든 사용자 목록 조회 (슈퍼관리자 전용)
export async function GET() {
  try {
    if (!(await checkSuperAdmin())) {
      return NextResponse.json(
        { error: '슈퍼관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const db = new Database(dbPath);

    // 비밀번호 해시 제외하고 조회
    const users = db.prepare(`
      SELECT id, username, email, role, status, name, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `).all();

    // 각 사용자의 디바이스 수 조회
    const usersWithDeviceCount = users.map((user: any) => {
      const deviceCount = db.prepare(
        'SELECT COUNT(*) as count FROM device WHERE user_id = ?'
      ).get(user.id) as { count: number };

      return {
        ...user,
        deviceCount: deviceCount.count,
      };
    });

    db.close();

    return NextResponse.json(usersWithDeviceCount);
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '사용자 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
