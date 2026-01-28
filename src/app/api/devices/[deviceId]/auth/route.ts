import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID, createHash } from 'crypto';
import bcrypt from 'bcryptjs';

const dbPath = path.join(process.cwd(), 'data', 'signage.db');
const BCRYPT_ROUNDS = 12; // bcrypt 해싱 라운드 (10-12 권장)
const SESSION_EXPIRY_DAYS = 7; // 세션 만료 기간 (일)
const SESSION_EXPIRY_MS = SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// 세션 테이블에 expires_at 컬럼 추가 (마이그레이션)
function ensureExpiresAtColumn(db: Database.Database) {
  try {
    const tableInfo = db.prepare("PRAGMA table_info(device_sessions)").all() as any[];
    const hasExpiresAt = tableInfo.some((col: any) => col.name === 'expires_at');
    if (!hasExpiresAt) {
      db.prepare("ALTER TABLE device_sessions ADD COLUMN expires_at TEXT").run();
    }
  } catch (error) {
    console.error('expires_at 컬럼 추가 오류:', error);
  }
}

// UUID 형식인지 확인하는 함수
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// deviceId 또는 alias로 디바이스 정보 조회
function findDevice(db: Database.Database, deviceIdOrAlias: string) {
  if (isUUID(deviceIdOrAlias)) {
    return db.prepare('SELECT id, alias FROM device WHERE id = ?').get(deviceIdOrAlias) as any;
  }
  return db.prepare('SELECT id, alias FROM device WHERE alias = ?').get(deviceIdOrAlias) as any;
}

// 기존 SHA-256 해싱 함수 (마이그레이션용)
function hashPasswordSHA256(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

// bcrypt 해시인지 확인 (bcrypt 해시는 $2a$, $2b$, $2y$로 시작)
function isBcryptHash(hash: string): boolean {
  return hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$');
}

// 비밀번호 검증 (bcrypt 또는 SHA-256)
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (isBcryptHash(hash)) {
    return bcrypt.compare(password, hash);
  }
  // 기존 SHA-256 해시와 비교
  return hashPasswordSHA256(password) === hash;
}

// bcrypt로 비밀번호 해싱
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// POST: 디바이스 로그인
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId: deviceIdOrAlias } = await params;
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: '아이디와 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    const db = new Database(dbPath);

    // 디바이스 존재 확인 (id 또는 alias로)
    const device = findDevice(db, deviceIdOrAlias);
    if (!device) {
      db.close();
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const deviceId = device.id;

    // 계정 확인
    const account = db.prepare(
      'SELECT * FROM device_accounts WHERE device_id = ? AND username = ?'
    ).get(deviceId, username) as any;

    if (!account) {
      db.close();
      return NextResponse.json(
        { error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // 비밀번호 확인 (bcrypt 또는 SHA-256)
    const isValidPassword = await verifyPassword(password, account.password_hash);
    if (!isValidPassword) {
      db.close();
      return NextResponse.json(
        { error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // SHA-256 해시인 경우 bcrypt로 마이그레이션
    if (!isBcryptHash(account.password_hash)) {
      const newHash = await hashPassword(password);
      db.prepare('UPDATE device_accounts SET password_hash = ? WHERE id = ?').run(newHash, account.id);
    }

    // expires_at 컬럼 마이그레이션 확인
    ensureExpiresAtColumn(db);

    // 기존 세션 삭제 후 새 세션 생성
    db.prepare('DELETE FROM device_sessions WHERE device_id = ?').run(deviceId);

    const sessionId = randomUUID();
    const token = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_EXPIRY_MS);

    db.prepare(
      'INSERT INTO device_sessions (id, device_id, token, created_at, expires_at) VALUES (?, ?, ?, ?, ?)'
    ).run(sessionId, deviceId, token, now.toISOString(), expiresAt.toISOString());

    db.close();

    // 응답 생성
    const response = NextResponse.json({
      success: true,
      token,
      message: '로그인 성공'
    });

    // 쿠키에 토큰 설정 (HttpOnly로 설정하여 보안 강화)
    // 쿠키 이름은 항상 deviceId(UUID) 사용 (한글 alias 문제 방지)
    response.cookies.set(`device_token_${deviceId}`, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60, // 초 단위
    });

    return response;
  } catch (error) {
    console.error('디바이스 로그인 오류:', error);
    return NextResponse.json(
      { error: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// GET: 토큰 검증
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId: deviceIdOrAlias } = await params;
    const db = new Database(dbPath);

    // 디바이스 존재 확인 (id 또는 alias로)
    const device = findDevice(db, deviceIdOrAlias);
    if (!device) {
      db.close();
      return NextResponse.json(
        { valid: false, error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const deviceId = device.id;

    // 헤더 또는 쿠키에서 토큰 확인 (UUID 기반 쿠키)
    const headerToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    const cookieToken = req.cookies.get(`device_token_${deviceId}`)?.value;
    const token = headerToken || cookieToken;

    if (!token) {
      db.close();
      return NextResponse.json(
        { valid: false, error: '토큰이 필요합니다.' },
        { status: 401 }
      );
    }

    const session = db.prepare(
      'SELECT * FROM device_sessions WHERE device_id = ? AND token = ?'
    ).get(deviceId, token) as any;

    if (!session) {
      db.close();
      return NextResponse.json(
        { valid: false, error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

    // 세션 만료 시간 확인
    if (session.expires_at) {
      const expiresAt = new Date(session.expires_at);
      if (expiresAt < new Date()) {
        // 만료된 세션 삭제
        db.prepare('DELETE FROM device_sessions WHERE id = ?').run(session.id);
        db.close();
        return NextResponse.json(
          { valid: false, error: '세션이 만료되었습니다. 다시 로그인해주세요.' },
          { status: 401 }
        );
      }
    }

    db.close();
    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('토큰 검증 오류:', error);
    return NextResponse.json(
      { valid: false, error: '토큰 검증 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 로그아웃 (세션 삭제)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId: deviceIdOrAlias } = await params;
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');

    const db = new Database(dbPath);

    // 디바이스 존재 확인 (id 또는 alias로)
    const device = findDevice(db, deviceIdOrAlias);
    if (!device) {
      db.close();
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const deviceId = device.id;

    if (token) {
      db.prepare('DELETE FROM device_sessions WHERE device_id = ? AND token = ?').run(deviceId, token);
    } else {
      // 관리자용: 모든 세션 삭제
      db.prepare('DELETE FROM device_sessions WHERE device_id = ?').run(deviceId);
    }

    db.close();

    return NextResponse.json({ success: true, message: '로그아웃 성공' });
  } catch (error) {
    console.error('로그아웃 오류:', error);
    return NextResponse.json(
      { error: '로그아웃 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
