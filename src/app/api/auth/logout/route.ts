import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json(
      { message: '로그아웃 성공' },
      { status: 200 }
    );

    // 쿠키 삭제
    response.cookies.delete('auth_token');

    return response;
  } catch (error) {
    console.error('로그아웃 처리 중 오류:', error);
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
