import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { broadcastPatientListUpdate } from '@/lib/wsServer';

const PATIENTS_FILE = path.join(process.cwd(), 'data', 'patients.json');

// DELETE: 환자 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;
    
    const data = await fs.readFile(PATIENTS_FILE, 'utf-8');
    const patients = JSON.parse(data);

    const patientIndex = patients.findIndex((p: any) => p.id === patientId);
    if (patientIndex === -1) {
      return NextResponse.json(
        { error: '환자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    patients.splice(patientIndex, 1);
    
    // 삭제 후 순번 재정렬 - 번호순으로 정렬 후 1부터 연속 번호로 재할당
    patients.sort((a: any, b: any) => a.number - b.number);
    patients.forEach((patient: any, index: number) => {
      patient.number = index + 1;
    });
    
    await fs.writeFile(PATIENTS_FILE, JSON.stringify(patients, null, 2));

    // 모든 디바이스에 환자 명단 업데이트 통지
    broadcastPatientListUpdate();

    return NextResponse.json({ message: '환자가 삭제되었습니다.' });
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
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;
    const { name, number, department } = await request.json();

    if (!name || !number || !department) {
      return NextResponse.json(
        { error: '환자명, 번호, 진료과는 필수 항목입니다.' },
        { status: 400 }
      );
    }

    const data = await fs.readFile(PATIENTS_FILE, 'utf-8');
    const patients = JSON.parse(data);

    const patientIndex = patients.findIndex((p: any) => p.id === patientId);
    if (patientIndex === -1) {
      return NextResponse.json(
        { error: '환자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 다른 환자의 번호와 중복 확인
    const duplicatePatient = patients.find((p: any) => p.id !== patientId && p.number === number);
    if (duplicatePatient) {
      return NextResponse.json(
        { error: '이미 존재하는 번호입니다.' },
        { status: 400 }
      );
    }

    patients[patientIndex] = {
      ...patients[patientIndex],
      name,
      number,
      department,
      updatedAt: new Date().toISOString(),
    };

    // 번호순으로 정렬
    patients.sort((a: any, b: any) => a.number - b.number);

    await fs.writeFile(PATIENTS_FILE, JSON.stringify(patients, null, 2));

    // 모든 디바이스에 환자 명단 업데이트 통지
    broadcastPatientListUpdate();

    return NextResponse.json(patients[patientIndex]);
  } catch (error) {
    console.error('환자 수정 오류:', error);
    return NextResponse.json(
      { error: '환자 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}