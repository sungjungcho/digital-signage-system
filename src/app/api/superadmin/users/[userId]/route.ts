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
    const db = new Database(dbPath);

    const user = db.prepare(`
      SELECT id, username, email, role, status, name, created_at, updated_at
      FROM users WHERE id = ?
    `).get(userId);

    if (!user) {
      db.close();
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 사용자의 디바이스 목록
    const devices = db.prepare(
      'SELECT id, name, location, alias FROM device WHERE user_id = ?'
    ).all(userId);

    db.close();

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
    const db = new Database(dbPath);

    // 사용자 존재 확인
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      db.close();
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 유효한 상태 값 확인
    if (data.status && !['pending', 'approved', 'rejected'].includes(data.status)) {
      db.close();
      return NextResponse.json(
        { error: '유효하지 않은 상태 값입니다.' },
        { status: 400 }
      );
    }

    // 유효한 역할 값 확인
    if (data.role && !['user', 'superadmin'].includes(data.role)) {
      db.close();
      return NextResponse.json(
        { error: '유효하지 않은 역할 값입니다.' },
        { status: 400 }
      );
    }

    // 자기 자신의 슈퍼관리자 역할 해제 방지
    const headersList = await headers();
    const currentUserId = headersList.get('x-user-id');
    if (currentUserId === userId && data.role === 'user') {
      db.close();
      return NextResponse.json(
        { error: '자신의 슈퍼관리자 권한을 해제할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 업데이트
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE users
      SET status = ?, role = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      data.status || user.status,
      data.role || user.role,
      now,
      userId
    );

    const updatedUser = db.prepare(`
      SELECT id, username, email, role, status, name, created_at, updated_at
      FROM users WHERE id = ?
    `).get(userId);

    db.close();

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

    const db = new Database(dbPath);

    // 사용자 존재 확인
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      db.close();
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 사용자의 디바이스를 슈퍼관리자에게 이전
    const superadmin = db.prepare(
      "SELECT id FROM users WHERE role = 'superadmin' AND id != ? LIMIT 1"
    ).get(userId) as { id: string } | undefined;

    if (superadmin) {
      db.prepare('UPDATE device SET user_id = ? WHERE user_id = ?').run(superadmin.id, userId);
    } else {
      // 다른 슈퍼관리자가 없으면 user_id를 null로 설정
      db.prepare('UPDATE device SET user_id = NULL WHERE user_id = ?').run(userId);
    }

    // 사용자 세션 삭제
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);

    // 사용자 삭제
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    db.close();

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
