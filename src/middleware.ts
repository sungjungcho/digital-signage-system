import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { SERVER_START_TIME } from '@/lib/serverSession';

// JWT 시크릿 키
const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const secret = new TextEncoder().encode(SECRET_KEY);

// JWT 페이로드 타입
interface JWTPayload {
  userId: string;
  username: string;
  role: 'user' | 'superadmin';
  status: 'pending' | 'approved' | 'rejected';
  serverStartTime?: number;
}

// JWT 토큰 검증
async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ============================
  // 1. 공개 경로 (인증 불필요)
  // ============================
  const publicPaths = [
    '/login',
    '/register',
    '/api/auth/login',
    '/api/auth/register',
  ];

  if (publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next();
  }

  // 디스플레이 페이지 - PIN 검증은 클라이언트에서 처리
  if (pathname.startsWith('/display/')) {
    return NextResponse.next();
  }

  // PIN 검증 API - 공개 접근 허용
  if (pathname.match(/^\/api\/devices\/[^/]+\/verify-pin$/)) {
    return NextResponse.next();
  }

  // ============================
  // 2. 인증 토큰 확인
  // ============================
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    // API 요청은 401 반환
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }
    // 페이지 요청은 로그인 페이지로 리다이렉트
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = await verifyToken(token);

  if (!payload) {
    // 토큰이 유효하지 않음
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ message: '인증이 만료되었습니다.' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url));

    // 유효하지 않은 쿠키 삭제
    response.cookies.delete('auth_token');
    return response;
  }

  // 서버 재시작 후 발급된 토큰인지 확인 (SERVER_START_TIME이 0이 아닐 때만)
  if (SERVER_START_TIME !== 0 && payload.serverStartTime !== SERVER_START_TIME) {
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ message: '세션이 만료되었습니다. 다시 로그인해주세요.' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url));

    // 이전 서버 세션의 쿠키 삭제
    response.cookies.delete('auth_token');
    return response;
  }

  // 승인된 사용자만 접근 가능
  if (payload.status !== 'approved') {
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ message: '계정이 승인되지 않았습니다.' }, { status: 403 })
      : NextResponse.redirect(new URL('/login', request.url));

    response.cookies.delete('auth_token');
    return response;
  }

  // ============================
  // 3. 슈퍼관리자 전용 경로
  // ============================
  if (pathname.startsWith('/superadmin') || pathname.startsWith('/api/superadmin')) {
    if (payload.role !== 'superadmin') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { message: '슈퍼관리자 권한이 필요합니다.' },
          { status: 403 }
        );
      }
      // 일반 사용자는 관리자 페이지로 리다이렉트
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // ============================
  // 4. 인증 완료 - 요청 헤더에 사용자 정보 추가
  // ============================
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-role', payload.role);
  requestHeaders.set('x-user-status', payload.status);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * 정적 파일과 Next.js 내부 경로 제외
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
