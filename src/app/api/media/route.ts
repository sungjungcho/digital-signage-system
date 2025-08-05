import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const imagesDir = path.join(publicDir, 'images');
    const videosDir = path.join(publicDir, 'videos');

    // 이미지 파일 목록
    const imageFiles = fs.existsSync(imagesDir)
      ? fs.readdirSync(imagesDir)
        .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
        .map(file => `/images/${file}`)
      : [];

    // 비디오 파일 목록
    const videoFiles = fs.existsSync(videosDir)
      ? fs.readdirSync(videosDir)
        .filter(file => /\.(mp4|webm)$/i.test(file))
        .map(file => `/videos/${file}`)
      : [];

    return NextResponse.json({ images: imageFiles, videos: videoFiles });
  } catch (error) {
    console.error('Error fetching media files:', error);
    return NextResponse.json({ images: [], videos: [] });
  }
}
