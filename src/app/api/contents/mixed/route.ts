import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';

const dbPath = path.join(process.cwd(), 'data', 'signage.db');

// WebSocket 서버에서 broadcastContentUpdateToDevice 가져오기
let broadcastContentUpdateToDevice: ((deviceId: string) => void) | null = null;
try {
  const wsServer = require('@/lib/wsServer');
  broadcastContentUpdateToDevice = wsServer.broadcastContentUpdateToDevice;
} catch (error) {
  console.warn('WebSocket 서버를 불러올 수 없습니다:', error);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const deviceId = formData.get('deviceId') as string;
    const elementsJson = formData.get('elements') as string;
    const scheduleType = formData.get('scheduleType') as string;
    const specificDate = formData.get('specificDate') as string;
    const daysOfWeek = formData.get('daysOfWeek') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;

    if (!deviceId || !elementsJson) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const elements = JSON.parse(elementsJson);

    if (!Array.isArray(elements) || elements.length === 0) {
      return NextResponse.json(
        { error: '최소 1개 이상의 요소를 추가해야 합니다.' },
        { status: 400 }
      );
    }

    const db = new Database(dbPath);

    // 디바이스 확인
    const device = db.prepare('SELECT * FROM device WHERE id = ?').get(deviceId);
    if (!device) {
      db.close();
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 파일 업로드 처리 및 URL 매핑
    const processedElements = await Promise.all(
      elements.map(async (element: any) => {
        if (element.fileIndex !== undefined) {
          // 파일이 있는 경우
          const file = formData.get(`file_${element.fileIndex}`) as File;
          if (file) {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const filename = `${Date.now()}-${file.name}`;
            const filepath = path.join(process.cwd(), 'public', 'uploads', filename);
            await writeFile(filepath, buffer);

            return {
              ...element,
              url: `/uploads/${filename}`,
              fileIndex: undefined,
            };
          }
        }
        return element;
      })
    );

    // 기존 콘텐츠의 최대 order 값 조회
    const maxOrderRow = db
      .prepare('SELECT MAX("order") as maxOrder FROM devicecontent WHERE deviceId = ?')
      .get(deviceId) as { maxOrder: number | null };
    const nextOrder = (maxOrderRow?.maxOrder ?? -1) + 1;

    // 복합형 콘텐츠 저장 (metadata에 elements 저장)
    const newContentId = randomUUID();
    const now = new Date().toISOString();

    // 전체 재생 시간 계산 (모든 요소의 duration 합산)
    const totalDuration = processedElements.reduce((sum: number, el: any) => sum + (el.duration || 0), 0);

    db.prepare(`
      INSERT INTO devicecontent (
        id, deviceId, type, metadata, duration, "order", active,
        scheduleType, specificDate, daysOfWeek, startDate, endDate, startTime, endTime,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newContentId,
      deviceId,
      'mixed',
      JSON.stringify(processedElements),
      totalDuration,
      nextOrder,
      1,
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

    db.close();

    // 콘텐츠 추가 후 해당 디바이스에 WebSocket 알림 전송
    if (broadcastContentUpdateToDevice) {
      setTimeout(() => {
        broadcastContentUpdateToDevice!(deviceId);
      }, 5000);
    }

    return NextResponse.json({
      success: true,
      contentId: newContentId,
      elements: processedElements.length
    });

  } catch (error) {
    console.error('복합형 콘텐츠 등록 중 오류:', error);
    return NextResponse.json(
      { error: '복합형 콘텐츠 등록에 실패했습니다.' },
      { status: 500 }
    );
  }
}
