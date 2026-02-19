import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { queryOne, queryAll, execute } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

function getContentType(file: File): 'image' | 'video' | null {
  const mimeType = (file.type || '').toLowerCase();
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';

  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic', 'heif']);
  const videoExtensions = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v']);

  if (imageExtensions.has(fileExtension)) return 'image';
  if (videoExtensions.has(fileExtension)) return 'video';
  return null;
}

function extractUploadFileName(url: string | null | undefined): string | null {
  if (!url) return null;
  const prefix = '/api/uploads/';
  if (!url.startsWith(prefix)) return null;

  const fileName = url.slice(prefix.length);
  if (!fileName || fileName.includes('/') || fileName.includes('..')) {
    return null;
  }
  return fileName;
}

async function cleanupUploadFileIfUnused(fileName: string) {
  const url = `/api/uploads/${fileName}`;
  const usage = await queryOne(
    'SELECT COUNT(*) as count FROM content WHERE url = ?',
    [url]
  ) as any;

  if ((usage?.count || 0) > 0) {
    return;
  }

  const filePath = path.join(process.cwd(), 'public', 'uploads', fileName);
  try {
    await unlink(filePath);
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      console.warn('기존 업로드 파일 정리 실패:', error);
    }
  }
}

// GET: 단일 콘텐츠 조회
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { id } = await params;

    const content = await queryOne('SELECT * FROM content WHERE id = ?', [id]) as any;

    if (!content) {
      return NextResponse.json({ error: '콘텐츠를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 권한 확인: 슈퍼관리자가 아니면 자신의 콘텐츠만
    if (user.role !== 'superadmin' && content.user_id !== user.userId) {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
    }

    // 연결된 디바이스 목록 조회
    const linkedDevices = await queryAll(`
      SELECT d.id, d.name, d.location, d.alias, dc.\`order\`, dc.active
      FROM device_content dc
      JOIN device d ON dc.device_id = d.id
      WHERE dc.content_id = ?
      ORDER BY d.name
    `, [id]);

    return NextResponse.json({
      ...content,
      linkedDevices
    });
  } catch (error) {
    console.error('콘텐츠 조회 오류:', error);
    return NextResponse.json(
      { error: '콘텐츠 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT: 콘텐츠 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { id } = await params;

    const existingContent = await queryOne('SELECT * FROM content WHERE id = ?', [id]) as any;

    if (!existingContent) {
      return NextResponse.json({ error: '콘텐츠를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 권한 확인
    if (user.role !== 'superadmin' && existingContent.user_id !== user.userId) {
      return NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 });
    }

    const previousUrl = existingContent.url as string | null;
    const previousFileName = extractUploadFileName(previousUrl);

    const contentTypeHeader = request.headers.get('content-type') || '';
    let data: any = {};
    let nextUrl = existingContent.url;
    let nextAlt = existingContent.alt;

    if (contentTypeHeader.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      const name = formData.get('name');
      const duration = formData.get('duration');

      data = {
        name: typeof name === 'string' ? name : undefined,
        duration: typeof duration === 'string' ? parseInt(duration, 10) : undefined,
      };

      if (file instanceof File && file.size > 0) {
        if (existingContent.type !== 'image' && existingContent.type !== 'video') {
          return NextResponse.json(
            { error: '파일 교체는 이미지/동영상 콘텐츠에서만 가능합니다.' },
            { status: 400 }
          );
        }

        const uploadedType = getContentType(file);
        if (!uploadedType) {
          return NextResponse.json(
            { error: '이미지 또는 동영상 파일만 업로드 가능합니다.' },
            { status: 400 }
          );
        }

        if (existingContent.type !== uploadedType) {
          return NextResponse.json(
            { error: `${existingContent.type === 'image' ? '이미지' : '동영상'} 콘텐츠는 같은 타입 파일로만 교체할 수 있습니다.` },
            { status: 400 }
          );
        }

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

        nextUrl = `/api/uploads/${uniqueFileName}`;
        nextAlt = file.name;
      }
    } else {
      data = await request.json();
    }

    const now = new Date().toISOString();

    await execute(`
      UPDATE content SET
        name = ?,
        type = ?,
        url = ?,
        text = ?,
        duration = ?,
        fontSize = ?,
        fontColor = ?,
        backgroundColor = ?,
        alt = ?,
        autoplay = ?,
        \`loop\` = ?,
        muted = ?,
        metadata = ?,
        updatedAt = ?
      WHERE id = ?
    `, [
      data.name ?? existingContent.name,
      data.type ?? existingContent.type,
      data.url ?? nextUrl,
      data.text ?? existingContent.text,
      data.duration ?? existingContent.duration,
      data.fontSize ?? existingContent.fontSize,
      data.fontColor ?? existingContent.fontColor,
      data.backgroundColor ?? existingContent.backgroundColor,
      data.alt ?? nextAlt,
      data.autoplay !== undefined ? (data.autoplay ? 1 : 0) : existingContent.autoplay,
      data.loop !== undefined ? (data.loop ? 1 : 0) : existingContent.loop,
      data.muted !== undefined ? (data.muted ? 1 : 0) : existingContent.muted,
      data.metadata ? JSON.stringify(data.metadata) : existingContent.metadata,
      now,
      id
    ]);

    const updatedContent = await queryOne('SELECT * FROM content WHERE id = ?', [id]);

    // 파일 교체로 URL이 바뀐 경우, 참조가 없어진 기존 파일 정리
    if (previousFileName && previousUrl !== (updatedContent as any)?.url) {
      await cleanupUploadFileIfUnused(previousFileName);
    }

    return NextResponse.json(updatedContent);
  } catch (error) {
    console.error('콘텐츠 수정 오류:', error);
    return NextResponse.json(
      { error: '콘텐츠 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 콘텐츠 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { id } = await params;

    const existingContent = await queryOne('SELECT * FROM content WHERE id = ?', [id]) as any;

    if (!existingContent) {
      return NextResponse.json({ error: '콘텐츠를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 권한 확인
    if (user.role !== 'superadmin' && existingContent.user_id !== user.userId) {
      return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 });
    }

    // 연결된 디바이스가 있는지 확인
    const linkedCount = await queryOne(
      'SELECT COUNT(*) as count FROM device_content WHERE content_id = ?',
      [id]
    ) as any;

    if (linkedCount?.count > 0) {
      return NextResponse.json(
        { error: `이 콘텐츠는 ${linkedCount.count}개의 디바이스에 연결되어 있습니다. 먼저 연결을 해제해주세요.` },
        { status: 400 }
      );
    }

    const fileName = extractUploadFileName(existingContent.url);

    // 콘텐츠 삭제
    await execute('DELETE FROM content WHERE id = ?', [id]);

    // 다른 콘텐츠에서 사용하지 않는 업로드 파일이면 삭제
    if (fileName) {
      await cleanupUploadFileIfUnused(fileName);
    }

    return NextResponse.json({ success: true, message: '콘텐츠가 삭제되었습니다.' });
  } catch (error) {
    console.error('콘텐츠 삭제 오류:', error);
    return NextResponse.json(
      { error: '콘텐츠 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
