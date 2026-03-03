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

// 별칭 유효성 검사: 영문 소문자, 숫자, 하이픈(-), 언더바(_)
function isValidAlias(alias: string): boolean {
  return /^[a-z0-9_-]+$/.test(alias);
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

    // 권한 확인
    const isOwner = device.user_id === userId;
    const isSuperAdmin = userRole === 'superadmin';
    const isPinOnlyUpdate = Object.keys(data).length === 1 && 'pin_code' in data;
    // 거부된 디바이스를 재요청(pending으로 변경)하는 경우
    const isReRequest = Object.keys(data).length === 1 && data.approval_status === 'pending' && device.approval_status === 'rejected';

    if (!isSuperAdmin) {
      if (!isOwner) {
        return NextResponse.json(
          { error: '이 디바이스를 수정할 권한이 없습니다.' },
          { status: 403 }
        );
      }
      // 일반 사용자는 PIN 수정 또는 거부된 디바이스 재요청만 가능
      if (!isPinOnlyUpdate && !isReRequest) {
        return NextResponse.json(
          { error: '이 작업을 수행할 권한이 없습니다.' },
          { status: 403 }
        );
      }
    }

    // alias 형식/중복 체크 (변경하려는 경우, 같은 사용자 내에서만 중복 불가)
    if (data.alias && data.alias !== device.alias) {
      if (!isValidAlias(data.alias)) {
        return NextResponse.json(
          { error: '별칭은 영문 소문자, 숫자, 하이픈(-), 언더바(_)만 사용할 수 있습니다.' },
          { status: 400 }
        );
      }

      const targetUserId = data.user_id || device.user_id;
      const existingAlias = await queryOne(
        'SELECT id FROM device WHERE alias = ? AND user_id = ? AND id != ?',
        [data.alias, targetUserId, device.id]
      );
      if (existingAlias) {
        return NextResponse.json(
          { error: '이미 사용 중인 별칭입니다.' },
          { status: 400 }
        );
      }
    }

    // PIN 코드 변경 시 유효성 검사 (null/빈값은 허용 - PIN 해제)
    if (data.pin_code !== undefined && data.pin_code !== null && data.pin_code !== '' && !isValidPinCode(data.pin_code)) {
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

    // 한도 초과 요청 디바이스 승인 시 한도 검증
    if (data.approval_status === 'approved' && device.approval_status === 'pending' && device.is_over_limit_request) {
      const ownerUser = await queryOne('SELECT max_devices FROM users WHERE id = ?', [device.user_id]) as any;
      const approvedDeviceCount = await queryOne(
        "SELECT COUNT(*) as count FROM device WHERE user_id = ? AND approval_status = 'approved'",
        [device.user_id]
      ) as any;

      if (approvedDeviceCount.count >= (ownerUser?.max_devices || 3)) {
        return NextResponse.json(
          { error: `해당 사용자의 디바이스 한도(${ownerUser?.max_devices || 3}개)가 부족합니다. 먼저 사용자의 디바이스 한도를 늘려주세요.` },
          { status: 400 }
        );
      }
    }

    // 디바이스 업데이트
    const now = new Date().toISOString();

    // PIN 코드 처리: 빈 문자열은 null로 변환 (PIN 해제)
    let newPinCode = device.pin_code;
    if (data.pin_code !== undefined) {
      newPinCode = (data.pin_code === '' || data.pin_code === null) ? null : data.pin_code;
    }

    // rejection_reason 처리: 거부 시 사유 저장, 승인/대기 시 null로 초기화
    let rejectionReason = device.rejection_reason;
    if (data.approval_status === 'rejected') {
      rejectionReason = data.rejection_reason || null;
    } else if (data.approval_status === 'approved' || data.approval_status === 'pending') {
      rejectionReason = null;
    }

    await execute(`
      UPDATE device
      SET name = ?, location = ?, alias = ?, pin_code = ?, user_id = ?, approval_status = ?, rejection_reason = ?, updatedAt = ?
      WHERE id = ?
    `, [
      data.name || device.name,
      data.location || device.location,
      data.alias || device.alias,
      newPinCode,
      data.user_id || device.user_id,
      data.approval_status || device.approval_status,
      rejectionReason,
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

    // 슈퍼관리자 또는 본인 소유 디바이스 중 거부된 것만 삭제 가능
    const isOwner = device.user_id === userId;
    const isRejected = device.approval_status === 'rejected';

    if (userRole !== 'superadmin' && !(isOwner && isRejected)) {
      return NextResponse.json(
        { error: '이 디바이스를 삭제할 권한이 없습니다.' },
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
