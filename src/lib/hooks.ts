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
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 수동으로 새로고침하는 함수
  const refreshContents = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    let isMounted = true;

    const fetchDeviceContents = async () => {
      try {
        setIsLoading(true);

        // 1. 먼저 스케줄 기반 콘텐츠 확인
        console.log('[useDeviceContent] 스케줄 확인 시작:', deviceId);
        const scheduleResponse = await fetch(`/api/schedules/active?deviceId=${deviceId}`);

        if (scheduleResponse.ok) {
          const scheduleData = await scheduleResponse.json();
          console.log('[useDeviceContent] 스케줄 응답:', scheduleData);

          if (scheduleData.hasSchedule && scheduleData.contents && scheduleData.contents.length > 0) {
            console.log('[useDeviceContent] 스케줄 콘텐츠 사용:', scheduleData.contents.length, '개');
            if (isMounted) {
              // 스케줄 콘텐츠를 Content 타입으로 변환
              const formattedContents: Content[] = scheduleData.contents.map((item: any) => {
                if (item.type === 'mixed') {
                  return {
                    id: item.id,
                    type: 'mixed' as const,
                    duration: item.duration,
                    elements: item.elements || [],
                    ...(item.metadata && { metadata: item.metadata }),
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                  };
                }

                return {
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
                  ...(item.metadata && { metadata: item.metadata }),
                  createdAt: item.createdAt,
                  updatedAt: item.updatedAt,
                };
              });

              setContents(formattedContents);
              setError(null);
              setIsLoading(false);
              return;
            }
          } else {
            console.log('[useDeviceContent] 활성 스케줄 없음, 기본 콘텐츠 사용');
          }
        }

        // 2. 스케줄이 없으면 기본 콘텐츠 사용
        console.log('[useDeviceContent] 기본 콘텐츠 조회 시작');
        const response = await fetch(`/api/devices/${deviceId}/contents`);

        if (!response.ok) {
          throw new Error('콘텐츠를 가져오는데 실패했습니다');
        }

        const data = await response.json();
        console.log('[useDeviceContent] 기본 콘텐츠:', data.length, '개');
        
        if (isMounted) {
          // API 응답을 프론트엔드 Content 타입으로 변환
          const formattedContents: Content[] = data.map((item: any) => {
            if (item.type === 'split_layout') {
              // split_layout의 경우 text 필드에서 leftContents를 파싱
              let leftContents = [];
              try {
                leftContents = item.text ? JSON.parse(item.text) : [];
              } catch (e) {
                console.error('Failed to parse leftContents:', e);
                leftContents = [];
              }

              return {
                id: item.id,
                type: 'split_layout' as const,
                duration: item.duration,
                leftContents: leftContents,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
              };
            }

            if (item.type === 'mixed') {
              // mixed 타입의 경우 elements 포함
              return {
                id: item.id,
                type: 'mixed' as const,
                duration: item.duration,
                elements: item.elements || [],
                ...(item.metadata && { metadata: item.metadata }),
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
              };
            }

            // 기존 타입들 처리
            return {
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
              ...(item.metadata && { metadata: item.metadata }),
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            };
          });
          
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

    // 1분마다 스케줄 업데이트 확인
    const scheduleCheckInterval = setInterval(() => {
      console.log('[useDeviceContent] 1분 주기 스케줄 체크');
      fetchDeviceContents();
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(scheduleCheckInterval);
    };
  }, [deviceId, refreshTrigger]);

  return { contents, isLoading, error, refreshContents };
}
