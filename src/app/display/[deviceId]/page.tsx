"use client";

import { useEffect, useState, use, useRef, useCallback } from "react";
import type { devicecontent as DeviceContent } from "@/types/device";
import { LAYOUT_TEMPLATES, LayoutTemplateId } from "@/types/layout";
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

type ContentWithZone = DeviceContent & {
  zone_id?: string;
};

const normalizeDurationMs = (content: DeviceContent): number => {
  const raw = Number(content.duration) || 0;
  if (raw <= 0) return 5000; // 기본 5초

  // 라이브러리(content 테이블)는 초 단위, 기존 devicecontent는 ms 단위를 사용하므로 보정
  return raw < 1000 ? raw * 1000 : raw;
};

// 단일 콘텐츠 렌더링 컴포넌트
function ContentRenderer({
  content,
  onVideoEnded,
}: {
  content: DeviceContent;
  onVideoEnded?: () => void;
}) {
  const durationMs = normalizeDurationMs(content);

  if (content.type === 'text') {
    return (
      <div
        style={{
          color: content.fontColor || '#ffffff',
          backgroundColor: content.backgroundColor || '#000000',
          fontSize: content.fontSize
            ? (isNaN(Number(content.fontSize)) ? content.fontSize : `${content.fontSize}pt`)
            : '36pt',
          padding: '2rem',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        {content.text}
      </div>
    );
  }

  if (content.type === 'image') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <img
          src={content.url}
          alt={content.alt || '이미지'}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    );
  }

  // video 또는 youtube
  if (content.url?.startsWith('youtube:')) {
    const youtubeId = content.url.replace('youtube:', '');
    const metadata = content.metadata ? JSON.parse(content.metadata) : {};
    return (
      <div className="w-full h-full">
        <YoutubePlayer
          videoId={youtubeId}
          type={metadata.youtubeType || 'video'}
          autoplay={metadata.autoplay !== false}
          loop={metadata.loop !== false}
          mute={metadata.mute !== false}
        />
      </div>
    );
  }

  // 일반 비디오
  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <video
        src={content.url}
        className="max-w-full max-h-full"
        autoPlay={content.autoplay !== false}
        loop={durationMs === 0 ? false : content.loop !== false}
        muted={content.muted !== false}
        controls={!content.autoplay}
        onEnded={durationMs === 0 ? onVideoEnded : undefined}
      />
    </div>
  );
}

// 영역별 콘텐츠 순환 컴포넌트
function ZoneDisplay({ contents }: { contents: DeviceContent[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentContent = contents[currentIndex];

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % contents.length);
  }, [contents.length]);

  useEffect(() => {
    if (contents.length <= 1) return;

    const currentContent = contents[currentIndex];
    const durationMs = normalizeDurationMs(currentContent);

    // 비디오 duration이 0이면 onEnded로 처리
    if (currentContent.type === 'video' && durationMs === 0) {
      return;
    }

    timerRef.current = setTimeout(() => {
      goToNext();
    }, durationMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentIndex, contents, goToNext]);

  if (contents.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-500">
        콘텐츠 없음
      </div>
    );
  }

  return (
    <ContentRenderer
      content={currentContent}
      onVideoEnded={goToNext}
    />
  );
}

export default function DevicePreviewPage({ params }: { params: Promise<{ deviceId: string }> }) {
  const { deviceId } = use(params);
  const [alert, setAlert] = useState<Alert | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [allContents, setAllContents] = useState<ContentWithZone[]>([]);
  const [contents, setContents] = useState<ContentWithZone[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<{
    name: string;
    location: string;
    layout_template: LayoutTemplateId;
  } | null>(null);
  const [realDeviceId, setRealDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [checkingPin, setCheckingPin] = useState(true);
  const [hasPin, setHasPin] = useState(true);
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
    const checkPinStatus = async () => {
      const verified = sessionStorage.getItem(`device_pin_verified_${deviceId}`);
      if (verified === 'true') {
        setIsPinVerified(true);
        setCheckingPin(false);
        return;
      }

      try {
        const response = await fetch(`/api/devices/${deviceId}/verify-pin`);
        if (response.ok) {
          const data = await response.json();
          setHasPin(data.hasPin);

          if (!data.hasPin) {
            sessionStorage.setItem(`device_pin_verified_${deviceId}`, 'true');
            setIsPinVerified(true);
          }
        }
      } catch (error) {
        console.error('PIN 상태 확인 오류:', error);
      }

      setCheckingPin(false);
    };

    checkPinStatus();
  }, [deviceId]);

  const handlePinSuccess = () => {
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
    if (!realDeviceId) return;

    let reconnectTimer: NodeJS.Timeout;
    let isCleanedUp = false;

    const connect = () => {
      if (isCleanedUp) return;

      const wsUrl = `ws://${window.location.hostname}:3031?deviceId=${realDeviceId}`;

      try {
        const ws = new window.WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {};
        ws.onerror = () => {};

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
            window.location.reload();
          }
        };

        ws.onclose = () => {
          wsRef.current = null;
          if (!isCleanedUp) {
            reconnectTimer = setTimeout(() => {
              connect();
            }, 5000);
          }
        };
      } catch (error) {
        console.error('[WebSocket] 연결 생성 실패:', error);
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

    if (alert.duration) {
      const timer = setTimeout(() => {
        setAlert(null);
      }, alert.duration);
      return () => clearTimeout(timer);
    }

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
        setDeviceInfo({
          name: deviceData.name,
          location: deviceData.location,
          layout_template: deviceData.layout_template || 'fullscreen',
        });
        setRealDeviceId(deviceData.id);

        const contentsResponse = await fetch(`/api/devices/${deviceId}/contents`);
        if (!contentsResponse.ok) {
          console.error("콘텐츠 목록을 불러오는데 실패했습니다.");
          return;
        }
        const contentsData = await contentsResponse.json();

        const sortedContents = contentsData.sort((a: ContentWithZone, b: ContentWithZone) => {
          const zoneA = a.zone_id || 'area-0';
          const zoneB = b.zone_id || 'area-0';
          if (zoneA !== zoneB) return zoneA.localeCompare(zoneB);
          return (a.order || 0) - (b.order || 0);
        });
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
    };

    updateFilteredContents();

    const filterInterval = setInterval(updateFilteredContents, 60000);
    return () => clearInterval(filterInterval);
  }, [allContents]);

  // 공지 데이터 가져오기
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

  // 공지 순환
  useEffect(() => {
    if (!displaySettings.notice_enabled || notices.length <= 1) return;
    const intervalMs = Math.max(3, displaySettings.notice_item_duration_sec) * 1000;
    const timer = setInterval(() => {
      setNoticeIndex(prev => (prev + 1) % notices.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [displaySettings.notice_enabled, displaySettings.notice_item_duration_sec, notices.length]);

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

  // 알림 모달
  const alertModal = alert ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-2xl px-10 py-8 max-w-lg w-full flex flex-col items-center animate-pulse border-4 border-red-600">
        <div className="text-3xl font-bold text-red-700 mb-4">긴급 알림</div>
        <div className="text-xl text-gray-900 text-center mb-6 whitespace-pre-line break-words">{alert.message}</div>
      </div>
    </div>
  ) : null;

  // 레이아웃 템플릿 가져오기
  const layoutTemplate = deviceInfo?.layout_template || 'fullscreen';
  const template = LAYOUT_TEMPLATES[layoutTemplate] || LAYOUT_TEMPLATES.fullscreen;

  // 영역별로 콘텐츠 그룹화
  const contentsByZone: Record<string, ContentWithZone[]> = {};
  template.areas.forEach(area => {
    contentsByZone[area.id] = [];
  });
  contents.forEach(content => {
    const zoneId = content.zone_id || 'area-0';
    if (contentsByZone[zoneId]) {
      contentsByZone[zoneId].push(content);
    } else {
      // 해당 영역이 없으면 area-0에 추가
      contentsByZone['area-0']?.push(content);
    }
  });

  // 전체 콘텐츠가 없는 경우
  const hasAnyContent = Object.values(contentsByZone).some(arr => arr.length > 0);
  if (!hasAnyContent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        {alertModal}
        <div className="text-white text-2xl">
          {deviceInfo ? `${deviceInfo.name} (${deviceInfo.location})에 등록된 콘텐츠가 없습니다.` : '등록된 콘텐츠가 없습니다.'}
        </div>
      </div>
    );
  }

  const visibleNotices = notices.slice(0, Math.max(1, displaySettings.notice_max_items));
  const currentNotice = visibleNotices.length > 0 ? visibleNotices[noticeIndex % visibleNotices.length] : null;
  const shouldShowNoticeOverlay = !alert && displaySettings.notice_enabled === 1 && visibleNotices.length > 0;

  return (
    <div className="min-h-screen bg-black relative">
      {alertModal}

      {/* 레이아웃 그리드 */}
      <div
        className="w-full h-screen"
        style={{
          display: 'grid',
          gridTemplateColumns: template.gridTemplate.columns,
          gridTemplateRows: template.gridTemplate.rows,
          gap: '2px',
        }}
      >
        {template.areas.map(area => (
          <div
            key={area.id}
            style={{
              gridRow: area.style.gridRow,
              gridColumn: area.style.gridColumn,
              overflow: 'hidden',
            }}
          >
            <ZoneDisplay contents={contentsByZone[area.id] || []} />
          </div>
        ))}
      </div>

      {/* 공지 오버레이 */}
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
