import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

// 환경변수에서 시크릿 키를 가져오거나 기본값 사용 (프로덕션에서는 반드시 환경변수 사용)
const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const secret = new TextEncoder().encode(SECRET_KEY);

// 임시 관리자 계정 (실제로는 데이터베이스에서 관리해야 함)
const ADMIN_USERS = [
  { username: 'admin', password: 'admin123' },
  { username: 'manager', password: 'manager123' },
];

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

    // 사용자 인증 확인
    const user = ADMIN_USERS.find(
      (u) => u.username === username && u.password === password
    );

    if (!user) {
      return NextResponse.json(
        { message: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // JWT 토큰 생성
    const token = await new SignJWT({ username })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h') // 24시간 후 만료
      .sign(secret);

    // 응답 생성
    const response = NextResponse.json(
      {
        message: '로그인 성공',
        token,
        user: { username },
      },
      { status: 200 }
    );

    // 쿠키에 토큰 설정 (HttpOnly, Secure)
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
