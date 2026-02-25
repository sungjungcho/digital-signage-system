'use client';

import { useState, useEffect, useCallback } from 'react';
import { LayoutContentItem } from '@/types/layout';
import DisplayContent from '../DisplayContent';

interface ContentCarouselProps {
  contents: LayoutContentItem[];
  deviceId?: string;
}

export default function ContentCarousel({ contents, deviceId }: ContentCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const moveToNextContent = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      prevIndex === contents.length - 1 ? 0 : prevIndex + 1
    );
  }, [contents.length]);

  useEffect(() => {
    if (!contents.length) return;

    const currentContent = contents[currentIndex];
    const duration = currentContent.duration || 5000;
    const timer = setTimeout(moveToNextContent, duration);

    return () => clearTimeout(timer);
  }, [currentIndex, contents, moveToNextContent]);

  // 비디오 종료 핸들러 (duration이 0인 경우)
  const handleVideoEnd = useCallback(() => {
    moveToNextContent();
  }, [moveToNextContent]);

  if (!contents.length) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <p className="text-xl text-gray-400">콘텐츠가 없습니다</p>
      </div>
    );
  }

  const currentContent = contents[currentIndex];

  // LayoutContentItem을 Content 형식으로 변환
  const displayContent = {
    id: currentContent.id,
    type: currentContent.type === 'youtube' ? 'video' : currentContent.type,
    duration: currentContent.duration,
    url: currentContent.url,
    text: currentContent.text,
    fontSize: currentContent.fontSize,
    fontColor: currentContent.fontColor,
    backgroundColor: currentContent.backgroundColor,
    metadata: currentContent.type === 'youtube'
      ? JSON.stringify({
          youtubeType: currentContent.metadata?.youtubeType || 'video',
          autoplay: currentContent.metadata?.autoplay ?? true,
          loop: currentContent.metadata?.loop ?? true,
          mute: currentContent.metadata?.mute ?? true,
        })
      : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="w-full h-full">
      <DisplayContent
        content={displayContent as any}
        deviceId={deviceId}
        onVideoEnd={currentContent.duration === 0 ? handleVideoEnd : undefined}
      />
    </div>
  );
}
