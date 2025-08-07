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

// 특정 디바이스의 콘텐츠를 가져오는 훅
export function useDeviceContent(deviceId: string) {
  const [contents, setContents] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchDeviceContents = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/devices/${deviceId}/contents`);
        
        if (!response.ok) {
          throw new Error('콘텐츠를 가져오는데 실패했습니다');
        }
        
        const data = await response.json();
        
        if (isMounted) {
          // API 응답을 프론트엔드 Content 타입으로 변환
          const formattedContents: Content[] = data.map((item: any) => ({
            id: item.id,
            type: item.type as 'text' | 'image' | 'video',
            duration: item.duration,
            ...(item.text && { text: item.text }),
            ...(item.fontSize && { fontSize: item.fontSize }),
            ...(item.fontColor && { fontColor: item.fontColor }),
            ...(item.backgroundColor && { backgroundColor: item.backgroundColor }),
            ...(item.url && { url: item.url }),
            ...(item.alt && { alt: item.alt }),
            ...(item.autoplay !== undefined && { autoplay: item.autoplay }),
            ...(item.loop !== undefined && { loop: item.loop }),
            ...(item.muted !== undefined && { muted: item.muted }),
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }));
          
          setContents(formattedContents);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
          setContents([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDeviceContents();

    // 30초마다 콘텐츠 업데이트
    const interval = setInterval(fetchDeviceContents, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [deviceId]);

  return { contents, isLoading, error };
}
