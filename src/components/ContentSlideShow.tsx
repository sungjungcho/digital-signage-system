'use client';

import { useState, useEffect, useCallback, ReactElement } from 'react';
import DisplayContent from './DisplayContent';
import { Content } from '@/types';

interface ContentSlideShowProps {
  contents: Content[];
  deviceId?: string;
}

export default function ContentSlideShow({ contents, deviceId = '' }: ContentSlideShowProps): ReactElement {
  const [currentIndex, setCurrentIndex] = useState(0);

  // split_layout 콘텐츠가 있는지 확인
  const splitLayoutContent = contents.find(content => content.type === 'split_layout');
  
  // split_layout이 있으면 그것만 표시, 없으면 일반 콘텐츠를 순환
  const displayContents = splitLayoutContent ? [splitLayoutContent] : contents.filter(content => content.type !== 'split_layout');

  const moveToNextContent = useCallback(() => {
    setCurrentIndex((prevIndex) => 
      prevIndex === displayContents.length - 1 ? 0 : prevIndex + 1
    );
  }, [displayContents.length]);

  useEffect(() => {
    if (!displayContents.length) return;
    
    const currentContent = displayContents[currentIndex];
    const timer = setTimeout(moveToNextContent, currentContent.duration);

    return () => clearTimeout(timer);
  }, [currentIndex, displayContents, moveToNextContent]);

  useEffect(() => {
    // displayContents가 변경되면 인덱스를 0으로 리셋
    setCurrentIndex(0);
  }, [displayContents.length]);

  if (!displayContents.length) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-2xl text-white">콘텐츠가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <DisplayContent content={displayContents[currentIndex]} deviceId={deviceId} />
    </div>
  );
}
