'use client';

import ContentSlideShow from '@/components/ContentSlideShow';
import { useDeviceContent } from '@/lib/hooks';
import { useEffect, useState } from 'react';
import { use } from 'react';

export default function DeviceDisplay({ params }: { params: Promise<{ deviceId: string }> }) {
  const { deviceId } = use(params);
  const [deviceName, setDeviceName] = useState<string>('');
  const { contents, isLoading, error } = useDeviceContent(deviceId);

  // 디바이스 정보 가져오기
  useEffect(() => {
    const fetchDeviceInfo = async () => {
      try {
        const response = await fetch(`/api/devices/${deviceId}`);
        const data = await response.json();
        if (data && data.name) {
          setDeviceName(data.name);
          // 디바이스 상태 업데이트 (온라인으로 표시)
          updateDeviceStatus('online');
        }
      } catch (err) {
        console.error('디바이스 정보를 가져오는 중 오류가 발생했습니다:', err);
      }
    };

    fetchDeviceInfo();

    // 컴포넌트 언마운트시 디바이스 상태 오프라인으로 변경
    return () => {
      updateDeviceStatus('offline');
    };
  }, [deviceId]);

  // 디바이스 상태 업데이트 함수
  const updateDeviceStatus = async (status: 'online' | 'offline') => {
    try {
      await fetch(`/api/devices/${deviceId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, lastConnected: new Date().toISOString() }),
      });
    } catch (err) {
      console.error('디바이스 상태 업데이트 중 오류가 발생했습니다:', err);
    }
  };

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <p className="text-2xl text-white">콘텐츠를 로딩 중입니다...</p>
      </div>
    );
  }

  // 에러 발생 시
  if (error) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <p className="text-2xl text-red-500">오류가 발생했습니다: {error}</p>
      </div>
    );
  }

  // 콘텐츠가 없을 경우 표시할 기본 콘텐츠
  const defaultContents = [
    {
      id: 'default-1',
      type: 'text' as const,
      text: `${deviceName || '디바이스'} - 등록된 콘텐츠가 없습니다`,
      duration: 5000,
      fontSize: '2.5rem',
      fontColor: '#ffffff',
      backgroundColor: '#000000',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const displayContents = contents.length > 0 ? contents : defaultContents;

  return (
    <div className="w-screen h-screen bg-black text-white">
      <main className="w-full h-full">
        <ContentSlideShow contents={displayContents} />
      </main>
    </div>
  );
}
