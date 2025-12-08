import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

const dbPath = path.join(process.cwd(), 'data', 'signage.db');

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const db = new Database(dbPath);

    // 현재 순서 가져오기
    const existingContents = db.prepare(`
      SELECT * FROM devicecontent WHERE deviceId = ?
    `).all(data.deviceId);

    const newContentId = randomUUID();
    const now = new Date().toISOString();

    // 새 텍스트 콘텐츠 생성
    db.prepare(`
      INSERT INTO devicecontent (
        id, deviceId, type, text, duration, fontSize, fontColor, backgroundColor, "order", active, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newContentId,
      data.deviceId,
      'text',
      data.text,
      data.duration,
      data.fontSize,
      data.fontColor,
      data.backgroundColor,
      existingContents.length,
      1,
      now,
      now
    );

    const newContent = db.prepare('SELECT * FROM devicecontent WHERE id = ?').get(newContentId);
    db.close();

    return NextResponse.json(newContent);
  } catch (error) {
    console.error('텍스트 콘텐츠 등록 중 오류:', error);
    return NextResponse.json(
      { error: '텍스트 콘텐츠 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
