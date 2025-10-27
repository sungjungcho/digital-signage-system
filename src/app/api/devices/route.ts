import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

const dbPath = path.join(process.cwd(), 'data', 'signage.db');

export async function GET() {
  try {
    const db = new Database(dbPath);

    // 디바이스 목록 조회
    const devices = db.prepare(`
      SELECT * FROM device ORDER BY createdAt ASC
    `).all();

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

    console.log('[API /api/devices] Fetched devices:', devicesWithContents.length, 'devices');
    return NextResponse.json(devicesWithContents);
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json(
      { error: '디바이스 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const db = new Database(dbPath);

    const deviceId = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO device (id, name, location, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(deviceId, data.name, data.location, 'offline', now, now);

    const newDevice = db.prepare('SELECT * FROM device WHERE id = ?').get(deviceId);
    db.close();

    console.log('[API /api/devices] Created device:', newDevice);
    return NextResponse.json(newDevice);
  } catch (error) {
    console.error('Error creating device:', error);
    return NextResponse.json(
      { error: '디바이스 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
