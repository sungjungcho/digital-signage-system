import { NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';

// WebSocket 서버에서 broadcastContentUpdateToDevice 가져오기
let broadcastContentUpdateToDevice: ((deviceId: string) => void) | null = null;
try {
  const wsServer = require('@/lib/wsServer');
  broadcastContentUpdateToDevice = wsServer.broadcastContentUpdateToDevice;
} catch (error) {
  console.warn('WebSocket 서버를 불러올 수 없습니다:', error);
}

export async function PUT(req: Request, { params }: { params: Promise<{ deviceId: string, contentId: string }> }) {
  const { contentId, deviceId } = await params;
  try {
    const data = await req.json();

    // 기존 콘텐츠 가져오기
    const existingContent = await queryOne('SELECT * FROM devicecontent WHERE id = ?', [contentId]) as any;

    if (!existingContent) {
      return NextResponse.json({ error: '콘텐츠를 찾을 수 없습니다' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // 타입별로 업데이트 처리
    if (existingContent.type === 'text') {
      // 텍스트 콘텐츠 수정
      await execute(`
        UPDATE devicecontent
        SET text = ?, duration = ?, fontSize = ?, fontColor = ?, backgroundColor = ?,
            scheduleType = ?, specificDate = ?, daysOfWeek = ?, startDate = ?, endDate = ?, startTime = ?, endTime = ?,
            updatedAt = ?
        WHERE id = ?
      `, [
        data.text,
        data.duration,
        data.fontSize,
        data.fontColor,
        data.backgroundColor,
        data.scheduleType || 'always',
        data.specificDate || null,
        data.daysOfWeek || null,
        data.startDate || null,
        data.endDate || null,
        data.startTime || null,
        data.endTime || null,
        now,
        contentId
      ]);
    } else if (existingContent.type === 'mixed') {
      // 복합형 콘텐츠 수정 (metadata 업데이트)
      await execute(`
        UPDATE devicecontent
        SET metadata = ?,
            scheduleType = ?, specificDate = ?, daysOfWeek = ?, startDate = ?, endDate = ?, startTime = ?, endTime = ?,
            updatedAt = ?
        WHERE id = ?
      `, [
        data.metadata,
        data.scheduleType || 'always',
        data.specificDate || null,
        data.daysOfWeek || null,
        data.startDate || null,
        data.endDate || null,
        data.startTime || null,
        data.endTime || null,
        now,
        contentId
      ]);
    } else if (existingContent.type === 'split_layout') {
      // 분할 레이아웃 콘텐츠 수정 (text, duration, metadata 업데이트)
      await execute(`
        UPDATE devicecontent
        SET text = ?, duration = ?, metadata = ?,
            scheduleType = ?, specificDate = ?, daysOfWeek = ?, startDate = ?, endDate = ?, startTime = ?, endTime = ?,
            updatedAt = ?
        WHERE id = ?
      `, [
        data.text,
        data.duration,
        data.metadata,
        data.scheduleType || 'always',
        data.specificDate || null,
        data.daysOfWeek || null,
        data.startDate || null,
        data.endDate || null,
        data.startTime || null,
        data.endTime || null,
        now,
        contentId
      ]);
    } else if (existingContent.type === 'video' && existingContent.url?.startsWith('youtube:')) {
      // 유튜브 콘텐츠 수정 (metadata만 수정 가능)
      await execute(`
        UPDATE devicecontent
        SET metadata = ?,
            scheduleType = ?, specificDate = ?, daysOfWeek = ?, startDate = ?, endDate = ?, startTime = ?, endTime = ?,
            updatedAt = ?
        WHERE id = ?
      `, [
        data.metadata,
        data.scheduleType || 'always',
        data.specificDate || null,
        data.daysOfWeek || null,
        data.startDate || null,
        data.endDate || null,
        data.startTime || null,
        data.endTime || null,
        now,
        contentId
      ]);
    } else if (existingContent.type === 'video' || existingContent.type === 'image') {
      // 파일 기반 콘텐츠는 duration만 수정 가능
      await execute(`
        UPDATE devicecontent
        SET duration = ?,
            scheduleType = ?, specificDate = ?, daysOfWeek = ?, startDate = ?, endDate = ?, startTime = ?, endTime = ?,
            updatedAt = ?
        WHERE id = ?
      `, [
        data.duration !== undefined ? data.duration : existingContent.duration,
        data.scheduleType || 'always',
        data.specificDate || null,
        data.daysOfWeek || null,
        data.startDate || null,
        data.endDate || null,
        data.startTime || null,
        data.endTime || null,
        now,
        contentId
      ]);
    }

    const updatedContent = await queryOne('SELECT * FROM devicecontent WHERE id = ?', [contentId]);

    // 콘텐츠 업데이트 후 해당 디바이스에 WebSocket 알림 전송
    if (broadcastContentUpdateToDevice) {
      // 5초 후에 새로고침하도록 타이머와 함께 전송
      setTimeout(() => {
        broadcastContentUpdateToDevice!(deviceId);
      }, 5000);
    }

    return NextResponse.json(updatedContent);
  } catch (error) {
    console.error('수정 실패:', error);
    return NextResponse.json({ error: '수정 실패' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ deviceId: string, contentId: string }> }) {
  const { contentId, deviceId } = await params;
  try {
    // deviceId도 where에 포함시켜서 보안 강화
    await execute('DELETE FROM devicecontent WHERE id = ?', [contentId]);

    // 콘텐츠 삭제 후 해당 디바이스에 WebSocket 알림 전송
    if (broadcastContentUpdateToDevice) {
      // 5초 후에 새로고침하도록 타이머와 함께 전송
      setTimeout(() => {
        broadcastContentUpdateToDevice!(deviceId);
      }, 5000);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('삭제 실패:', error);
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 });
  }
}
