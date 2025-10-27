import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'signage.db');

export async function GET(
  req: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;
    const db = new Database(dbPath);

    const device = db.prepare('SELECT * FROM device WHERE id = ?').get(deviceId);
    db.close();

    if (!device) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
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
    const data = await req.json();
    const db = new Database(dbPath);

    // 디바이스 존재 확인
    const device = db.prepare('SELECT * FROM device WHERE id = ?').get(deviceId);

    if (!device) {
      db.close();
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 디바이스 업데이트
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE device
      SET name = ?, location = ?, updatedAt = ?
      WHERE id = ?
    `);

    stmt.run(data.name, data.location || (device as any).location, now, deviceId);

    const updatedDevice = db.prepare('SELECT * FROM device WHERE id = ?').get(deviceId);
    db.close();

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
    const db = new Database(dbPath);

    // 디바이스 존재 확인
    const device = db.prepare('SELECT * FROM device WHERE id = ?').get(deviceId);

    if (!device) {
      db.close();
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 관련된 콘텐츠 먼저 삭제 (CASCADE로 자동 삭제되지만 명시적으로 처리)
    db.prepare('DELETE FROM devicecontent WHERE deviceId = ?').run(deviceId);

    // 디바이스 삭제
    db.prepare('DELETE FROM device WHERE id = ?').run(deviceId);

    db.close();

    return NextResponse.json({ message: '디바이스가 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('디바이스 삭제 중 오류 발생:', error);
    return NextResponse.json(
      { error: '디바이스 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
