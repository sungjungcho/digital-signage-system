export type UserRole = 'user' | 'superadmin';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  username: string;
  email: string | null;
  password_hash?: string;
  role: UserRole;
  status: UserStatus;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

// API 응답용 (비밀번호 해시 제외)
export type SafeUser = Omit<User, 'password_hash'>;

// JWT 페이로드
export interface JWTPayload {
  userId: string;
  username: string;
  role: UserRole;
  status: UserStatus;
}
