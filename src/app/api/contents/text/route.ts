import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // 현재 순서 가져오기
    const existingContents = await prisma.deviceContent.findMany({
      where: {
        deviceId: data.deviceId,
      },
    });
    
    // 새 텍스트 콘텐츠 생성
    const newContent = await prisma.deviceContent.create({
      data: {
        deviceId: data.deviceId,
        type: 'text',
        text: data.text,
        duration: data.duration,
        fontSize: data.fontSize,
        fontColor: data.fontColor,
        backgroundColor: data.backgroundColor,
        order: existingContents.length,
      },
    });

    return NextResponse.json(newContent);
  } catch (error) {
    return NextResponse.json(
      { error: '텍스트 콘텐츠 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
