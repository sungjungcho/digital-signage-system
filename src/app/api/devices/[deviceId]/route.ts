import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'signage.db');

// UUID 형식인지 확인하는 함수
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// deviceId 또는 alias로 디바이스 조회
function findDevice(db: Database.Database, deviceIdOrAlias: string) {
  if (isUUID(deviceIdOrAlias)) {
    return db.prepare('SELECT * FROM device WHERE id = ?').get(deviceIdOrAlias);
  }
  // UUID가 아니면 alias로 조회
  return db.prepare('SELECT * FROM device WHERE alias = ?').get(deviceIdOrAlias);
}

// 4자리 PIN 코드 유효성 검사
function isValidPinCode(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

// 디바이스 접근 권한 확인
function canAccessDevice(device: any, userId: string | null, userRole: string | null): boolean {
  // 슈퍼관리자는 모든 디바이스 접근 가능
  if (userRole === 'superadmin') return true;
  // 소유자 확인
  return device.user_id === userId;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role');

    const db = new Database(dbPath);
    const device = findDevice(db, deviceId) as any;
    db.close();

    if (!device) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 권한 확인 (인증된 사용자의 경우)
    if (userId && !canAccessDevice(device, userId, userRole)) {
      return NextResponse.json(
        { error: '이 디바이스에 접근할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    return NextResponse.json(device);
  } catch (error) {
    console.error('디바이스 정보를 가져오는 중 오류 발생:', error);
    return NextResponse.json(
      { error: '디바이스 정보를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const data = await req.json();
    const db = new Database(dbPath);

    // 디바이스 존재 확인 (id 또는 alias로)
    const device = findDevice(db, deviceId) as any;

    if (!device) {
      db.close();
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 권한 확인
    if (!canAccessDevice(device, userId, userRole)) {
      db.close();
      return NextResponse.json(
        { error: '이 디바이스를 수정할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // alias 중복 체크 (변경하려는 경우)
    if (data.alias && data.alias !== device.alias) {
      const existingAlias = db.prepare('SELECT id FROM device WHERE alias = ? AND id != ?').get(data.alias, device.id);
      if (existingAlias) {
        db.close();
        return NextResponse.json(
          { error: '이미 사용 중인 별칭입니다.' },
          { status: 400 }
        );
      }
    }

    // PIN 코드 변경 시 유효성 검사
    if (data.pin_code !== undefined && !isValidPinCode(data.pin_code)) {
      db.close();
      return NextResponse.json(
        { error: 'PIN 코드는 4자리 숫자여야 합니다.' },
        { status: 400 }
      );
    }

    // 디바이스 업데이트
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE device
      SET name = ?, location = ?, alias = ?, pin_code = ?, updatedAt = ?
      WHERE id = ?
    `);

    stmt.run(
      data.name || device.name,
      data.location || device.location,
      data.alias || device.alias,
      data.pin_code !== undefined ? data.pin_code : device.pin_code,
      now,
      device.id
    );

    const updatedDevice = db.prepare('SELECT * FROM device WHERE id = ?').get(device.id);
    db.close();

    return NextResponse.json(updatedDevice);
  } catch (error) {
    console.error('디바이스 업데이트 중 오류 발생:', error);
    return NextResponse.json(
      { error: '디바이스 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const db = new Database(dbPath);

    // 디바이스 존재 확인 (id 또는 alias로)
    const device = findDevice(db, deviceId) as any;

    if (!device) {
      db.close();
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 권한 확인
    if (!canAccessDevice(device, userId, userRole)) {
      db.close();
      return NextResponse.json(
        { error: '이 디바이스를 삭제할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 관련된 콘텐츠 먼저 삭제 (CASCADE로 자동 삭제되지만 명시적으로 처리)
    db.prepare('DELETE FROM devicecontent WHERE deviceId = ?').run(device.id);

    // 디바이스 삭제
    db.prepare('DELETE FROM device WHERE id = ?').run(device.id);

    db.close();

    return NextResponse.json({ message: '디바이스가 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('디바이스 삭제 중 오류 발생:', error);
    return NextResponse.json(
      { error: '디바이스 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
