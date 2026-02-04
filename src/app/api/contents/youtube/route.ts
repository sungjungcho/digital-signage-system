import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, execute } from '@/lib/db';

// WebSocket 서버에서 broadcastContentUpdateToDevice 가져오기
let broadcastContentUpdateToDevice: ((deviceId: string) => void) | null = null;
try {
  const wsServer = require('@/lib/wsServer');
  broadcastContentUpdateToDevice = wsServer.broadcastContentUpdateToDevice;
} catch (error) {
  console.warn('WebSocket 서버를 불러올 수 없습니다:', error);
}

// 유튜브 URL에서 동영상 ID 또는 재생목록 ID 추출
function extractYoutubeInfo(url: string): { type: 'video' | 'playlist', id: string } | null {
  try {
    const urlObj = new URL(url);

    // 재생목록 체크
    const playlistId = urlObj.searchParams.get('list');
    if (playlistId) {
      return { type: 'playlist', id: playlistId };
    }

    // 단일 영상 체크
    let videoId = urlObj.searchParams.get('v');

    // YouTube Shorts 형식 체크 (/shorts/VIDEO_ID)
    if (!videoId && urlObj.pathname.startsWith('/shorts/')) {
      videoId = urlObj.pathname.split('/shorts/')[1]?.split('?')[0];
    }

    // youtu.be 형식 체크
    if (!videoId && urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.slice(1).split('?')[0];
    }

    // /watch 형식 체크
    if (!videoId && urlObj.pathname === '/watch') {
      videoId = urlObj.searchParams.get('v');
    }

    if (videoId) {
      return { type: 'video', id: videoId };
    }

    return null;
  } catch (error) {
    console.error('유튜브 URL 파싱 오류:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, url, autoplay, loop, mute, scheduleType, specificDate, daysOfWeek, startDate, endDate, startTime, endTime } = body;


    if (!deviceId || !url) {
      return NextResponse.json(
        { error: '디바이스 ID와 URL이 필요합니다.' },
        { status: 400 }
      );
    }

    // 유튜브 URL 파싱
    const youtubeInfo = extractYoutubeInfo(url);

    if (!youtubeInfo) {
      return NextResponse.json(
        { error: '유효하지 않은 유튜브 URL입니다.' },
        { status: 400 }
      );
    }

    // 현재 콘텐츠 개수 조회 (order 값 결정용)
    const countResult = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM devicecontent WHERE deviceId = ?',
      [deviceId]
    );
    const count = countResult?.count ?? 0;

    // 유튜브 정보를 JSON으로 저장
    const metadata = JSON.stringify({
      youtubeType: youtubeInfo.type,
      youtubeId: youtubeInfo.id,
      autoplay: autoplay ?? true,
      loop: loop ?? true,
      mute: mute ?? false,
      originalUrl: url,
    });

    const now = new Date().toISOString();
    const contentId = uuidv4();

    // 콘텐츠 저장 (url 필드에 유튜브 정보 저장)
    await execute(`
      INSERT INTO devicecontent (
        id, deviceId, type, url, duration, metadata, \`order\`, active,
        scheduleType, specificDate, daysOfWeek, startDate, endDate, startTime, endTime,
        createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      contentId,
      deviceId,
      'video',
      `youtube:${youtubeInfo.id}`,
      0, // 유튜브는 duration 없음
      metadata,
      count, // order: 현재 개수를 순서로 사용
      1, // active: true
      scheduleType || 'always',
      specificDate || null,
      daysOfWeek || null,
      startDate || null,
      endDate || null,
      startTime || null,
      endTime || null,
      now,
      now
    ]);

    // 콘텐츠 추가 후 해당 디바이스에 WebSocket 알림 전송
    if (broadcastContentUpdateToDevice) {
      setTimeout(() => {
        broadcastContentUpdateToDevice!(deviceId);
      }, 5000);
    }

    return NextResponse.json({
      success: true,
      message: '유튜브 영상이 성공적으로 추가되었습니다.',
      youtubeInfo
    });
  } catch (error) {
    console.error('[YouTube API] 유튜브 콘텐츠 추가 중 오류:', error);
    console.error('[YouTube API] 에러 스택:', error instanceof Error ? error.stack : '스택 없음');
    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
