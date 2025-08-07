import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;
    const { status, lastConnected } = await req.json();
    
    // 디바이스 상태 업데이트
    const updatedDevice = await prisma.device.update({
      where: {
        id: deviceId,
      },
      data: {
        status: status,
        lastConnected: lastConnected ? new Date(lastConnected) : undefined,
      },
    });
    
    return NextResponse.json(updatedDevice);
  } catch (error) {
    console.error('디바이스 상태 업데이트 오류:', error);
    return NextResponse.json(
      { error: '디바이스 상태를 업데이트하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
