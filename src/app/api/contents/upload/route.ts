import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'signage.db');

// WebSocket 서버에서 broadcastContentUpdateToDevice 가져오기
let broadcastContentUpdateToDevice: ((deviceId: string) => void) | null = null;
try {
  const wsServer = require('@/lib/wsServer');
  broadcastContentUpdateToDevice = wsServer.broadcastContentUpdateToDevice;
} catch (error) {
  console.warn('WebSocket 서버를 불러올 수 없습니다:', error);
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const deviceId = formData.get('deviceId') as string;
    const type = formData.get('type') as 'image' | 'video';
    const skipDbInsert = formData.get('skipDbInsert') === 'true'; // DB 저장 생략 플래그

    if (!file || !deviceId) {
      return NextResponse.json(
        { error: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // type이 없고 skipDbInsert도 false면 오류
    if (!type && !skipDbInsert) {
      return NextResponse.json(
        { error: 'type 또는 skipDbInsert 파라미터가 필요합니다.' },
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

    // skipDbInsert가 true면 파일만 업로드하고 URL만 반환
    if (skipDbInsert) {
      console.log(`[API] 파일만 업로드 완료 (DB 저장 생략): ${publicPath}`);
      return NextResponse.json({
        url: publicPath,
        fileName: uniqueFileName
      });
    }

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

    // 콘텐츠 추가 후 해당 디바이스에 WebSocket 알림 전송
    console.log(`[API] 파일 업로드 완료, 디바이스 ${deviceId}에 업데이트 알림 전송`);
    if (broadcastContentUpdateToDevice) {
      setTimeout(() => {
        broadcastContentUpdateToDevice!(deviceId);
      }, 5000);
    }

    return NextResponse.json(newContent);
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: '파일 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
