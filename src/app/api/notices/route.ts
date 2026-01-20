import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

const dbPath = path.join(process.cwd(), 'data', 'signage.db');

// 공지사항 목록 조회
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const db = new Database(dbPath);

    let query = 'SELECT * FROM notice WHERE 1=1';
    const params: any[] = [];

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY favorite DESC, lastUsedAt DESC, createdAt DESC';

    const notices = db.prepare(query).all(...params);
    db.close();

    return NextResponse.json(notices);
  } catch (error) {
    console.error('공지사항 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '공지사항 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 공지사항 생성
export async function POST(req: Request) {
  try {
    const { title, content, category } = await req.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: '제목과 내용은 필수입니다.' },
        { status: 400 }
      );
    }

    const db = new Database(dbPath);
    const noticeId = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO notice (
        id, title, content, category, favorite, usageCount, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      noticeId,
      title,
      content,
      category || null,
      0,
      0,
      now,
      now
    );

    const newNotice = db.prepare('SELECT * FROM notice WHERE id = ?').get(noticeId);
    db.close();

    return NextResponse.json(newNotice);
  } catch (error) {
    console.error('공지사항 생성 오류:', error);
    return NextResponse.json(
      { error: '공지사항 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
