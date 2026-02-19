import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { queryAll, queryOne, execute } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET: 콘텐츠 라이브러리 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    let query = 'SELECT * FROM content';
    const params: any[] = [];
    const conditions: string[] = [];

    // 슈퍼관리자가 아니면 자신의 콘텐츠만 조회
    if (user.role !== 'superadmin') {
      conditions.push('user_id = ?');
      params.push(user.userId);
    }

    // 타입 필터
    if (type && type !== 'all') {
      conditions.push('type = ?');
      params.push(type);
    }

    // 검색어 필터
    if (search) {
      conditions.push('(name LIKE ? OR alt LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY createdAt DESC';

    const contents = await queryAll(query, params);

    // 각 콘텐츠가 연결된 디바이스 수 조회
    const contentsWithDeviceCount = await Promise.all(
      (contents as any[]).map(async (content) => {
        const deviceCount = await queryOne(
          'SELECT COUNT(*) as count FROM device_content WHERE content_id = ?',
          [content.id]
        ) as any;
        return {
          ...content,
          linkedDeviceCount: deviceCount?.count || 0
        };
      })
    );

    return NextResponse.json(contentsWithDeviceCount);
  } catch (error) {
    console.error('콘텐츠 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '콘텐츠 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 새 콘텐츠 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const data = await request.json();
    const {
      name,
      type,
      url,
      text,
      duration = 10,
      fontSize,
      fontColor,
      backgroundColor,
      alt,
      autoplay = false,
      loop = false,
      muted = true,
      metadata
    } = data;

    if (!name || !type) {
      return NextResponse.json(
        { error: '이름과 타입은 필수입니다.' },
        { status: 400 }
      );
    }

    const contentId = randomUUID();
    const now = new Date().toISOString();

    await execute(`
      INSERT INTO content (
        id, name, type, url, text, duration,
        fontSize, fontColor, backgroundColor,
        alt, autoplay, \`loop\`, muted, metadata,
        user_id, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      contentId,
      name,
      type,
      url || null,
      text || null,
      duration,
      fontSize || null,
      fontColor || null,
      backgroundColor || null,
      alt || null,
      autoplay ? 1 : 0,
      loop ? 1 : 0,
      muted ? 1 : 0,
      metadata ? JSON.stringify(metadata) : null,
      user.userId,
      now,
      now
    ]);

    const newContent = await queryOne('SELECT * FROM content WHERE id = ?', [contentId]);

    return NextResponse.json(newContent, { status: 201 });
  } catch (error) {
    console.error('콘텐츠 생성 오류:', error);
    return NextResponse.json(
      { error: '콘텐츠 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
