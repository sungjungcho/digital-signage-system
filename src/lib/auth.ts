import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { UserRole, UserStatus } from '@/types/user';

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const secret = new TextEncoder().encode(SECRET_KEY);

export interface AuthUser {
  userId: string;
  username: string;
  role: UserRole;
  status: UserStatus;
}

/**
 * 서버 컴포넌트에서 현재 사용자 정보를 가져옵니다.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as AuthUser;
  } catch (error) {
    console.error('토큰 검증 실패:', error);
    return null;
  }
}

/**
 * 사용자 인증 여부를 확인합니다.
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null && user.status === 'approved';
}

/**
 * 현재 사용자의 ID를 가져옵니다.
 */
export async function getUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.userId || null;
}

/**
 * 현재 사용자의 역할을 가져옵니다.
 */
export async function getRole(): Promise<UserRole | null> {
  const user = await getCurrentUser();
  return user?.role || null;
}

/**
 * 슈퍼관리자 여부를 확인합니다.
 */
export async function isSuperAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'superadmin' && user?.status === 'approved';
}

/**
 * 승인된 사용자 여부를 확인합니다.
 */
export async function isApproved(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.status === 'approved';
}
