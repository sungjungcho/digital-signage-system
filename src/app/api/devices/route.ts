import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

const dbPath = path.join(process.cwd(), 'data', 'signage.db');

// 4자리 PIN 코드 유효성 검사
function isValidPinCode(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export async function GET() {
  try {
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

    // 슈퍼관리자는 모든 디바이스, 일반 사용자는 본인에게 할당된 디바이스만
    let devices;

    if (userRole === 'superadmin') {
      devices = db.prepare(`
        SELECT d.*, u.username as owner_username
        FROM device d
        LEFT JOIN users u ON d.user_id = u.id
        ORDER BY d.createdAt ASC
      `).all();
    } else {
      devices = db.prepare(`
        SELECT * FROM device WHERE user_id = ? ORDER BY createdAt ASC
      `).all(userId);
    }

    // 각 디바이스의 콘텐츠도 함께 조회
    const devicesWithContents = devices.map((device: any) => {
      const contents = db.prepare(`
        SELECT * FROM devicecontent WHERE deviceId = ? ORDER BY "order" ASC
      `).all(device.id);

      return {
        ...device,
        contents,
      };
    });

    db.close();

    return NextResponse.json(devicesWithContents);
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json(
      { error: '디바이스 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 슈퍼관리자 전용: 디바이스 생성 및 사용자 할당
export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 슈퍼관리자만 디바이스 생성 가능
    if (userRole !== 'superadmin') {
      return NextResponse.json(
        { error: '슈퍼관리자만 디바이스를 등록할 수 있습니다.' },
        { status: 403 }
      );
    }

    const data = await req.json();

    // PIN 코드: 직접 입력 또는 자동 생성
    let pinCode = data.pin_code;
    if (!pinCode || data.auto_pin) {
      pinCode = String(Math.floor(1000 + Math.random() * 9000));
    }

    if (!isValidPinCode(pinCode)) {
      return NextResponse.json(
        { error: 'PIN 코드는 4자리 숫자여야 합니다.' },
        { status: 400 }
      );
    }

    // 할당할 사용자 ID (필수)
    const assignUserId = data.user_id;
    if (!assignUserId) {
      return NextResponse.json(
        { error: '디바이스를 할당할 사용자를 선택해주세요.' },
        { status: 400 }
      );
    }

    const db = new Database(dbPath);

    // 할당 대상 사용자 존재 확인
    const targetUser = db.prepare('SELECT id, status FROM users WHERE id = ?').get(assignUserId) as any;
    if (!targetUser || targetUser.status !== 'approved') {
      db.close();
      return NextResponse.json(
        { error: '유효하지 않은 사용자입니다.' },
        { status: 400 }
      );
    }

    const deviceId = randomUUID();
    const now = new Date().toISOString();

    // alias 생성: 사용자 입력 또는 자동 생성
    let alias = data.alias;
    if (!alias) {
      alias = 'device-' + deviceId.substring(0, 8);
    }

    // alias 중복 체크
    const existingAlias = db.prepare('SELECT id FROM device WHERE alias = ?').get(alias);
    if (existingAlias) {
      db.close();
      return NextResponse.json(
        { error: '이미 사용 중인 별칭입니다.' },
        { status: 400 }
      );
    }

    const stmt = db.prepare(`
      INSERT INTO device (id, name, location, alias, status, user_id, pin_code, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(deviceId, data.name, data.location, alias, 'offline', assignUserId, pinCode, now, now);

    const newDevice = db.prepare('SELECT * FROM device WHERE id = ?').get(deviceId);
    db.close();

    return NextResponse.json(newDevice);
  } catch (error) {
    console.error('Error creating device:', error);
    return NextResponse.json(
      { error: '디바이스 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
