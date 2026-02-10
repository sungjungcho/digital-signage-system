import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { queryOne } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // 사용자의 max_devices 조회
    const dbUser = await queryOne('SELECT max_devices FROM users WHERE id = ?', [user.userId]) as { max_devices: number } | undefined;

    return NextResponse.json({
      authenticated: true,
      user: {
        ...user,
        max_devices: dbUser?.max_devices || 3,
      },
    });
  } catch (error) {
    console.error('인증 확인 중 오류:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }
}
