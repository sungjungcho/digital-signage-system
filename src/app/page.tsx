'use client';

import ContentSlideShow from '@/components/ContentSlideShow';
import { useCurrentContent } from '@/lib/hooks';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  const router = useRouter();
  const currentContents = useCurrentContent();
  const [savedDeviceId, setSavedDeviceId] = useState<string | null>(null);

  useEffect(() => {
    // 클라이언트 측에서만 로컬 스토리지 접근
    const deviceId = localStorage.getItem('deviceId');
    setSavedDeviceId(deviceId);
    
    // 저장된 디바이스 ID가 있으면 해당 디바이스의 디스플레이 페이지로 리다이렉트
    if (deviceId) {
      router.push(`/display/${deviceId}`);
    }
  }, [router]);

  // 콘텐츠가 없을 경우 표시할 기본 콘텐츠
  const defaultContents = [
    {
      id: 'default-1',
      type: 'text' as const,
      text: '디지털 사이니지에 오신 것을 환영합니다',
      duration: 5000,
      fontSize: '2.5rem',
      fontColor: '#ffffff',
      backgroundColor: '#000000',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const contents = currentContents.length > 0 ? currentContents : defaultContents;

  // 로딩 중이거나 리다이렉트 중인 경우
  if (savedDeviceId) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <p className="text-2xl text-white">디바이스 페이지로 이동 중...</p>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-black text-white">
      <main className="w-full h-full relative">
        <ContentSlideShow contents={contents} />
        
        {/* 디바이스 초기화 버튼 */}
        <div className="absolute bottom-8 right-8 flex space-x-4">
          <a 
            href="/initialize-device" 
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md shadow-lg transition duration-200"
          >
            디바이스 설정
          </a>
          <a 
            href="/admin" 
            className="bg-gray-700 hover:bg-gray-800 text-white py-2 px-6 rounded-md shadow-lg transition duration-200"
          >
            관리자 페이지
          </a>
        </div>
      </main>
    </div>
  );
}
