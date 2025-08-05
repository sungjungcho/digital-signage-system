'use client';

import { useEffect, useState } from 'react';
import { DeviceContent } from '@/types/device';

export default function DevicePreviewPage({ params }: { params: { deviceId: string } }) {
  const [contents, setContents] = useState<DeviceContent[]>([]);
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState<{ name: string; location: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // 디바이스 정보 및 콘텐츠 가져오기
  useEffect(() => {
    const fetchDeviceInfo = async () => {
      try {
        const deviceResponse = await fetch(`/api/devices/${params.deviceId}`);
        if (!deviceResponse.ok) {
          console.error('디바이스 정보를 불러오는데 실패했습니다.');
          return;
        }
        const deviceData = await deviceResponse.json();
        setDeviceInfo({ name: deviceData.name, location: deviceData.location });

        const contentsResponse = await fetch(`/api/devices/${params.deviceId}/contents`);
        if (!contentsResponse.ok) {
          console.error('콘텐츠 목록을 불러오는데 실패했습니다.');
          return;
        }
        const contentsData = await contentsResponse.json();
        
        // 순서에 따라 정렬
        const sortedContents = contentsData.sort((a: DeviceContent, b: DeviceContent) => a.order - b.order);
        setContents(sortedContents);
        setLoading(false);
      } catch (error) {
        console.error('데이터를 불러오는 중 오류 발생:', error);
        setLoading(false);
      }
    };

    fetchDeviceInfo();
  }, [params.deviceId]);

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

  if (contents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-white text-2xl">
          {deviceInfo ? `${deviceInfo.name} (${deviceInfo.location})에 등록된 콘텐츠가 없습니다.` : '등록된 콘텐츠가 없습니다.'}
        </div>
      </div>
    );
  }

  const currentContent = contents[currentContentIndex];
  
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
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
  );
}
