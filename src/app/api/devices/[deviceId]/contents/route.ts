import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;
    // 데이터베이스에서 디바이스별 콘텐츠 목록 조회
    const deviceContents = await prisma.deviceContent.findMany({
      where: {
        deviceId: deviceId,
      },
      orderBy: {
        order: 'asc',
      },
    });
    
    return NextResponse.json(deviceContents);
  } catch (error) {
    return NextResponse.json(
      { error: '콘텐츠 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
