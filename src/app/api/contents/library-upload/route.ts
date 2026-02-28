import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { execute, queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// App Router 설정
export const maxDuration = 60; // 최대 실행 시간 60초
export const dynamic = 'force-dynamic';

function getContentType(file: File): 'image' | 'video' | null {
  const mimeType = (file.type || '').toLowerCase();
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';

  // 일부 브라우저/환경에서는 file.type이 비어 있을 수 있어 확장자로 보정
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic', 'heif']);
  const videoExtensions = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v']);

  if (imageExtensions.has(fileExtension)) return 'image';
  if (videoExtensions.has(fileExtension)) return 'video';

  return null;
}

export async function POST(request: NextRequest) {
  console.log('=== 파일 업로드 요청 시작 ===');
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log('업로드 실패: 인증 없음');
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }
    console.log('인증 확인:', user.userId);

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const duration = parseInt(formData.get('duration') as string) || 10;
    const backgroundColor = formData.get('backgroundColor') as string || null;

    if (!file) {
      console.log('업로드 실패: 파일 없음');
      return NextResponse.json({ error: '파일이 필요합니다.' }, { status: 400 });
    }

    console.log('파일 정보:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
    });

    // 파일 타입 확인 (mime 우선, 확장자 fallback)
    const contentType = getContentType(file);
    if (!contentType) {
      return NextResponse.json(
        { error: '이미지 또는 동영상 파일만 업로드 가능합니다.' },
        { status: 400 }
      );
    }

    // 파일 저장
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const uniqueFileName = fileExtension
      ? `${randomUUID()}.${fileExtension}`
      : randomUUID();

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, uniqueFileName);
    await writeFile(filePath, buffer);
    console.log('파일 저장 완료:', filePath);

    // DB에 콘텐츠 저장
    const contentId = randomUUID();
    const now = new Date().toISOString();
    const publicPath = `/api/uploads/${uniqueFileName}`;
    const contentName = (name || file.name.replace(/\.[^/.]+$/, '')).trim().slice(0, 255);

    await execute(`
      INSERT INTO content (
        id, name, type, url, duration,
        autoplay, \`loop\`, muted, backgroundColor,
        user_id, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      contentId,
      contentName,
      contentType,
      publicPath,
      duration,
      contentType === 'video' ? 1 : 0,
      contentType === 'video' ? 1 : 0,
      1,
      contentType === 'image' ? backgroundColor : null,
      user.userId,
      now,
      now
    ]);

    const newContent = await queryOne('SELECT * FROM content WHERE id = ?', [contentId]);
    console.log('DB 저장 완료:', contentId);

    return NextResponse.json(newContent, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('=== 파일 업로드 오류 ===');
    console.error('메시지:', errorMessage);
    console.error('스택:', errorStack);
    return NextResponse.json(
      { error: `파일 업로드 실패: ${errorMessage}` },
      { status: 500 }
    );
  }
}
