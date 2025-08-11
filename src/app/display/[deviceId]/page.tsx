'use client';


import ContentSlideShow from '@/components/ContentSlideShow';
import { useDeviceContent } from '@/lib/hooks';
import { useEffect, useState, useRef } from 'react';
import { use } from 'react';

type Alert = {
  id: string;
  message: string;
  targetDeviceIds: string[];
  createdAt: string;
  expiresAt?: string;
};

export default function DeviceDisplay({ params }: { params: Promise<{ deviceId: string }> }) {
  const { deviceId } = use(params);
  const [deviceName, setDeviceName] = useState<string>('');
  const { contents, isLoading, error } = useDeviceContent(deviceId);
  // 알림 모달 상태
  const [alert, setAlert] = useState<Alert | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  // WebSocket 연결 및 알림 수신
  useEffect(() => {
    if (!deviceId) return;
    const ws = new window.WebSocket(`ws://${window.location.hostname}:3031?deviceId=${deviceId}`);
    wsRef.current = ws;
    ws.onmessage = (event: MessageEvent) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (data.type === "alert" && data.alert) {
        setAlert(data.alert);
      } else if (data.type === "init" && data.alerts && Array.isArray(data.alerts)) {
        if (data.alerts.length > 0) setAlert(data.alerts[data.alerts.length - 1]);
      }
    };
    ws.onclose = () => {
      wsRef.current = null;
    };
    return () => {
      ws.close();
    };
  }, [deviceId]);

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

  // 알림이 있으면 모달 형태로 중앙에 표시
  const alertModal = alert ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-2xl px-10 py-8 max-w-lg w-full flex flex-col items-center animate-pulse border-4 border-red-600">
        <div className="text-3xl font-bold text-red-700 mb-4">긴급 알림</div>
        <div className="text-xl text-gray-900 text-center mb-6 whitespace-pre-line break-words">{alert.message}</div>
      </div>
    </div>
  ) : null;

  return (
    <div className="w-screen h-screen bg-black text-white">
      {alertModal}
      <main className="w-full h-full">
        <ContentSlideShow contents={displayContents} />
      </main>
    </div>
  );
}
