'use client';

import { useState, useEffect, useCallback, ReactElement } from 'react';
import DisplayContent from './DisplayContent';
import DateTimeWidget from './DateTimeWidget';
import WaitingListWidget from './WaitingListWidget';
import { Content } from '@/types';

interface ContentSlideShowProps {
  contents: Content[];
  deviceId?: string;
}

export default function ContentSlideShow({ contents, deviceId = '' }: ContentSlideShowProps): ReactElement {
  const [currentIndex, setCurrentIndex] = useState(0);

  // split_layout 콘텐츠가 있는지 확인
  const hasSplitLayout = contents.some(content => content.type === 'split_layout');

  // split_layout이 있으면 일반 콘텐츠만 추출, 없으면 모든 콘텐츠
  const displayContents = hasSplitLayout
    ? contents.filter(content => content.type !== 'split_layout')
    : contents;

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

  // split_layout이 있으면 분할 화면 레이아웃 사용
  if (hasSplitLayout) {
    return (
      <div className="w-full h-full flex">
        {/* 좌측: 일반 콘텐츠 순환 (2/3 영역) */}
        <div className="w-2/3 h-full">
          <DisplayContent content={displayContents[currentIndex]} deviceId={deviceId} />
        </div>

        {/* 우측: 날짜/시간 + 대기환자 명단 (1/3 영역) */}
        <div className="w-1/3 h-full bg-gray-100 p-4 flex flex-col space-y-4">
          <DateTimeWidget />
          <WaitingListWidget deviceId={deviceId} className="flex-1" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <DisplayContent content={displayContents[currentIndex]} deviceId={deviceId} />
    </div>
  );
}
