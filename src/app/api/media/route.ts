import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const imagesDir = path.join(publicDir, 'images');
    const videosDir = path.join(publicDir, 'videos');
    const uploadsDir = path.join(publicDir, 'uploads');

    // 이미지 파일 목록 (images 폴더)
    const imageFiles = fs.existsSync(imagesDir)
      ? fs.readdirSync(imagesDir)
        .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
        .map(file => `/images/${file}`)
      : [];

    // 동영상 파일 목록 (videos 폴더)
    const videoFiles = fs.existsSync(videosDir)
      ? fs.readdirSync(videosDir)
        .filter(file => /\.(mp4|webm)$/i.test(file))
        .map(file => `/videos/${file}`)
      : [];

    // uploads 폴더에서 이미지와 동영상 파일 추가
    if (fs.existsSync(uploadsDir)) {
      const uploadedFiles = fs.readdirSync(uploadsDir);

      // 업로드된 이미지 파일
      const uploadedImages = uploadedFiles
        .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
        .map(file => `/api/uploads/${file}`);

      // 업로드된 동영상 파일
      const uploadedVideos = uploadedFiles
        .filter(file => /\.(mp4|webm|mov)$/i.test(file))
        .map(file => `/api/uploads/${file}`);

      imageFiles.push(...uploadedImages);
      videoFiles.push(...uploadedVideos);
    }

    return NextResponse.json({ images: imageFiles, videos: videoFiles });
  } catch (error) {
    console.error('Error fetching media files:', error);
    return NextResponse.json({ images: [], videos: [] });
  }
}
