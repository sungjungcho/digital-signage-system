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

    // 데이터베이스에서 디바이스별 콘텐츠 목록 조회
    const deviceContents = db.prepare(`
      SELECT * FROM devicecontent
      WHERE deviceId = ? AND active = 1
      ORDER BY "order" ASC
    `).all(deviceId);

    db.close();

    console.log(`[API] 디바이스 ${deviceId}의 콘텐츠 ${deviceContents.length}개 조회됨`);

    return NextResponse.json(deviceContents);
  } catch (error) {
    console.error('콘텐츠 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '콘텐츠 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
