// src/app/display/[deviceId]/DeviceDisplay.tsx
'use client';
import ContentSlideShow from '@/components/ContentSlideShow';
import { useDeviceContent } from '@/lib/hooks';
import { useEffect, useState, useRef } from 'react';

type Alert = {
  id: string;
  message: string;
  targetDeviceIds: string[];
  createdAt: string;
  expiresAt?: string;
  duration?: number;
};

export default function DeviceDisplay({ deviceId }: { deviceId: string }) {
  const [deviceName, setDeviceName] = useState<string>('');
  const { contents, isLoading, error, refreshContents } = useDeviceContent(deviceId);
  const [alert, setAlert] = useState<Alert | null>(null);
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!deviceId) return;
    console.log('WebSocket 연결 시도:', deviceId);
    const ws = new window.WebSocket(`ws://${window.location.hostname}:3031?deviceId=${deviceId}`);
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log('WebSocket 연결 성공:', deviceId);
    };
    
    ws.onmessage = (event: MessageEvent) => {
      console.log('WebSocket 메시지 수신:', event.data);
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
      } else if (data.type === "closeAlert") {
        setAlert(null);
      } else if (data.type === "contentUpdate") {
        // 콘텐츠 업데이트 통지를 받으면 콘텐츠 새로고침
        refreshContents();
      } else if (data.type === "patientListUpdate") {
        // 환자 목록 업데이트 통지를 받으면 커스텀 이벤트 발생
        console.log('환자 목록 업데이트 WebSocket 메시지 수신:', deviceId);
        window.dispatchEvent(new Event('patientListUpdate'));
      }
    };
    
    ws.onclose = () => {
      console.log('WebSocket 연결 해제:', deviceId);
      wsRef.current = null;
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket 오류:', error);
    };
    
    return () => {
      ws.close();
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    };
  }, [deviceId]);

  useEffect(() => {
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }
    if (alert && alert.duration) {
      alertTimeoutRef.current = setTimeout(async () => {
        setAlert(null);
        await fetch('/api/alerts', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: alert.id }),
        });
      }, alert.duration);
    }
    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
        alertTimeoutRef.current = null;
      }
    };
  }, [alert]);

  useEffect(() => {
    const fetchDeviceInfo = async () => {
      try {
        const response = await fetch(`/api/devices/${deviceId}`);
        const data = await response.json();
        if (data && data.name) {
          setDeviceName(data.name);
          updateDeviceStatus('online');
        }
      } catch (err) {
        console.error('디바이스 정보를 가져오는 중 오류가 발생했습니다:', err);
      }
    };
    fetchDeviceInfo();
    return () => {
      updateDeviceStatus('offline');
    };
  }, [deviceId]);

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

  if (isLoading) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <p className="text-2xl text-white">콘텐츠를 로딩 중입니다...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <p className="text-2xl text-red-500">오류가 발생했습니다: {error}</p>
      </div>
    );
  }

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

  const alertModal = alert ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-2xl px-10 py-8 max-w-lg w-full flex flex-col items-center animate-pulse border-4 border-red-600">
        <div className="text-3xl font-bold text-blue-700 mb-4">🔔 호출</div>
        <div className="text-xl text-gray-900 text-center mb-6 whitespace-pre-line break-words">{alert.message}</div>
      </div>
    </div>
  ) : null;

  return (
    <div className="w-screen h-screen bg-black text-white">
      {alertModal}
      <main className="w-full h-full">
        <ContentSlideShow contents={displayContents} deviceId={deviceId} />
      </main>
    </div>
  );
}
