"use client";

import { useEffect, useState, use, useRef } from "react";
import type { devicecontent as DeviceContent } from "@/types/device";

type Alert = {
  id: string;
  message: string;
  targetDeviceIds: string[];
  createdAt: string;
  expiresAt?: string;
};

export default function DevicePreviewPage({ params }: { params: Promise<{ deviceId: string }> }) {
  const { deviceId } = use(params);
  const [alert, setAlert] = useState<Alert | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [contents, setContents] = useState<DeviceContent[]>([]);
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState<{ name: string; location: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // WebSocket 연결 및 알림 수신
  useEffect(() => {
    if (!deviceId) return;
    const ws = new window.WebSocket(`ws://${window.location.hostname}:3031?deviceId=${deviceId}`);
    wsRef.current = ws;
    ws.onmessage = (event: MessageEvent) => {
      console.log('WebSocket 수신:', event.data);
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

  // 디바이스 정보 및 콘텐츠 가져오기
  useEffect(() => {
    const fetchDeviceInfo = async () => {
      try {
        const deviceResponse = await fetch(`/api/devices/${deviceId}`);
        if (!deviceResponse.ok) {
          console.error("디바이스 정보를 불러오는데 실패했습니다.");
          return;
        }
        const deviceData = await deviceResponse.json();
        setDeviceInfo({ name: deviceData.name, location: deviceData.location });
        const contentsResponse = await fetch(`/api/devices/${deviceId}/contents`);
        if (!contentsResponse.ok) {
          console.error("콘텐츠 목록을 불러오는데 실패했습니다.");
          return;
        }
        const contentsData = await contentsResponse.json();
        const sortedContents = contentsData.sort((a: DeviceContent, b: DeviceContent) => a.order - b.order);
        setContents(sortedContents);
        setLoading(false);
      } catch (error) {
        console.error("데이터를 불러오는 중 오류 발생:", error);
        setLoading(false);
      }
    };
    fetchDeviceInfo();
  }, [deviceId]);

  // 콘텐츠 순환 표시
  useEffect(() => {
    if (contents.length === 0) return;
    const currentContent = contents[currentContentIndex];
    const timer = setTimeout(() => {
      setCurrentContentIndex((prevIndex) => (prevIndex + 1) % contents.length);
    }, currentContent.duration);
    return () => clearTimeout(timer);
  }, [currentContentIndex, contents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-white text-2xl">콘텐츠를 불러오는 중...</div>
      </div>
    );
  }

  // 알림이 있으면 모달 형태로 중앙에 표시
  const alertModal = alert ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-2xl px-10 py-8 max-w-lg w-full flex flex-col items-center animate-pulse border-4 border-red-600">
        <div className="text-3xl font-bold text-red-700 mb-4">긴급 알림</div>
        <div className="text-xl text-gray-900 text-center mb-6 whitespace-pre-line break-words">{alert.message}</div>
        {/* 닫기 버튼은 필요시 추가 가능 */}
      </div>
    </div>
  ) : null;

  if (contents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        {alertModal}
        <div className="text-white text-2xl">
          {deviceInfo ? `${deviceInfo.name} (${deviceInfo.location})에 등록된 콘텐츠가 없습니다.` : '등록된 콘텐츠가 없습니다.'}
        </div>
      </div>
    );
  }

  const currentContent = contents[currentContentIndex];

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative">
      {alertModal}
      <div className="flex-1 w-full flex items-center justify-center">
        {currentContent.type === 'text' ? (
          <div 
            style={{
              color: currentContent.fontColor || '#ffffff',
              backgroundColor: currentContent.backgroundColor || '#000000',
              fontSize: currentContent.fontSize || '3rem',
              padding: '2rem',
              width: '100%',
              height: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            {currentContent.text}
          </div>
        ) : currentContent.type === 'image' ? (
          <div className="w-full h-screen flex items-center justify-center">
            <img 
              src={currentContent.url} 
              alt={currentContent.alt || '이미지'} 
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-full h-screen flex items-center justify-center">
            <video
              src={currentContent.url}
              className="max-w-full max-h-full"
              autoPlay={currentContent.autoplay}
              loop={currentContent.loop}
              muted={currentContent.muted}
              controls={!currentContent.autoplay}
            />
          </div>
        )}
      </div>
    </div>
  );
}