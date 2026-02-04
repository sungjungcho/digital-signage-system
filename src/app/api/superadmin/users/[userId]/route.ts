import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { queryOne, queryAll, execute } from '@/lib/db';

// 슈퍼관리자 권한 확인
async function checkSuperAdmin(): Promise<boolean> {
  const headersList = await headers();
  const userRole = headersList.get('x-user-role');
  return userRole === 'superadmin';
}

// 사용자 정보 조회
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    if (!(await checkSuperAdmin())) {
      return NextResponse.json(
        { error: '슈퍼관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const { userId } = await params;

    const user = await queryOne(`
      SELECT id, username, email, role, status, name, max_devices, created_at, updated_at
      FROM users WHERE id = ?
    `, [userId]);

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 사용자의 디바이스 목록
    const devices = await queryAll(
      'SELECT id, name, location, alias FROM device WHERE user_id = ?',
      [userId]
    );

    return NextResponse.json({ ...user, devices });
  } catch (error) {
    console.error('사용자 조회 오류:', error);
    return NextResponse.json(
      { error: '사용자 정보를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 사용자 정보 수정 (상태 변경: 승인/거부, 역할 변경)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    if (!(await checkSuperAdmin())) {
      return NextResponse.json(
        { error: '슈퍼관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const { userId } = await params;
    const data = await req.json();

    // 사용자 존재 확인
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [userId]) as any;
    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 유효한 상태 값 확인
    if (data.status && !['pending', 'approved', 'rejected'].includes(data.status)) {
      return NextResponse.json(
        { error: '유효하지 않은 상태 값입니다.' },
        { status: 400 }
      );
    }

    // 유효한 역할 값 확인
    if (data.role && !['user', 'superadmin'].includes(data.role)) {
      return NextResponse.json(
        { error: '유효하지 않은 역할 값입니다.' },
        { status: 400 }
      );
    }

    // 자기 자신의 슈퍼관리자 역할 해제 방지
    const headersList = await headers();
    const currentUserId = headersList.get('x-user-id');
    if (currentUserId === userId && data.role === 'user') {
      return NextResponse.json(
        { error: '자신의 슈퍼관리자 권한을 해제할 수 없습니다.' },
        { status: 400 }
      );
    }

    // max_devices 유효성 검사
    if (data.max_devices !== undefined && (typeof data.max_devices !== 'number' || data.max_devices < 0)) {
      return NextResponse.json(
        { error: '유효하지 않은 디바이스 한도 값입니다.' },
        { status: 400 }
      );
    }

    // 업데이트
    const now = new Date().toISOString();

    await execute(`
      UPDATE users
      SET status = ?, role = ?, max_devices = ?, updated_at = ?
      WHERE id = ?
    `, [
      data.status || user.status,
      data.role || user.role,
      data.max_devices !== undefined ? data.max_devices : user.max_devices,
      now,
      userId
    ]);

    const updatedUser = await queryOne(`
      SELECT id, username, email, role, status, name, max_devices, created_at, updated_at
      FROM users WHERE id = ?
    `, [userId]);

    return NextResponse.json({
      message: '사용자 정보가 업데이트되었습니다.',
      user: updatedUser,
    });
  } catch (error) {
    console.error('사용자 수정 오류:', error);
    return NextResponse.json(
      { error: '사용자 정보 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 사용자 삭제
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    if (!(await checkSuperAdmin())) {
      return NextResponse.json(
        { error: '슈퍼관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const { userId } = await params;
    const headersList = await headers();
    const currentUserId = headersList.get('x-user-id');

    // 자기 자신 삭제 방지
    if (currentUserId === userId) {
      return NextResponse.json(
        { error: '자기 자신을 삭제할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 사용자 존재 확인
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 사용자의 디바이스를 슈퍼관리자에게 이전
    const superadmin = await queryOne(
      "SELECT id FROM users WHERE role = 'superadmin' AND id != ? LIMIT 1",
      [userId]
    ) as { id: string } | undefined;

    if (superadmin) {
      await execute('UPDATE device SET user_id = ? WHERE user_id = ?', [superadmin.id, userId]);
    } else {
      // 다른 슈퍼관리자가 없으면 user_id를 null로 설정
      await execute('UPDATE device SET user_id = NULL WHERE user_id = ?', [userId]);
    }

    // 사용자 세션 삭제
    await execute('DELETE FROM sessions WHERE user_id = ?', [userId]);

    // 사용자 삭제
    await execute('DELETE FROM users WHERE id = ?', [userId]);

    return NextResponse.json({
      message: '사용자가 삭제되었습니다.',
    });
  } catch (error) {
    console.error('사용자 삭제 오류:', error);
    return NextResponse.json(
      { error: '사용자 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
