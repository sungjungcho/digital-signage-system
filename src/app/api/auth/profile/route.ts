import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { queryOne, execute } from '@/lib/db';
import bcrypt from 'bcryptjs';

interface DbUser {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  password_hash: string;
}

// 사용자 프로필 조회
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const dbUser = await queryOne(
      'SELECT id, username, email, phone, name FROM users WHERE id = ?',
      [user.userId]
    ) as DbUser | undefined;

    if (!dbUser) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      phone: dbUser.phone,
      name: dbUser.name,
    });
  } catch (error) {
    console.error('프로필 조회 중 오류:', error);
    return NextResponse.json(
      { error: '프로필 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 사용자 프로필 수정
export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const data = await req.json();
    const { email, phone, name, currentPassword, newPassword } = data;

    // 현재 사용자 정보 조회
    const dbUser = await queryOne(
      'SELECT * FROM users WHERE id = ?',
      [user.userId]
    ) as DbUser | undefined;

    if (!dbUser) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 비밀번호 변경 시 현재 비밀번호 확인
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: '현재 비밀번호를 입력해주세요.' },
          { status: 400 }
        );
      }

      const isValidPassword = await bcrypt.compare(currentPassword, dbUser.password_hash);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: '현재 비밀번호가 일치하지 않습니다.' },
          { status: 400 }
        );
      }

      if (newPassword.length < 4) {
        return NextResponse.json(
          { error: '새 비밀번호는 4자 이상이어야 합니다.' },
          { status: 400 }
        );
      }
    }

    // 이메일 중복 확인 (변경하려는 경우)
    if (email && email !== dbUser.email) {
      const existingEmail = await queryOne(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, user.userId]
      );
      if (existingEmail) {
        return NextResponse.json(
          { error: '이미 사용 중인 이메일입니다.' },
          { status: 400 }
        );
      }
    }

    // 이메일 형식 검증
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: '올바른 이메일 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    // 전화번호 형식 검증 (선택적)
    if (phone && !/^[0-9\-+() ]+$/.test(phone)) {
      return NextResponse.json(
        { error: '올바른 전화번호 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    // 업데이트할 필드 준비
    const now = new Date().toISOString();
    let passwordHash = dbUser.password_hash;

    if (newPassword) {
      passwordHash = await bcrypt.hash(newPassword, 12);
    }

    await execute(
      `UPDATE users
       SET email = ?, phone = ?, name = ?, password_hash = ?, updated_at = ?
       WHERE id = ?`,
      [
        email !== undefined ? email : dbUser.email,
        phone !== undefined ? phone : dbUser.phone,
        name !== undefined ? name : dbUser.name,
        passwordHash,
        now,
        user.userId
      ]
    );

    return NextResponse.json({
      message: '프로필이 성공적으로 수정되었습니다.',
      passwordChanged: !!newPassword,
    });
  } catch (error) {
    console.error('프로필 수정 중 오류:', error);
    return NextResponse.json(
      { error: '프로필 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
