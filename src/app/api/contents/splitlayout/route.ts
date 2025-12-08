import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';
import { broadcastContentUpdateToDevice } from '@/lib/wsServer';

const dbPath = path.join(process.cwd(), 'data', 'signage.db');

export async function POST(request: NextRequest) {
  try {
    const { deviceId, duration = 10000 } = await request.json();

    if (!deviceId) {
      return NextResponse.json({ error: '디바이스 ID가 필요합니다' }, { status: 400 });
    }

    const db = new Database(dbPath);

    // 디바이스 확인
    const device = db.prepare('SELECT * FROM device WHERE id = ?').get(deviceId);

    if (!device) {
      db.close();
      return NextResponse.json({ error: '디바이스를 찾을 수 없습니다' }, { status: 404 });
    }

    // 기존 콘텐츠들 가져오기 (split_layout이 아닌 것들만)
    const existingContents = db.prepare(`
      SELECT * FROM devicecontent
      WHERE deviceId = ? AND type != 'split_layout'
      ORDER BY "order" ASC
    `).all(deviceId);

    // 기존 콘텐츠를 프론트엔드 Content 형식으로 변환
    const formattedContents = existingContents.map((item: any) => ({
      id: item.id,
      type: item.type,
      duration: item.duration,
      ...(item.text && { text: item.text }),
      ...(item.fontSize && { fontSize: item.fontSize }),
      ...(item.fontColor && { fontColor: item.fontColor }),
      ...(item.backgroundColor && { backgroundColor: item.backgroundColor }),
      ...(item.url && { url: item.url }),
      ...(item.alt && { alt: item.alt }),
      ...(item.autoplay !== undefined && { autoplay: item.autoplay }),
      ...(item.loop !== undefined && { loop: item.loop }),
      ...(item.muted !== undefined && { muted: item.muted }),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    // 새로운 split_layout 콘텐츠 생성
    // split_layout은 JSON 형태로 leftContents를 text 필드에 저장
    const leftContentsJson = JSON.stringify(formattedContents);

    // 최대 order 값 구하기
    const maxOrderResult = db.prepare(`
      SELECT MAX("order") as maxOrder FROM devicecontent WHERE deviceId = ?
    `).get(deviceId) as { maxOrder: number | null };

    const maxOrder = maxOrderResult.maxOrder !== null ? maxOrderResult.maxOrder + 1 : 0;

    const newContentId = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO devicecontent (
        id, deviceId, type, text, duration, "order", active, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newContentId,
      deviceId,
      'split_layout',
      leftContentsJson,
      duration,
      maxOrder,
      1, // active = true
      now,
      now
    );

    const newContent = db.prepare('SELECT * FROM devicecontent WHERE id = ?').get(newContentId);
    db.close();

    // 해당 디바이스에 콘텐츠 업데이트 통지
    broadcastContentUpdateToDevice(deviceId);

    console.log('[API /api/contents/splitlayout] Created split layout:', newContent);
    return NextResponse.json(newContent);
  } catch (error) {
    console.error('Split layout 콘텐츠 추가 중 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
