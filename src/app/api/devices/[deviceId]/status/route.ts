import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'signage.db');

export async function POST(
  req: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;
    const { status, lastConnected } = await req.json();

    const db = new Database(dbPath);

    // 디바이스 상태 업데이트
    const lastConnectedDate = lastConnected ? new Date(lastConnected).toISOString() : null;

    db.prepare(`
      UPDATE device
      SET status = ?, lastConnected = ?, updatedAt = ?
      WHERE id = ?
    `).run(status, lastConnectedDate, new Date().toISOString(), deviceId);

    const updatedDevice = db.prepare('SELECT * FROM device WHERE id = ?').get(deviceId);
    db.close();

    return NextResponse.json(updatedDevice);
  } catch (error) {
    console.error('디바이스 상태 업데이트 오류:', error);
    return NextResponse.json(
      { error: '디바이스 상태를 업데이트하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
