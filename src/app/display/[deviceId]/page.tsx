"use client";

import { useEffect, useState, use, useRef } from "react";
import type { devicecontent as DeviceContent } from "@/types/device";
import MixedContentDisplay from "@/components/MixedContentDisplay";
import { filterContentsBySchedule } from "@/lib/scheduleUtils";

type Alert = {
  id: string;
  message: string;
  targetDeviceIds: string[];
  createdAt: string;
  expiresAt?: string;
  duration?: number;
};

export default function DevicePreviewPage({ params }: { params: Promise<{ deviceId: string }> }) {
  const { deviceId } = use(params);
  const [alert, setAlert] = useState<Alert | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [allContents, setAllContents] = useState<DeviceContent[]>([]); // 전체 콘텐츠
  const [contents, setContents] = useState<DeviceContent[]>([]); // 스케줄 필터링된 콘텐츠
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState<{ name: string; location: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // WebSocket 연결 및 알림 수신
  useEffect(() => {
    if (!deviceId) return;

    let reconnectTimer: NodeJS.Timeout;
    let isCleanedUp = false;

    const connect = () => {
      if (isCleanedUp) return;

      const wsUrl = `ws://${window.location.hostname}:3031?deviceId=${deviceId}`;
      console.log('[WebSocket] 연결 시도:', wsUrl);

      try {
        const ws = new window.WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[WebSocket] ✅ 연결 성공:', deviceId);
        };

        ws.onerror = () => {
          // 초기 연결 오류는 무시 (정상적인 과정)
          console.log('[WebSocket] 연결 대기 중...');
        };

        ws.onmessage = (event: MessageEvent) => {
          console.log('[WebSocket] 📨 메시지 수신:', event.data);
          let data;
          try {
            data = JSON.parse(event.data);
            console.log('[WebSocket] 파싱된 데이터:', data);
          } catch (e) {
            console.error('[WebSocket] JSON 파싱 오류:', e);
            return;
          }

          if (data.type === "alert" && data.alert) {
            console.log('[WebSocket] 🚨 알림 수신:', data.alert);
            setAlert(data.alert);
          } else if (data.type === "init" && data.alerts && Array.isArray(data.alerts)) {
            console.log('[WebSocket] 🔄 초기화 알림:', data.alerts);
            if (data.alerts.length > 0) setAlert(data.alerts[data.alerts.length - 1]);
          } else if (data.type === "contentUpdate") {
            // 콘텐츠 업데이트 알림 수신 시 페이지 새로고침
            console.log('[WebSocket] ✅ 콘텐츠 업데이트 알림 수신! 페이지를 새로고침합니다.');
            window.location.reload();
          }
        };

        ws.onclose = () => {
          console.log('[WebSocket] 🔌 연결 종료:', deviceId);
          wsRef.current = null;

          // 5초 후 재연결 시도
          if (!isCleanedUp) {
            reconnectTimer = setTimeout(() => {
              console.log('[WebSocket] 재연결 시도...');
              connect();
            }, 5000);
          }
        };
      } catch (error) {
        console.error('[WebSocket] 연결 생성 실패:', error);
        // 5초 후 재연결 시도
        if (!isCleanedUp) {
          reconnectTimer = setTimeout(connect, 5000);
        }
      }
    };

    connect();

    return () => {
      console.log('[WebSocket] 🧹 정리(cleanup) 실행');
      isCleanedUp = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [deviceId]);

  // 알림 자동 닫기 타이머
  useEffect(() => {
    if (!alert) return;

    // duration이 있으면 해당 시간 후에 알림 닫기
    if (alert.duration) {
      console.log('[Alert] 자동 닫기 타이머 설정:', alert.duration, 'ms');
      const timer = setTimeout(() => {
        console.log('[Alert] 타이머 만료, 알림 닫기');
        setAlert(null);
      }, alert.duration);

      return () => clearTimeout(timer);
    }

    // expiresAt이 있으면 해당 시간까지 남은 시간 계산
    if (alert.expiresAt) {
      const expiresTime = new Date(alert.expiresAt).getTime();
      const now = Date.now();
      const remaining = expiresTime - now;

      if (remaining > 0) {
        console.log('[Alert] expiresAt 기반 자동 닫기:', remaining, 'ms 후');
        const timer = setTimeout(() => {
          console.log('[Alert] expiresAt 만료, 알림 닫기');
          setAlert(null);
        }, remaining);

        return () => clearTimeout(timer);
      } else {
        // 이미 만료된 알림이면 즉시 닫기
        setAlert(null);
      }
    }
  }, [alert]);

  // 디바이스 정보 및 콘텐츠 가져오기
  useEffect(() => {
    const fetchDeviceInfo = async () => {
      try {
        console.log('[디바이스 페이지] deviceId:', deviceId);
        const deviceResponse = await fetch(`/api/devices/${deviceId}`);
        if (!deviceResponse.ok) {
          console.error("디바이스 정보를 불러오는데 실패했습니다.");
          return;
        }
        const deviceData = await deviceResponse.json();
        console.log('[디바이스 페이지] 디바이스 정보:', deviceData);
        setDeviceInfo({ name: deviceData.name, location: deviceData.location });

        // 모든 콘텐츠 가져오기
        const contentsResponse = await fetch(`/api/devices/${deviceId}/contents`);
        if (!contentsResponse.ok) {
          console.error("콘텐츠 목록을 불러오는데 실패했습니다.");
          return;
        }
        const contentsData = await contentsResponse.json();
        console.log('[디바이스 페이지] 전체 콘텐츠 데이터:', contentsData);

        const sortedContents = contentsData.sort((a: DeviceContent, b: DeviceContent) => a.order - b.order);
        setAllContents(sortedContents);
        setLoading(false);
      } catch (error) {
        console.error("데이터를 불러오는 중 오류 발생:", error);
        setLoading(false);
      }
    };
    fetchDeviceInfo();
  }, [deviceId]);

  // 스케줄 기반 콘텐츠 필터링 (1분마다 업데이트)
  useEffect(() => {
    const updateFilteredContents = () => {
      const now = new Date();
      const filtered = filterContentsBySchedule(allContents, now);
      console.log('[디바이스 페이지] 스케줄 필터링:', {
        전체콘텐츠: allContents.length,
        필터링된콘텐츠: filtered.length,
        현재시간: now.toLocaleString('ko-KR')
      });
      setContents(filtered);

      // 현재 인덱스가 필터링된 콘텐츠 범위를 벗어나면 0으로 리셋
      if (filtered.length > 0 && currentContentIndex >= filtered.length) {
        setCurrentContentIndex(0);
      }
    };

    // 초기 필터링
    updateFilteredContents();

    // 1분마다 필터링 업데이트
    const filterInterval = setInterval(updateFilteredContents, 60000);
    return () => clearInterval(filterInterval);
  }, [allContents, currentContentIndex]);

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
    console.log('[디바이스 페이지] 콘텐츠가 없음 - contents.length:', contents.length);
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
  console.log('[디바이스 페이지] 현재 표시 중인 콘텐츠:', {
    index: currentContentIndex,
    type: currentContent.type,
    id: currentContent.id,
    hasElements: !!(currentContent as any).elements,
    elementsCount: (currentContent as any).elements?.length || 0
  });

  // mixed 타입일 때 elements 상세 로그
  if (currentContent.type === 'mixed') {
    console.log('[디바이스 페이지] Mixed 콘텐츠 elements 상세:', (currentContent as any).elements);
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative">
      {alertModal}
      <div className="flex-1 w-full flex items-center justify-center">
        {currentContent.type === 'mixed' ? (
          <div className="w-full h-screen">
            <MixedContentDisplay elements={(currentContent as any).elements || []} />
          </div>
        ) : currentContent.type === 'split_layout' ? (
          <div className="w-full h-screen">
            <MixedContentDisplay elements={[{
              type: 'split_layout',
              order: 0,
              duration: currentContent.duration,
              leftContents: JSON.parse(currentContent.text || '[]'),
              metadata: currentContent.metadata ? JSON.parse(currentContent.metadata) : { showNotices: true }
            }]} />
          </div>
        ) : currentContent.type === 'text' ? (
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