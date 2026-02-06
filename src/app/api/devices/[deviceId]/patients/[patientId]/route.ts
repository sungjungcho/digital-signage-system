import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
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

// DELETE: 특정 환자 삭제
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ deviceId: string; patientId: string }> }
) {
  try {
    const { deviceId: deviceIdOrAlias, patientId } = await params;

    const deviceId = await getDeviceId(deviceIdOrAlias);
    if (!deviceId) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 환자 존재 확인
    const patient = await queryOne(
      'SELECT id FROM device_patients WHERE id = ? AND device_id = ?',
      [patientId, deviceId]
    );

    if (!patient) {
      return NextResponse.json(
        { error: '환자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    await execute('DELETE FROM device_patients WHERE id = ?', [patientId]);

    // 해당 디바이스에 환자 명단 업데이트 통지
    broadcastPatientListUpdate(deviceId);

    return NextResponse.json({ success: true, message: '환자가 삭제되었습니다.' });
  } catch (error) {
    console.error('환자 삭제 오류:', error);
    return NextResponse.json(
      { error: '환자 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT: 환자 정보 수정
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string; patientId: string }> }
) {
  try {
    const { deviceId: deviceIdOrAlias, patientId } = await params;
    const { name, number, department } = await req.json();

    const deviceId = await getDeviceId(deviceIdOrAlias);
    if (!deviceId) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 환자 존재 확인
    const patient = await queryOne(
      'SELECT * FROM device_patients WHERE id = ? AND device_id = ?',
      [patientId, deviceId]
    ) as any;

    if (!patient) {
      return NextResponse.json(
        { error: '환자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 번호 변경 시 중복 확인
    if (number !== undefined && number !== patient.number) {
      const existing = await queryOne(
        'SELECT id FROM device_patients WHERE device_id = ? AND number = ? AND id != ?',
        [deviceId, number, patientId]
      );
      if (existing) {
        return NextResponse.json(
          { error: '이미 존재하는 번호입니다.' },
          { status: 400 }
        );
      }
    }

    await execute(
      'UPDATE device_patients SET name = ?, number = ?, department = ? WHERE id = ?',
      [
        name || patient.name,
        number !== undefined ? number : patient.number,
        department || patient.department,
        patientId
      ]
    );

    const updatedPatient = await queryOne('SELECT * FROM device_patients WHERE id = ?', [patientId]);

    // 해당 디바이스에 환자 명단 업데이트 통지
    broadcastPatientListUpdate(deviceId);

    return NextResponse.json(updatedPatient);
  } catch (error) {
    console.error('환자 수정 오류:', error);
    return NextResponse.json(
      { error: '환자 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
