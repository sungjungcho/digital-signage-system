import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'signage.db');

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const deviceId = formData.get('deviceId') as string;
    const type = formData.get('type') as 'image' | 'video';

    if (!file || !deviceId || !type) {
      return NextResponse.json(
        { error: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 파일 정보 가져오기
    const bytes = await (file as Blob).arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = (file as File).name;

    // public/uploads 디렉토리 생성 (없는 경우)
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const uniqueFileName = `${Date.now()}-${fileName}`;
    const filePath = path.join(uploadDir, uniqueFileName);

    await writeFile(filePath, buffer);
    const publicPath = `/uploads/${uniqueFileName}`;

    // 데이터베이스에 콘텐츠 정보 저장
    const db = new Database(dbPath);

    const existingContents = db.prepare(`
      SELECT * FROM devicecontent WHERE deviceId = ?
    `).all(deviceId);

    const newContentId = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO devicecontent (
        id, deviceId, type, url, duration, autoplay, loop, muted, alt, "order", active, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newContentId,
      deviceId,
      type,
      publicPath,
      type === 'image' ? 5000 : 0, // 이미지는 기본 5초, 동영상은 0(동영상 길이만큼)
      type === 'video' ? 1 : 0,
      type === 'video' ? 1 : 0,
      type === 'video' ? 1 : 0,
      fileName,
      existingContents.length,
      1,
      now,
      now
    );

    const newContent = db.prepare('SELECT * FROM devicecontent WHERE id = ?').get(newContentId);
    db.close();

    return NextResponse.json(newContent);
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: '파일 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
