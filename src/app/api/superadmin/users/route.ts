import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { queryAll, queryOne } from '@/lib/db';

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

    // 비밀번호 해시 제외하고 조회
    const users = await queryAll(`
      SELECT id, username, email, role, status, name, max_devices, created_at, updated_at
      FROM users
      ORDER BY CASE WHEN role = 'superadmin' THEN 0 ELSE 1 END, created_at DESC
    `);

    // 각 사용자의 디바이스 수 조회
    const usersWithDeviceCount = await Promise.all(
      users.map(async (user: any) => {
        const deviceCount = await queryOne(
          'SELECT COUNT(*) as count FROM device WHERE user_id = ?',
          [user.id]
        ) as { count: number };

        return {
          ...user,
          deviceCount: deviceCount.count,
        };
      })
    );

    return NextResponse.json(usersWithDeviceCount);
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '사용자 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
