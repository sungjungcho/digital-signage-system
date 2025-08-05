'use client';

import { useEffect, useState } from 'react';
import { Content } from '@/types';
import ContentSlideShow from '@/components/ContentSlideShow';
import { getMediaFiles } from '@/lib/media';

export default function TestPage() {
  const [displayContents, setDisplayContents] = useState<Content[]>([]);

  useEffect(() => {
    async function loadContents() {
      try {
        // 기본 콘텐츠 생성
        const defaultContent: Content = {
          id: 'text-1',
          type: 'text',
          text: '디지털 사이니지 테스트',
          duration: 5000,
          fontSize: '3rem',
          fontColor: '#ffffff',
          backgroundColor: '#000000',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const { images, videos } = await getMediaFiles();

        // 이미지 콘텐츠 생성
        const imageContents: Content[] = images.map((url: string, index: number) => ({
      id: `image-${index}`,
      type: 'image' as const,
      url,
      duration: 5000,
      alt: `Image ${index + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    // 중간 텍스트 콘텐츠
    const transitionContent: Content = {
      id: 'text-2',
      type: 'text',
      text: '비디오 재생을 시작합니다',
      duration: 3000,
      fontSize: '3rem',
      fontColor: '#ffffff',
      backgroundColor: '#000000',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 비디오 콘텐츠 생성
    const videoContents: Content[] = videos.map((url: string, index: number) => ({
      id: `video-${index}`,
      type: 'video' as const,
      url,
      duration: 10000,
      autoplay: true,
      loop: true,
      muted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    // 모든 콘텐츠 합치기
    setDisplayContents([
      defaultContent,
      ...imageContents,
      transitionContent,
      ...videoContents,
    ]);
      } catch (error) {
        console.error('콘텐츠 로딩 중 오류 발생:', error);
      }
    }
    
    loadContents();
  }, []);

  return (
    <div className="w-screen h-screen bg-black">
      <ContentSlideShow contents={displayContents} />
    </div>
  );
}
