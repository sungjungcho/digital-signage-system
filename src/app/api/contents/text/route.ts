import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { queryOne, queryAll, execute } from '@/lib/db';

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
    const data = await req.json();

    // 현재 순서 가져오기
    const existingContents = await queryAll(
      `SELECT * FROM devicecontent WHERE deviceId = ?`,
      [data.deviceId]
    );

    const newContentId = randomUUID();
    const now = new Date().toISOString();

    // 새 텍스트 콘텐츠 생성
    await execute(`
      INSERT INTO devicecontent (
        id, deviceId, type, text, duration, fontSize, fontColor, backgroundColor, \`order\`, active,
        scheduleType, specificDate, daysOfWeek, startDate, endDate, startTime, endTime,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
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
      data.scheduleType || 'always',
      data.specificDate || null,
      data.daysOfWeek || null,
      data.startDate || null,
      data.endDate || null,
      data.startTime || null,
      data.endTime || null,
      now,
      now
    ]);

    const newContent = await queryOne('SELECT * FROM devicecontent WHERE id = ?', [newContentId]);

    // 콘텐츠 추가 후 해당 디바이스에 WebSocket 알림 전송
    if (broadcastContentUpdateToDevice) {
      setTimeout(() => {
        broadcastContentUpdateToDevice!(data.deviceId);
      }, 5000);
    }

    return NextResponse.json(newContent);
  } catch (error) {
    console.error('텍스트 콘텐츠 등록 중 오류:', error);
    return NextResponse.json(
      { error: '텍스트 콘텐츠 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
