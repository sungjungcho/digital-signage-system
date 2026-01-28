import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';
import type { User } from '@/types/user';

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const secret = new TextEncoder().encode(SECRET_KEY);
const dbPath = path.join(process.cwd(), 'data', 'signage.db');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { message: '아이디와 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    const db = new Database(dbPath);

    // 사용자 조회
    const user = db.prepare(
      'SELECT * FROM users WHERE username = ?'
    ).get(username) as User | undefined;

    if (!user) {
      db.close();
      return NextResponse.json(
        { message: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // 비밀번호 검증
    const isValidPassword = await bcrypt.compare(password, user.password_hash || '');
    if (!isValidPassword) {
      db.close();
      return NextResponse.json(
        { message: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // 승인 상태 확인
    if (user.status === 'pending') {
      db.close();
      return NextResponse.json(
        { message: '계정 승인 대기 중입니다. 관리자에게 문의하세요.' },
        { status: 403 }
      );
    }

    if (user.status === 'rejected') {
      db.close();
      return NextResponse.json(
        { message: '계정이 거절되었습니다. 관리자에게 문의하세요.' },
        { status: 403 }
      );
    }

    db.close();

    // JWT 토큰 생성 (userId, username, role, status 포함)
    const token = await new SignJWT({
      userId: user.id,
      username: user.username,
      role: user.role,
      status: user.status,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    // 응답 생성
    const response = NextResponse.json(
      {
        message: '로그인 성공',
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          status: user.status,
          name: user.name,
        },
      },
      { status: 200 }
    );

    // 쿠키에 토큰 설정
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24시간
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('로그인 처리 중 오류:', error);
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
