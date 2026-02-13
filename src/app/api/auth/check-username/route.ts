import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { available: false, message: '아이디를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 아이디 형식 검증 (3-20자 영문, 숫자, 언더스코어)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { available: false, message: '아이디는 3-20자의 영문, 숫자, 언더스코어만 사용 가능합니다.' },
        { status: 400 }
      );
    }

    // DB에서 중복 확인
    const existingUser = await queryOne(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUser) {
      return NextResponse.json({
        available: false,
        message: '이미 사용 중인 아이디입니다.',
      });
    }

    return NextResponse.json({
      available: true,
      message: '사용 가능한 아이디입니다.',
    });
  } catch (error) {
    console.error('아이디 중복 확인 오류:', error);
    return NextResponse.json(
      { available: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
