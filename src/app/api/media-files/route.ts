import { NextRequest, NextResponse } from 'next/server';
import { getMediaFiles } from '@/lib/media';

export async function GET(request: NextRequest) {
  try {
    const files = getMediaFiles();
    return NextResponse.json(files);
  } catch (error) {
    return NextResponse.json(
      { error: '미디어 파일을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}
