import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { queryOne, execute } from '@/lib/db';

const BCRYPT_ROUNDS = 12; // bcrypt 해싱 라운드 (10-12 권장)

// UUID 형식인지 확인하는 함수
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// deviceId 또는 alias로 실제 deviceId 조회
async function getDeviceId(deviceIdOrAlias: string): Promise<string | null> {
  if (isUUID(deviceIdOrAlias)) {
    const device = await queryOne('SELECT id FROM device WHERE id = ?', [deviceIdOrAlias]);
    return device?.id || null;
  }
  const device = await queryOne('SELECT id FROM device WHERE alias = ?', [deviceIdOrAlias]);
  return device?.id || null;
}

// bcrypt로 비밀번호 해싱
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// GET: 계정 정보 조회 (비밀번호 제외)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId: deviceIdOrAlias } = await params;

    const deviceId = await getDeviceId(deviceIdOrAlias);
    if (!deviceId) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.', hasAccount: false },
        { status: 404 }
      );
    }

    const account = await queryOne(
      'SELECT id, device_id, username, created_at, updated_at FROM device_accounts WHERE device_id = ?',
      [deviceId]
    );

    // 세션 정보도 함께 조회
    const session = await queryOne(
      'SELECT id, created_at FROM device_sessions WHERE device_id = ?',
      [deviceId]
    );

    if (!account) {
      return NextResponse.json({ hasAccount: false, deviceId });
    }

    return NextResponse.json({
      hasAccount: true,
      deviceId,
      account: {
        id: account.id,
        username: account.username,
        createdAt: account.created_at,
        updatedAt: account.updated_at,
      },
      session: session ? {
        id: session.id,
        createdAt: session.created_at,
      } : null,
    });
  } catch (error) {
    console.error('계정 조회 오류:', error);
    return NextResponse.json(
      { error: '계정 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 계정 생성
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId: deviceIdOrAlias } = await params;
    const body = await req.json();
    const username = body.username?.trim();
    const password = body.password;

    if (!username || !password) {
      return NextResponse.json(
        { error: '아이디와 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: '비밀번호는 4자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 디바이스 존재 확인 (id 또는 alias로)
    const deviceId = await getDeviceId(deviceIdOrAlias);
    if (!deviceId) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 기존 계정 확인
    const existingAccount = await queryOne(
      'SELECT id FROM device_accounts WHERE device_id = ?',
      [deviceId]
    );

    if (existingAccount) {
      return NextResponse.json(
        { error: '이미 계정이 존재합니다. 수정하려면 PUT 메서드를 사용하세요.' },
        { status: 409 }
      );
    }

    const accountId = randomUUID();
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    await execute(
      'INSERT INTO device_accounts (id, device_id, username, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
      [accountId, deviceId, username, passwordHash, now]
    );

    return NextResponse.json({
      success: true,
      message: '계정이 생성되었습니다.',
      account: {
        id: accountId,
        username,
        createdAt: now,
      },
    });
  } catch (error) {
    console.error('계정 생성 오류:', error);
    return NextResponse.json(
      { error: '계정 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT: 계정 수정 (비밀번호 변경)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId: deviceIdOrAlias } = await params;
    const body = await req.json();
    const username = body.username?.trim();
    const password = body.password;

    const deviceId = await getDeviceId(deviceIdOrAlias);
    if (!deviceId) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const existingAccount = await queryOne(
      'SELECT id FROM device_accounts WHERE device_id = ?',
      [deviceId]
    );

    if (!existingAccount) {
      return NextResponse.json(
        { error: '계정이 존재하지 않습니다.' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];

    if (username) {
      updates.push('username = ?');
      values.push(username);
    }

    if (password) {
      if (password.length < 4) {
        return NextResponse.json(
          { error: '비밀번호는 4자 이상이어야 합니다.' },
          { status: 400 }
        );
      }
      updates.push('password_hash = ?');
      values.push(await hashPassword(password));
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: '수정할 내용이 없습니다.' },
        { status: 400 }
      );
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(deviceId);

    await execute(
      `UPDATE device_accounts SET ${updates.join(', ')} WHERE device_id = ?`,
      values
    );

    // 비밀번호 변경 시 기존 세션 삭제
    if (password) {
      await execute('DELETE FROM device_sessions WHERE device_id = ?', [deviceId]);
    }

    return NextResponse.json({
      success: true,
      message: '계정이 수정되었습니다.',
    });
  } catch (error) {
    console.error('계정 수정 오류:', error);
    return NextResponse.json(
      { error: '계정 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 계정 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId: deviceIdOrAlias } = await params;

    const deviceId = await getDeviceId(deviceIdOrAlias);
    if (!deviceId) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 세션 먼저 삭제
    await execute('DELETE FROM device_sessions WHERE device_id = ?', [deviceId]);
    // 계정 삭제
    await execute('DELETE FROM device_accounts WHERE device_id = ?', [deviceId]);

    return NextResponse.json({
      success: true,
      message: '계정이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('계정 삭제 오류:', error);
    return NextResponse.json(
      { error: '계정 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
