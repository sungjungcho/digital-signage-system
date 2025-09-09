import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import { broadcastPatientListUpdate } from '@/lib/wsServer';

const PATIENTS_FILE = path.join(process.cwd(), 'data', 'patients.json');

// 환자 데이터 파일이 없으면 생성
async function ensurePatientsFile() {
  try {
    await fs.access(PATIENTS_FILE);
  } catch {
    await fs.mkdir(path.dirname(PATIENTS_FILE), { recursive: true });
    await fs.writeFile(PATIENTS_FILE, JSON.stringify([]));
  }
}

// GET: 모든 환자 목록 가져오기
export async function GET() {
  try {
    await ensurePatientsFile();
    const data = await fs.readFile(PATIENTS_FILE, 'utf-8');
    const patients = JSON.parse(data);
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
export async function POST(request: NextRequest) {
  try {
    const { name, number, department } = await request.json();

    if (!name || !number || !department) {
      return NextResponse.json(
        { error: '환자명, 번호, 진료과는 필수 항목입니다.' },
        { status: 400 }
      );
    }

    await ensurePatientsFile();
    const data = await fs.readFile(PATIENTS_FILE, 'utf-8');
    const patients = JSON.parse(data);

    // 번호 중복 확인
    if (patients.some((p: any) => p.number === number)) {
      return NextResponse.json(
        { error: '이미 존재하는 번호입니다.' },
        { status: 400 }
      );
    }

    const newPatient = {
      id: nanoid(),
      name,
      number,
      department,
      createdAt: new Date().toISOString(),
    };

    patients.push(newPatient);
    
    // 번호순으로 정렬
    patients.sort((a: any, b: any) => a.number - b.number);
    
    await fs.writeFile(PATIENTS_FILE, JSON.stringify(patients, null, 2));

    // 모든 디바이스에 환자 명단 업데이트 통지
    broadcastPatientListUpdate();

    return NextResponse.json(newPatient);
  } catch (error) {
    console.error('환자 추가 오류:', error);
    return NextResponse.json(
      { error: '환자 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}