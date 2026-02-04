import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { queryOne, execute } from '@/lib/db';

const BCRYPT_ROUNDS = 12;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, email, name } = body;

    // 필수 필드 검증
    if (!username || !password) {
      return NextResponse.json(
        { message: '아이디와 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 아이디 형식 검증 (영문, 숫자, 언더스코어만 허용)
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        { message: '아이디는 3-20자의 영문, 숫자, 언더스코어만 사용 가능합니다.' },
        { status: 400 }
      );
    }

    // 비밀번호 길이 검증
    if (password.length < 4) {
      return NextResponse.json(
        { message: '비밀번호는 4자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증 (선택사항)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { message: '올바른 이메일 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    // 중복 아이디 확인
    const existingUser = await queryOne('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return NextResponse.json(
        { message: '이미 사용 중인 아이디입니다.' },
        { status: 409 }
      );
    }

    // 중복 이메일 확인 (이메일이 제공된 경우)
    if (email) {
      const existingEmail = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
      if (existingEmail) {
        return NextResponse.json(
          { message: '이미 사용 중인 이메일입니다.' },
          { status: 409 }
        );
      }
    }

    // 비밀번호 해싱
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userId = randomUUID();
    const now = new Date().toISOString();

    // 사용자 생성 (status: pending)
    await execute(
      'INSERT INTO users (id, username, email, password_hash, role, status, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, username, email || null, passwordHash, 'user', 'pending', name || null, now, now]
    );

    return NextResponse.json(
      {
        message: '회원가입이 완료되었습니다. 관리자 승인 후 로그인이 가능합니다.',
        user: {
          id: userId,
          username,
          email: email || null,
          name: name || null,
          status: 'pending',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('회원가입 처리 중 오류:', error);
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
