import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const deviceId = formData.get('deviceId') as string;
    const type = formData.get('type') as 'image' | 'video';

    if (!file || !deviceId || !type) {
      return NextResponse.json(
        { error: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 파일 정보 가져오기
    const bytes = await (file as Blob).arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = (file as File).name;
    
    // public/uploads 디렉토리 생성 (없는 경우)
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const uniqueFileName = `${Date.now()}-${fileName}`;
    const filePath = join(uploadDir, uniqueFileName);
    
    await writeFile(filePath, buffer);
    const publicPath = `/uploads/${uniqueFileName}`;

    // 데이터베이스에 콘텐츠 정보 저장
    const existingContents = await prisma.deviceContent.findMany({
      where: {
        deviceId: deviceId,
      },
    });

    const newContent = await prisma.deviceContent.create({
      data: {
        deviceId: deviceId,
        type: type,
        url: publicPath,
        duration: type === 'image' ? 5000 : 0, // 이미지는 기본 5초, 비디오는 0(비디오 길이만큼)
        autoplay: type === 'video',
        loop: type === 'video',
        muted: type === 'video',
        alt: fileName,
        order: existingContents.length,
      },
    });

    return NextResponse.json(newContent);
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: '파일 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
