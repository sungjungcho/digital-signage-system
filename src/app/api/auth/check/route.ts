import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { queryOne } from '@/lib/db';

interface DbUser {
  max_devices: number;
  email: string | null;
  phone: string | null;
  name: string | null;
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // 사용자 정보 조회
    const dbUser = await queryOne(
      'SELECT max_devices, email, phone, name FROM users WHERE id = ?',
      [user.userId]
    ) as DbUser | undefined;

    return NextResponse.json({
      authenticated: true,
      user: {
        ...user,
        max_devices: dbUser?.max_devices || 3,
        email: dbUser?.email || null,
        phone: dbUser?.phone || null,
        name: dbUser?.name || null,
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
