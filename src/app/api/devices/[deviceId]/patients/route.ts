import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { queryOne, queryAll, execute } from '@/lib/db';
import { broadcastPatientListUpdate } from '@/lib/wsServer';

// UUID 형식인지 확인하는 함수
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// deviceId 또는 alias로 실제 deviceId 조회
async function getDeviceId(deviceIdOrAlias: string): Promise<string | null> {
  if (isUUID(deviceIdOrAlias)) {
    const device = await queryOne('SELECT id FROM device WHERE id = ?', [deviceIdOrAlias]) as any;
    return device?.id || null;
  }
  const device = await queryOne('SELECT id FROM device WHERE alias = ?', [deviceIdOrAlias]) as any;
  return device?.id || null;
}

// GET: 디바이스별 환자 목록 가져오기
export async function GET(
  _req: NextRequest,
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

    const patients = await queryAll(
      'SELECT * FROM device_patients WHERE device_id = ? ORDER BY number ASC',
      [deviceId]
    );

    return NextResponse.json(patients);
  } catch (error) {
    console.error('환자 목록 가져오기 오류:', error);
    return NextResponse.json(
      { error: '환자 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 새 환자 추가
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId: deviceIdOrAlias } = await params;
    const { name, number, department } = await req.json();

    if (!name || number === undefined || !department) {
      return NextResponse.json(
        { error: '환자명, 번호, 진료과는 필수 항목입니다.' },
        { status: 400 }
      );
    }

    const deviceId = await getDeviceId(deviceIdOrAlias);
    if (!deviceId) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 해당 디바이스에서 번호 중복 확인
    const existing = await queryOne(
      'SELECT id FROM device_patients WHERE device_id = ? AND number = ?',
      [deviceId, number]
    );

    if (existing) {
      return NextResponse.json(
        { error: '이미 존재하는 번호입니다.' },
        { status: 400 }
      );
    }

    const patientId = randomUUID();
    const now = new Date().toISOString();

    await execute(
      'INSERT INTO device_patients (id, device_id, name, number, department, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [patientId, deviceId, name, number, department, now]
    );

    const newPatient = await queryOne('SELECT * FROM device_patients WHERE id = ?', [patientId]);

    // 해당 디바이스에만 환자 명단 업데이트 통지
    broadcastPatientListUpdate(deviceId);

    return NextResponse.json(newPatient);
  } catch (error) {
    console.error('환자 추가 오류:', error);
    return NextResponse.json(
      { error: '환자 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 디바이스의 모든 환자 삭제
export async function DELETE(
  _req: NextRequest,
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

    await execute('DELETE FROM device_patients WHERE device_id = ?', [deviceId]);

    // 해당 디바이스에 환자 명단 업데이트 통지
    broadcastPatientListUpdate(deviceId);

    return NextResponse.json({ success: true, message: '모든 환자가 삭제되었습니다.' });
  } catch (error) {
    console.error('환자 전체 삭제 오류:', error);
    return NextResponse.json(
      { error: '환자 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
