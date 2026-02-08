import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { queryOne, execute } from '@/lib/db';

// UUID 형식인지 확인하는 함수
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// deviceId 또는 alias로 디바이스 조회
async function findDevice(deviceIdOrAlias: string) {
  if (isUUID(deviceIdOrAlias)) {
    return await queryOne('SELECT * FROM device WHERE id = ?', [deviceIdOrAlias]);
  }
  // UUID가 아니면 alias로 조회
  return await queryOne('SELECT * FROM device WHERE alias = ?', [deviceIdOrAlias]);
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

    const device = await findDevice(deviceId) as any;

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

    // 디바이스 존재 확인 (id 또는 alias로)
    const device = await findDevice(deviceId) as any;

    if (!device) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 슈퍼관리자만 디바이스 속성 수정 가능
    if (userRole !== 'superadmin') {
      return NextResponse.json(
        { error: '슈퍼관리자만 디바이스를 수정할 수 있습니다.' },
        { status: 403 }
      );
    }

    // alias 중복 체크 (변경하려는 경우)
    if (data.alias && data.alias !== device.alias) {
      const existingAlias = await queryOne('SELECT id FROM device WHERE alias = ? AND id != ?', [data.alias, device.id]);
      if (existingAlias) {
        return NextResponse.json(
          { error: '이미 사용 중인 별칭입니다.' },
          { status: 400 }
        );
      }
    }

    // PIN 코드 변경 시 유효성 검사
    if (data.pin_code !== undefined && !isValidPinCode(data.pin_code)) {
      return NextResponse.json(
        { error: 'PIN 코드는 4자리 숫자여야 합니다.' },
        { status: 400 }
      );
    }

    // 사용자 재할당 시 유효성 검사
    if (data.user_id && data.user_id !== device.user_id) {
      const targetUser = await queryOne('SELECT id, status FROM users WHERE id = ?', [data.user_id]) as any;
      if (!targetUser || targetUser.status !== 'approved') {
        return NextResponse.json(
          { error: '유효하지 않은 사용자입니다.' },
          { status: 400 }
        );
      }
    }

    // approval_status 변경 검증
    if (data.approval_status && !['pending', 'approved', 'rejected'].includes(data.approval_status)) {
      return NextResponse.json(
        { error: '유효하지 않은 승인 상태입니다.' },
        { status: 400 }
      );
    }

    // 디바이스 업데이트
    const now = new Date().toISOString();
    await execute(`
      UPDATE device
      SET name = ?, location = ?, alias = ?, pin_code = ?, user_id = ?, approval_status = ?, updatedAt = ?
      WHERE id = ?
    `, [
      data.name || device.name,
      data.location || device.location,
      data.alias || device.alias,
      data.pin_code !== undefined ? data.pin_code : device.pin_code,
      data.user_id || device.user_id,
      data.approval_status || device.approval_status,
      now,
      device.id
    ]);

    const updatedDevice = await queryOne('SELECT * FROM device WHERE id = ?', [device.id]);

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

    // 디바이스 존재 확인 (id 또는 alias로)
    const device = await findDevice(deviceId) as any;

    if (!device) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 슈퍼관리자만 디바이스 삭제 가능
    if (userRole !== 'superadmin') {
      return NextResponse.json(
        { error: '슈퍼관리자만 디바이스를 삭제할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 관련된 콘텐츠 먼저 삭제 (CASCADE로 자동 삭제되지만 명시적으로 처리)
    await execute('DELETE FROM devicecontent WHERE deviceId = ?', [device.id]);

    // 디바이스 삭제
    await execute('DELETE FROM device WHERE id = ?', [device.id]);

    return NextResponse.json({ message: '디바이스가 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('디바이스 삭제 중 오류 발생:', error);
    return NextResponse.json(
      { error: '디바이스 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
