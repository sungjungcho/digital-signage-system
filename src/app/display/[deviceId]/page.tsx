"use client";

import { useEffect, useState, use, useRef } from "react";
import type { devicecontent as DeviceContent } from "@/types/device";
import MixedContentDisplay from "@/components/MixedContentDisplay";
import YoutubePlayer from "@/components/YoutubePlayer";
import { filterContentsBySchedule } from "@/lib/scheduleUtils";
import PinCodeModal from "@/components/display/PinCodeModal";

type Alert = {
  id: string;
  message: string;
  targetDeviceIds: string[];
  createdAt: string;
  expiresAt?: string;
  duration?: number;
};

type DeviceNotice = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  priority?: number;
};

type DisplaySettings = {
  notice_enabled: number;
  notice_default_mode: 'ticker' | 'side_panel' | 'popup_cycle';
  notice_item_duration_sec: number;
  notice_max_items: number;
};

const normalizeDurationMs = (content: DeviceContent): number => {
  const raw = Number(content.duration) || 0;
  if (raw <= 0) return 0;

  // 라이브러리(content 테이블)는 초 단위, 기존 devicecontent는 ms 단위를 사용하므로 보정
  return raw < 1000 ? raw * 1000 : raw;
};

export default function DevicePreviewPage({ params }: { params: Promise<{ deviceId: string }> }) {
  const { deviceId } = use(params);
  const [alert, setAlert] = useState<Alert | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [allContents, setAllContents] = useState<DeviceContent[]>([]); // 전체 콘텐츠
  const [contents, setContents] = useState<DeviceContent[]>([]); // 스케줄 필터링된 콘텐츠
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState<{ name: string; location: string } | null>(null);
  const [realDeviceId, setRealDeviceId] = useState<string | null>(null); // 실제 디바이스 ID (UUID)
  const [loading, setLoading] = useState(true);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [checkingPin, setCheckingPin] = useState(true);
  const [notices, setNotices] = useState<DeviceNotice[]>([]);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    notice_enabled: 1,
    notice_default_mode: 'ticker',
    notice_item_duration_sec: 8,
    notice_max_items: 3,
  });
  const [noticeIndex, setNoticeIndex] = useState(0);

  const updateDeviceStatus = async (status: 'online' | 'offline') => {
    if (!realDeviceId) return;
    try {
      await fetch(`/api/devices/${realDeviceId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          lastConnected: new Date().toISOString(),
        }),
        keepalive: true,
      });
    } catch (error) {
      console.error('[Device Status] 상태 업데이트 실패:', error);
    }
  };

  // PIN 검증 상태 확인
  useEffect(() => {
    const verified = sessionStorage.getItem(`device_pin_verified_${deviceId}`);
    if (verified === 'true') {
      setIsPinVerified(true);
    }
    setCheckingPin(false);
  }, [deviceId]);

  const handlePinSuccess = (deviceName: string) => {
    setIsPinVerified(true);
  };

  // 디바이스 온라인/오프라인 상태 갱신
  useEffect(() => {
    if (!realDeviceId || !isPinVerified) return;

    updateDeviceStatus('online');

    const heartbeat = setInterval(() => {
      updateDeviceStatus('online');
    }, 30000);

    const sendOfflineStatus = () => {
      const payload = JSON.stringify({
        status: 'offline',
        lastConnected: new Date().toISOString(),
      });
      const url = `/api/devices/${realDeviceId}/status`;

      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      } else {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', sendOfflineStatus);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', sendOfflineStatus);
      sendOfflineStatus();
    };
  }, [realDeviceId, isPinVerified]);

  // WebSocket 연결 및 알림 수신
  useEffect(() => {
    // realDeviceId가 설정될 때까지 대기
    if (!realDeviceId) return;

    let reconnectTimer: NodeJS.Timeout;
    let isCleanedUp = false;

    const connect = () => {
      if (isCleanedUp) return;

      const wsUrl = `ws://${window.location.hostname}:3031?deviceId=${realDeviceId}`;

      try {
        const ws = new window.WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
        };

        ws.onerror = () => {
          // 초기 연결 오류는 무시 (정상적인 과정)
        };

        ws.onmessage = (event: MessageEvent) => {
          let data;
          try {
            data = JSON.parse(event.data);
          } catch (e) {
            console.error('[WebSocket] JSON 파싱 오류:', e);
            return;
          }

          if (data.type === "alert" && data.alert) {
            setAlert(data.alert);
          } else if (data.type === "init" && data.alerts && Array.isArray(data.alerts)) {
            if (data.alerts.length > 0) setAlert(data.alerts[data.alerts.length - 1]);
          } else if (data.type === "contentUpdate") {
            // 콘텐츠 업데이트 알림 수신 시 페이지 새로고침
            window.location.reload();
          }
        };

        ws.onclose = () => {
          wsRef.current = null;

          // 5초 후 재연결 시도
          if (!isCleanedUp) {
            reconnectTimer = setTimeout(() => {
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
      isCleanedUp = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [realDeviceId]);

  // 알림 자동 닫기 타이머
  useEffect(() => {
    if (!alert) return;

    // duration이 있으면 해당 시간 후에 알림 닫기
    if (alert.duration) {
      const timer = setTimeout(() => {
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
        const timer = setTimeout(() => {
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
        const deviceResponse = await fetch(`/api/devices/${deviceId}`);
        if (!deviceResponse.ok) {
          console.error("디바이스 정보를 불러오는데 실패했습니다.");
          return;
        }
        const deviceData = await deviceResponse.json();
        setDeviceInfo({ name: deviceData.name, location: deviceData.location });
        setRealDeviceId(deviceData.id); // 실제 디바이스 ID 저장

        // 모든 콘텐츠 가져오기
        const contentsResponse = await fetch(`/api/devices/${deviceId}/contents`);
        if (!contentsResponse.ok) {
          console.error("콘텐츠 목록을 불러오는데 실패했습니다.");
          return;
        }
        const contentsData = await contentsResponse.json();

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
      setContents((prev) => {
        const same =
          prev.length === filtered.length &&
          prev.every((item, idx) => item.id === filtered[idx]?.id);
        return same ? prev : filtered;
      });

      // 현재 인덱스가 필터링된 콘텐츠 범위를 벗어나면 0으로 리셋
      setCurrentContentIndex((prevIndex) => (filtered.length > 0 && prevIndex >= filtered.length ? 0 : prevIndex));
    };

    // 초기 필터링
    updateFilteredContents();

    // 1분마다 필터링 업데이트
    const filterInterval = setInterval(updateFilteredContents, 60000);
    return () => clearInterval(filterInterval);
  }, [allContents]);

  useEffect(() => {
    if (!isPinVerified) return;

    const fetchNoticeOverlayData = async () => {
      try {
        const [noticeRes, settingsRes] = await Promise.all([
          fetch(`/api/devices/${deviceId}/notices?forDisplay=1`),
          fetch(`/api/devices/${deviceId}/display-settings`),
        ]);

        if (noticeRes.ok) {
          const noticeData = await noticeRes.json();
          setNotices(Array.isArray(noticeData) ? noticeData : []);
        }

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setDisplaySettings({
            notice_enabled: settingsData.notice_enabled ?? 1,
            notice_default_mode: settingsData.notice_default_mode ?? 'ticker',
            notice_item_duration_sec: settingsData.notice_item_duration_sec ?? 8,
            notice_max_items: settingsData.notice_max_items ?? 3,
          });
        }
      } catch (error) {
        console.error('공지 오버레이 데이터 조회 오류:', error);
      }
    };

    fetchNoticeOverlayData();
    const timer = setInterval(fetchNoticeOverlayData, 60000);
    return () => clearInterval(timer);
  }, [deviceId, isPinVerified]);

  useEffect(() => {
    if (!displaySettings.notice_enabled || notices.length <= 1) return;
    const intervalMs = Math.max(3, displaySettings.notice_item_duration_sec) * 1000;
    const timer = setInterval(() => {
      setNoticeIndex(prev => (prev + 1) % notices.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [displaySettings.notice_enabled, displaySettings.notice_item_duration_sec, notices.length]);

  // 콘텐츠 순환 표시
  useEffect(() => {
    if (contents.length === 0) return;
    const currentContent = contents[currentContentIndex];
    const durationMs = normalizeDurationMs(currentContent);

    // 동영상 duration이 0이면 재생 종료 이벤트로 다음 콘텐츠 이동
    if (currentContent.type === 'video' && durationMs === 0) {
      return;
    }

    const timer = setTimeout(() => {
      setCurrentContentIndex((prevIndex) => (prevIndex + 1) % contents.length);
    }, durationMs);
    return () => clearTimeout(timer);
  }, [currentContentIndex, contents]);

  // PIN 검증 상태 확인 중
  if (checkingPin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-white text-2xl">확인 중...</div>
      </div>
    );
  }

  // PIN 미검증 시 모달 표시
  if (!isPinVerified) {
    return <PinCodeModal deviceId={deviceId} onSuccess={handlePinSuccess} />;
  }

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
  const currentDurationMs = normalizeDurationMs(currentContent);
  const visibleNotices = notices.slice(0, Math.max(1, displaySettings.notice_max_items));
  const currentNotice = visibleNotices.length > 0 ? visibleNotices[noticeIndex % visibleNotices.length] : null;
  const shouldShowNoticeOverlay = !alert && displaySettings.notice_enabled === 1 && visibleNotices.length > 0;

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
              fontSize: currentContent.fontSize
                ? (isNaN(Number(currentContent.fontSize)) ? currentContent.fontSize : `${currentContent.fontSize}pt`)
                : '36pt',
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
            {currentContent.url?.startsWith('youtube:') ? (
              <div className="w-full h-full">
                <YoutubePlayer
                  videoId={currentContent.url.replace('youtube:', '')}
                  autoplay={currentContent.autoplay !== false}
                  loop={currentContent.loop !== false}
                  mute={currentContent.muted !== false}
                />
              </div>
            ) : (
              <video
                src={currentContent.url}
                className="max-w-full max-h-full"
                autoPlay={currentContent.autoplay !== false}
                loop={currentDurationMs === 0 ? false : currentContent.loop !== false}
                muted={currentContent.muted !== false}
                controls={!currentContent.autoplay}
                onEnded={
                  currentDurationMs === 0
                    ? () => setCurrentContentIndex((prevIndex) => (prevIndex + 1) % contents.length)
                    : undefined
                }
              />
            )}
          </div>
        )}
      </div>
      {shouldShowNoticeOverlay && (
        displaySettings.notice_default_mode === 'side_panel' ? (
          <div className="absolute top-4 right-4 z-30 w-[28rem] max-h-[40vh] bg-black/70 backdrop-blur-sm border border-cyan-400/60 rounded-xl p-4 text-white">
            <div className="text-sm text-cyan-300 mb-2">공지사항</div>
            <div className="text-lg font-semibold leading-snug">{currentNotice?.title}</div>
            <div className="mt-2 text-sm whitespace-pre-wrap break-words text-white/90">{currentNotice?.content}</div>
          </div>
        ) : displaySettings.notice_default_mode === 'popup_cycle' ? (
          <div className="absolute top-6 right-6 z-30 max-w-[30rem] bg-white/95 border border-cyan-400 shadow-2xl rounded-xl p-4">
            <div className="text-xs text-cyan-700 mb-1">공지</div>
            <div className="font-bold text-gray-900">{currentNotice?.title}</div>
            <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap break-words">{currentNotice?.content}</div>
          </div>
        ) : (
          <div className="absolute bottom-0 left-0 right-0 z-30 bg-black/80 border-t border-cyan-400/60 px-6 py-3 text-white">
            <div className="text-sm font-semibold">
              📢 {currentNotice?.title}: <span className="font-normal">{currentNotice?.content}</span>
            </div>
          </div>
        )
      )}
    </div>
  );
}
