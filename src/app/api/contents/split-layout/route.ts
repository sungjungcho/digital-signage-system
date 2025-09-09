import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastContentUpdateToDevice } from '@/lib/wsServer';

export async function POST(request: NextRequest) {
  try {
    const { deviceId, duration = 10000 } = await request.json();

    if (!deviceId) {
      return NextResponse.json({ error: '디바이스 ID가 필요합니다' }, { status: 400 });
    }

    // 디바이스 확인
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: { contents: true }
    });

    if (!device) {
      return NextResponse.json({ error: '디바이스를 찾을 수 없습니다' }, { status: 404 });
    }

    // 기존 콘텐츠들 가져오기 (split_layout이 아닌 것들만)
    const existingContents = device.contents.filter(
      content => content.type !== 'split_layout'
    );

    // 기존 콘텐츠를 프론트엔드 Content 형식으로 변환
    const formattedContents = existingContents.map(item => ({
      id: item.id,
      type: item.type,
      duration: item.duration,
      ...(item.text && { text: item.text }),
      ...(item.fontSize && { fontSize: item.fontSize }),
      ...(item.fontColor && { fontColor: item.fontColor }),
      ...(item.backgroundColor && { backgroundColor: item.backgroundColor }),
      ...(item.url && { url: item.url }),
      ...(item.alt && { alt: item.alt }),
      ...(item.autoplay !== undefined && { autoplay: item.autoplay }),
      ...(item.loop !== undefined && { loop: item.loop }),
      ...(item.muted !== undefined && { muted: item.muted }),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    // 새로운 split_layout 콘텐츠 생성
    // split_layout은 JSON 형태로 leftContents를 text 필드에 저장
    const leftContentsJson = JSON.stringify(formattedContents);
    const maxOrder = device.contents.length > 0 
      ? Math.max(...device.contents.map(c => c.order)) + 1 
      : 0;

    const newContent = await prisma.deviceContent.create({
      data: {
        deviceId: deviceId,
        type: 'split_layout',
        text: leftContentsJson, // leftContents를 JSON 문자열로 저장
        duration: duration,
        order: maxOrder,
        active: true,
      }
    });

    // 해당 디바이스에 콘텐츠 업데이트 통지
    broadcastContentUpdateToDevice(deviceId);

    return NextResponse.json(newContent);
  } catch (error) {
    console.error('Split layout 콘텐츠 추가 중 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}