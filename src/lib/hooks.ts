import { useState, useEffect } from 'react';
import { type Content, type Schedule } from '@/types';
import { getCurrentSchedule } from './schedule';
import { getStoredSchedules } from './storage';

export function useCurrentContent() {
  const [currentContents, setCurrentContents] = useState<Content[]>([]);

  useEffect(() => {
    // 1분마다 현재 스케줄 확인
    function updateCurrentContent() {
      const schedules = getStoredSchedules();
      const currentSchedule = getCurrentSchedule(schedules);
      setCurrentContents(currentSchedule?.contents || []);
    }

    // 초기 콘텐츠 설정
    updateCurrentContent();

    // 1분마다 업데이트
    const interval = setInterval(updateCurrentContent, 60000);

    return () => clearInterval(interval);
  }, []);

  return currentContents;
}
