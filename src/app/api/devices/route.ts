import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const devices = await prisma.device.findMany({
      include: {
        contents: true,
      },
    });
    return NextResponse.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json(
      { error: '디바이스 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    const newDevice = await prisma.device.create({
      data: {
        name: data.name,
        location: data.location,
        status: 'offline',
      },
    });

    return NextResponse.json(newDevice);
  } catch (error) {
    console.error('Error creating device:', error);
    return NextResponse.json(
      { error: '디바이스 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
