import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const filePath = path.join(process.cwd(), 'public', 'uploads', ...pathSegments);

  // 보안: public/uploads 디렉토리 외부 접근 방지
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!filePath.startsWith(uploadsDir)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  try {
    const fileBuffer = await readFile(filePath);
    const fileName = pathSegments[pathSegments.length - 1];
    const ext = path.extname(fileName).toLowerCase();

    // MIME 타입 결정
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('파일 읽기 오류:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
