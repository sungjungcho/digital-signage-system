import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';
import { broadcastContentUpdateToDevice } from '@/lib/wsServer';

const dbPath = path.join(process.cwd(), 'data', 'signage.db');

export async function POST(request: NextRequest) {
  try {
    const { deviceId, leftContents, showNotices = true, scheduleType, specificDate, daysOfWeek, startDate, endDate, startTime, endTime } = await request.json();

    if (!deviceId) {
      return NextResponse.json({ error: '디바이스 ID가 필요합니다' }, { status: 400 });
    }

    if (!leftContents || !Array.isArray(leftContents) || leftContents.length === 0) {
      return NextResponse.json({ error: '왼쪽에 표시할 콘텐츠가 필요합니다' }, { status: 400 });
    }

    const db = new Database(dbPath);

    // 디바이스 확인
    const device = db.prepare('SELECT * FROM device WHERE id = ?').get(deviceId);

    if (!device) {
      db.close();
      return NextResponse.json({ error: '디바이스를 찾을 수 없습니다' }, { status: 404 });
    }

    // 새로운 split_layout 콘텐츠 생성
    // split_layout은 JSON 형태로 leftContents를 text 필드에 저장
    const leftContentsJson = JSON.stringify(leftContents);

    // 전체 split_layout 표시 시간 계산 (모든 leftContents의 duration 합계)
    const totalDuration = leftContents.reduce((sum: number, content: any) => {
      return sum + (content.duration || 5000);
    }, 0);

    // 최대 order 값 구하기
    const maxOrderResult = db.prepare(`
      SELECT MAX("order") as maxOrder FROM devicecontent WHERE deviceId = ?
    `).get(deviceId) as { maxOrder: number | null };

    const maxOrder = maxOrderResult.maxOrder !== null ? maxOrderResult.maxOrder + 1 : 0;

    const newContentId = randomUUID();
    const now = new Date().toISOString();
    const metadata = JSON.stringify({ showNotices });

    db.prepare(`
      INSERT INTO devicecontent (
        id, deviceId, type, text, duration, metadata, "order", active,
        scheduleType, specificDate, daysOfWeek, startDate, endDate, startTime, endTime,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newContentId,
      deviceId,
      'split_layout',
      leftContentsJson,
      totalDuration,
      metadata,
      maxOrder,
      1, // active = true
      scheduleType || 'always',
      specificDate || null,
      daysOfWeek || null,
      startDate || null,
      endDate || null,
      startTime || null,
      endTime || null,
      now,
      now
    );

    const newContent = db.prepare('SELECT * FROM devicecontent WHERE id = ?').get(newContentId);
    db.close();

    // 콘텐츠 추가 후 해당 디바이스에 WebSocket 알림 전송
    setTimeout(() => {
      broadcastContentUpdateToDevice(deviceId);
    }, 5000);

    return NextResponse.json(newContent);
  } catch (error) {
    console.error('Split layout 콘텐츠 추가 중 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
