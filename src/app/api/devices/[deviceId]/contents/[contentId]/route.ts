import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'signage.db');

export async function PUT(req: Request, { params }: { params: { deviceId: string, contentId: string } }) {
  const { contentId } = params;
  try {
    const data = await req.json();
    const db = new Database(dbPath);

    // 기존 콘텐츠 가져오기
    const existingContent = db.prepare('SELECT * FROM devicecontent WHERE id = ?').get(contentId) as any;

    if (!existingContent) {
      db.close();
      return NextResponse.json({ error: '콘텐츠를 찾을 수 없습니다' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // 타입별로 업데이트 처리
    if (existingContent.type === 'text') {
      // 텍스트 콘텐츠 수정
      db.prepare(`
        UPDATE devicecontent
        SET text = ?, duration = ?, fontSize = ?, fontColor = ?, backgroundColor = ?, updatedAt = ?
        WHERE id = ?
      `).run(
        data.text,
        data.duration,
        data.fontSize,
        data.fontColor,
        data.backgroundColor,
        now,
        contentId
      );
    } else if (existingContent.type === 'video' && existingContent.url.startsWith('youtube:')) {
      // 유튜브 콘텐츠 수정 (metadata만 수정 가능)
      db.prepare(`
        UPDATE devicecontent
        SET metadata = ?, updatedAt = ?
        WHERE id = ?
      `).run(
        data.metadata,
        now,
        contentId
      );
    } else if (existingContent.type === 'video' || existingContent.type === 'image') {
      // 파일 기반 콘텐츠는 duration만 수정 가능
      db.prepare(`
        UPDATE devicecontent
        SET duration = ?, updatedAt = ?
        WHERE id = ?
      `).run(
        data.duration || existingContent.duration,
        now,
        contentId
      );
    }

    const updatedContent = db.prepare('SELECT * FROM devicecontent WHERE id = ?').get(contentId);
    db.close();

    return NextResponse.json(updatedContent);
  } catch (error) {
    console.error('수정 실패:', error);
    return NextResponse.json({ error: '수정 실패' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { deviceId: string, contentId: string } }) {
  const { contentId } = params;
  try {
    const db = new Database(dbPath);

    // deviceId도 where에 포함시켜서 보안 강화
    db.prepare('DELETE FROM devicecontent WHERE id = ?').run(contentId);

    db.close();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('삭제 실패:', error);
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 });
  }
}
