import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;
    const device = await prisma.device.findUnique({
      where: {
        id: deviceId,
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;
    const data = await req.json();

    // 디바이스 존재 확인
    const device = await prisma.device.findUnique({
      where: {
        id: deviceId,
      }
    });

    if (!device) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 디바이스 이름 업데이트
    const updatedDevice = await prisma.device.update({
      where: {
        id: deviceId,
      },
      data: {
        name: data.name,
      }
    });

    return NextResponse.json(updatedDevice);
  } catch (error) {
    console.error('디바이스 업데이트 중 오류 발생:', error);
    return NextResponse.json(
      { error: '디바이스 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;

    // 디바이스 존재 확인
    const device = await prisma.device.findUnique({
      where: {
        id: deviceId,
      }
    });

    if (!device) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 관련된 콘텐츠 먼저 삭제
    await prisma.deviceContent.deleteMany({
      where: {
        deviceId: deviceId,
      }
    });

    // 디바이스 삭제
    await prisma.device.delete({
      where: {
        id: deviceId,
      }
    });

    return NextResponse.json({ message: '디바이스가 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('디바이스 삭제 중 오류 발생:', error);
    return NextResponse.json(
      { error: '디바이스 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
