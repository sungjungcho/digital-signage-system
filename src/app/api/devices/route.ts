import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { randomUUID } from 'crypto';
import { queryOne, queryAll, execute } from '@/lib/db';

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

    // 슈퍼관리자는 모든 디바이스, 일반 사용자는 본인에게 할당된 승인된 디바이스만
    let devices;

    if (userRole === 'superadmin') {
      devices = await queryAll(`
        SELECT d.*, u.username as owner_username, u.name as owner_name
        FROM device d
        LEFT JOIN users u ON d.user_id = u.id
        ORDER BY d.approval_status ASC, d.createdAt ASC
      `);
    } else {
      // 일반 사용자는 본인의 모든 디바이스 (승인 대기 포함)
      devices = await queryAll(`
        SELECT * FROM device WHERE user_id = ? ORDER BY createdAt ASC
      `, [userId]);
    }

    // 각 디바이스의 콘텐츠도 함께 조회
    const devicesWithContents = await Promise.all(devices.map(async (device: any) => {
      const contents = await queryAll(`
        SELECT * FROM devicecontent WHERE deviceId = ? ORDER BY \`order\` ASC
      `, [device.id]);

      return {
        ...device,
        contents,
      };
    }));

    return NextResponse.json(devicesWithContents);
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json(
      { error: '디바이스 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 디바이스 생성 (일반 사용자: 승인 대기, 슈퍼관리자: 즉시 승인)
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

    const data = await req.json();
    const isSuperAdmin = userRole === 'superadmin';

    // 슈퍼관리자가 아닌 경우 디바이스 한도 체크
    if (!isSuperAdmin) {
      const user = await queryOne('SELECT max_devices FROM users WHERE id = ?', [userId]) as any;
      const deviceCount = await queryOne('SELECT COUNT(*) as count FROM device WHERE user_id = ?', [userId]) as any;

      if (deviceCount.count >= (user?.max_devices || 3)) {
        return NextResponse.json(
          { error: `디바이스 등록 한도(${user?.max_devices || 3}개)를 초과했습니다. 관리자에게 문의하세요.` },
          { status: 400 }
        );
      }
    }

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

    // 할당할 사용자 ID (슈퍼관리자는 선택, 일반 사용자는 본인)
    let assignUserId = isSuperAdmin ? data.user_id : userId;

    if (isSuperAdmin && !assignUserId) {
      return NextResponse.json(
        { error: '디바이스를 할당할 사용자를 선택해주세요.' },
        { status: 400 }
      );
    }

    // 할당 대상 사용자 존재 확인
    const targetUser = await queryOne('SELECT id, status FROM users WHERE id = ?', [assignUserId]) as any;
    if (!targetUser || targetUser.status !== 'approved') {
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
    const existingAlias = await queryOne('SELECT id FROM device WHERE alias = ?', [alias]);
    if (existingAlias) {
      return NextResponse.json(
        { error: '이미 사용 중인 별칭입니다.' },
        { status: 400 }
      );
    }

    // 슈퍼관리자: 즉시 승인, 일반 사용자: 대기
    const approvalStatus = isSuperAdmin ? 'approved' : 'pending';

    await execute(`
      INSERT INTO device (id, name, location, alias, status, approval_status, user_id, pin_code, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [deviceId, data.name, data.location, alias, 'offline', approvalStatus, assignUserId, pinCode, now, now]);

    const newDevice = await queryOne('SELECT * FROM device WHERE id = ?', [deviceId]);

    return NextResponse.json({
      ...newDevice,
      message: isSuperAdmin ? '디바이스가 등록되었습니다.' : '디바이스 등록 요청이 완료되었습니다. 관리자 승인 후 사용 가능합니다.'
    });
  } catch (error) {
    console.error('Error creating device:', error);
    return NextResponse.json(
      { error: '디바이스 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
