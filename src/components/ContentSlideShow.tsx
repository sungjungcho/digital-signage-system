'use client';

import { useState, useEffect, useCallback, ReactElement } from 'react';
import DisplayContent from './DisplayContent';
import { Content } from '@/types';

interface ContentSlideShowProps {
  contents: Content[];
}

export default function ContentSlideShow({ contents }: ContentSlideShowProps): ReactElement {
  const [currentIndex, setCurrentIndex] = useState(0);

  const moveToNextContent = useCallback(() => {
    setCurrentIndex((prevIndex) => 
      prevIndex === contents.length - 1 ? 0 : prevIndex + 1
    );
  }, [contents.length]);

  useEffect(() => {
    if (!contents.length) return;
    
    const currentContent = contents[currentIndex];
    const timer = setTimeout(moveToNextContent, currentContent.duration);

    return () => clearTimeout(timer);
  }, [currentIndex, contents, moveToNextContent]);

  if (!contents.length) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-2xl text-white">콘텐츠가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <DisplayContent content={contents[currentIndex]} />
    </div>
  );
}
