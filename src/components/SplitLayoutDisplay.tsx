'use client';

import { useState, useEffect, useCallback } from 'react';
import DisplayContent from './DisplayContent';
import DateTimeWidget from './DateTimeWidget';
import WaitingListWidget from './WaitingListWidget';
import { Content } from '@/types';

interface SplitLayoutDisplayProps {
  contents: Content[];
  deviceId: string;
}

export default function SplitLayoutDisplay({ contents, deviceId }: SplitLayoutDisplayProps) {
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
      <div className="w-full h-full flex">
        {/* 좌측: 기본 메시지 */}
        <div className="w-2/3 h-full bg-black flex items-center justify-center">
          <p className="text-2xl text-white">콘텐츠가 없습니다.</p>
        </div>
        
        {/* 우측: 날짜/시간 + 대기환자 */}
        <div className="w-1/3 h-full bg-gray-100 p-4 flex flex-col space-y-4">
          <DateTimeWidget />
          <WaitingListWidget deviceId={deviceId} className="flex-1" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex">
      {/* 좌측: 기존 콘텐츠 (2/3 영역) */}
      <div className="w-2/3 h-full">
        <DisplayContent content={contents[currentIndex]} />
      </div>
      
      {/* 우측: 날짜/시간 + 대기환자 명단 (1/3 영역) */}
      <div className="w-1/3 h-full bg-gray-100 p-4 flex flex-col space-y-4">
        <DateTimeWidget />
        <WaitingListWidget deviceId={deviceId} className="flex-1" />
      </div>
    </div>
  );
}