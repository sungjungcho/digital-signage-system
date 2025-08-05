import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { deviceId: string } }
) {
  try {
    const device = await prisma.device.findUnique({
      where: {
        id: params.deviceId,
      }
    });

    if (!device) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json(device);
  } catch (error) {
    console.error('디바이스 정보를 가져오는 중 오류 발생:', error);
    return NextResponse.json(
      { error: '디바이스 정보를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
