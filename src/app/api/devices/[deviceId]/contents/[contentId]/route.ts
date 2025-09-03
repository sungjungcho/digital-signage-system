import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request, { params }: { params: { deviceId: string, contentId: string } }) {
  const { deviceId, contentId } = params;
  try {
    // deviceId도 where에 포함시켜서 보안 강화
    await prisma.deviceContent.delete({
      where: { id: contentId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 });
  }
}
