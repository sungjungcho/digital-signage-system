import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

// UUID 형식인지 확인하는 함수
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// deviceId 또는 alias로 디바이스 조회
async function findDevice(deviceIdOrAlias: string) {
  if (isUUID(deviceIdOrAlias)) {
    return queryOne('SELECT * FROM device WHERE id = ?', [deviceIdOrAlias]);
  }
  return queryOne('SELECT * FROM device WHERE alias = ?', [deviceIdOrAlias]);
}

// GET: 디바이스의 PIN 설정 여부 확인
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;
    const device = await findDevice(deviceId) as any;

    if (!device) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // PIN 설정 여부 반환
    return NextResponse.json({
      hasPin: device.pin_code !== null && device.pin_code !== '',
      deviceId: device.id,
      deviceName: device.name,
    });
  } catch (error) {
    console.error('PIN 상태 확인 중 오류 발생:', error);
    return NextResponse.json(
      { error: 'PIN 상태 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;
    const device = await findDevice(deviceId) as any;

    if (!device) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // PIN이 설정되지 않은 디바이스는 바로 성공 반환
    if (!device.pin_code) {
      return NextResponse.json({
        success: true,
        deviceId: device.id,
        deviceName: device.name,
        noPin: true,
      });
    }

    const { pin } = await req.json();

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json(
        { error: 'PIN 코드를 입력해주세요.' },
        { status: 400 }
      );
    }

    // PIN 코드 검증
    if (device.pin_code !== pin) {
      return NextResponse.json(
        { error: 'PIN 코드가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // 검증 성공 - 디바이스 ID 반환
    return NextResponse.json({
      success: true,
      deviceId: device.id,
      deviceName: device.name,
    });
  } catch (error) {
    console.error('PIN 검증 중 오류 발생:', error);
    return NextResponse.json(
      { error: 'PIN 검증 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
