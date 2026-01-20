'use client';

import { useState, useEffect, useRef } from 'react';
import YoutubePlayer from './YoutubePlayer';

interface MixedElement {
  type: 'text' | 'image' | 'video' | 'youtube' | 'split_layout';
  order: number;
  duration: number;
  text?: string;
  fontSize?: string;
  fontColor?: string;
  backgroundColor?: string;
  url?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  leftContents?: MixedElement[];
  metadata?: { showNotices?: boolean };
}

interface MixedContentDisplayProps {
  elements: MixedElement[];
}

export default function MixedContentDisplay({ elements }: MixedContentDisplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sortedElements, setSortedElements] = useState<MixedElement[]>([]);
  const [isReady, setIsReady] = useState(false);
  const preloadedImages = useRef<{ [key: string]: HTMLImageElement }>({});
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // elements가 배열인지 확인
    if (!elements || !Array.isArray(elements)) {
      console.error('MixedContentDisplay: elements is not an array', elements);
      setSortedElements([]);
      return;
    }

    console.log('[MixedContent] 받은 elements:', elements);
    console.log('[MixedContent] elements 타입 확인:', elements.map(e => ({ type: e.type, hasLeftContents: !!e.leftContents, leftContentsCount: e.leftContents?.length })));

    // order 기준으로 정렬
    const sorted = [...elements].sort((a, b) => a.order - b.order);
    setSortedElements(sorted);
    setCurrentIndex(0); // 요소가 변경되면 인덱스 초기화
    setIsReady(false); // 새 elements면 다시 로딩
  }, [elements]);

  // 이미지와 비디오 미리 로드 (확실한 로딩 보장)
  useEffect(() => {
    if (sortedElements.length === 0) return;

    let mounted = true;

    const loadMedia = async () => {
      console.log('[MixedContent] 미디어 로딩 시작:', sortedElements.length, '개');

      try {
        // 모든 이미지를 순차적으로 로드
        for (const element of sortedElements) {
          if (!mounted || !isMountedRef.current) break;

          if (element.type === 'image' && element.url) {
            // 이미 로드된 이미지가 있으면 재사용
            if (preloadedImages.current[element.url]) {
              console.log('[MixedContent] 캐시된 이미지 사용:', element.url);
              continue;
            }

            // 새 이미지 로드
            await new Promise<void>((resolve) => {
              const img = new Image();

              img.onload = () => {
                if (mounted && isMountedRef.current && element.url) {
                  preloadedImages.current[element.url] = img;
                  console.log('[MixedContent] 이미지 로드 완료:', element.url);
                }
                resolve();
              };

              img.onerror = (error) => {
                console.error('[MixedContent] 이미지 로드 실패:', element.url, error);
                resolve(); // 에러가 나도 계속 진행
              };

              // 타임아웃 설정 (10초)
              setTimeout(() => {
                console.warn('[MixedContent] 이미지 로드 타임아웃:', element.url);
                resolve();
              }, 10000);

              if (element.url) {
                img.src = element.url;
              } else {
                resolve();
              }
            });
          }
        }

        if (mounted && isMountedRef.current) {
          console.log('[MixedContent] 모든 미디어 로드 완료');
          setIsReady(true);
        }
      } catch (error) {
        console.error('[MixedContent] 미디어 로딩 오류:', error);
        if (mounted && isMountedRef.current) {
          setIsReady(true); // 에러가 나도 일단 표시
        }
      }
    };

    loadMedia();

    return () => {
      mounted = false;
    };
  }, [sortedElements]);

  useEffect(() => {
    if (sortedElements.length === 0) return;

    const currentElement = sortedElements[currentIndex];

    // 동영상 길이만큼 재생하는 경우 (duration === 0)
    if (currentElement.type === 'video' && currentElement.duration === 0) {
      // 동영상 재생 완료 이벤트를 감지해야 하므로 타이머 사용 안 함
      return;
    }

    // 타이머 설정
    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % sortedElements.length);
    }, currentElement.duration);

    return () => clearTimeout(timer);
  }, [currentIndex, sortedElements]);

  if (sortedElements.length === 0) {
    return <div className="w-full h-full flex items-center justify-center bg-black">
      <p className="text-white text-xl">콘텐츠가 없습니다.</p>
    </div>;
  }

  // 미디어 로딩 중
  if (!isReady) {
    return <div className="w-full h-full flex items-center justify-center bg-black">
      <p className="text-white text-xl">로딩 중...</p>
    </div>;
  }

  const currentElement = sortedElements[currentIndex];

  const handleVideoEnd = () => {
    // 동영상 재생 완료 시 다음 콘텐츠로 이동
    setCurrentIndex((prev) => (prev + 1) % sortedElements.length);
  };

  // 안전 체크: currentElement가 유효한지 확인
  if (!currentElement) {
    console.error('유효하지 않은 currentElement:', currentIndex, sortedElements);
    return <div className="w-full h-full flex items-center justify-center bg-black">
      <p className="text-white text-xl">콘텐츠 오류</p>
    </div>;
  }

  // 렌더링
  try {
    return renderElement(currentElement, currentIndex, handleVideoEnd);
  } catch (error) {
    console.error('콘텐츠 렌더링 오류:', error);
    // 에러 발생 시 다음 콘텐츠로 자동 이동
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % sortedElements.length);
    }, 100);
    return <div className="w-full h-full flex items-center justify-center bg-black" />;
  }
}

function renderElement(
  currentElement: MixedElement,
  currentIndex: number,
  handleVideoEnd: () => void
) {
  switch (currentElement.type) {
    case 'text':
      // fontSize가 숫자면 px 추가, 아니면 그대로 사용 (하위 호환성)
      const fontSize = currentElement.fontSize
        ? (isNaN(Number(currentElement.fontSize)) ? currentElement.fontSize : `${currentElement.fontSize}px`)
        : '32px';
      return (
        <div
          key={`text-${currentIndex}`}
          className="w-full h-full flex items-center justify-center"
          style={{
            backgroundColor: currentElement.backgroundColor || '#FFFFFF',
            willChange: 'contents'
          }}
        >
          <div
            className="text-center px-8"
            style={{
              color: currentElement.fontColor || '#000000',
              fontSize: fontSize,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {currentElement.text}
          </div>
        </div>
      );

    case 'image':
      return (
        <div className="w-full h-full relative bg-black flex items-center justify-center">
          <img
            key={currentElement.url} // URL을 key로 사용해서 React가 재사용하지 않도록
            src={currentElement.url}
            alt="Mixed content image"
            className="w-full h-full object-contain"
            style={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: '100%'
            }}
            loading="eager"
          />
        </div>
      );

    case 'video':
      return (
        <div className="w-full h-full relative">
          <video
            key={currentIndex} // 리렌더링을 위한 key
            src={currentElement.url}
            autoPlay
            muted={currentElement.muted !== false}
            className="w-full h-full object-contain"
            onEnded={currentElement.duration === 0 ? handleVideoEnd : undefined}
          />
        </div>
      );

    case 'youtube':
      if (!currentElement.url) return null;

      // YouTube URL에서 비디오 ID 추출
      let videoId = '';
      try {
        if (currentElement.url.includes('youtube.com/watch?v=')) {
          videoId = new URL(currentElement.url).searchParams.get('v') || '';
        } else if (currentElement.url.includes('youtu.be/')) {
          videoId = currentElement.url.split('youtu.be/')[1]?.split('?')[0] || '';
        } else if (currentElement.url.includes('youtube.com/embed/')) {
          videoId = currentElement.url.split('youtube.com/embed/')[1]?.split('?')[0] || '';
        }
      } catch (error) {
        console.error('YouTube URL 파싱 오류:', error);
      }

      if (!videoId) {
        return <div className="w-full h-full flex items-center justify-center">
          <p className="text-red-500">유효하지 않은 YouTube URL</p>
        </div>;
      }

      return (
        <div className="w-full h-full relative">
          <YoutubePlayer
            key={currentIndex}
            videoId={videoId}
            type="video"
            autoplay={currentElement.autoplay !== false}
            loop={currentElement.loop || false}
            mute={currentElement.muted !== false}
          />
        </div>
      );

    case 'split_layout':
      return <SplitLayoutContent leftContents={currentElement.leftContents || []} showNotices={currentElement.metadata?.showNotices ?? true} />;

    default:
      return null;
  }
}

// 분할 레이아웃 내부 컴포넌트
function SplitLayoutContent({ leftContents, showNotices = true }: { leftContents: MixedElement[]; showNotices?: boolean }) {
  const [leftIndex, setLeftIndex] = useState(0);

  useEffect(() => {
    if (leftContents.length === 0) return;

    const current = leftContents[leftIndex];
    const timer = setTimeout(() => {
      setLeftIndex((prev) => (prev + 1) % leftContents.length);
    }, current.duration);

    return () => clearTimeout(timer);
  }, [leftIndex, leftContents]);

  if (leftContents.length === 0) {
    return (
      <div className="w-full h-full flex">
        <div className="w-2/3 h-full bg-black flex items-center justify-center">
          <p className="text-white text-xl">왼쪽 콘텐츠가 없습니다.</p>
        </div>
        <div className="w-1/3 h-full bg-gray-100 p-4 flex flex-col" style={{ gap: '1rem' }}>
          {/* 날짜/시간 영역 */}
          <div className="bg-white p-4 rounded-lg shadow" style={{ height: showNotices ? '15%' : '20%', minHeight: '80px' }}>
            <DateTimeWidget />
          </div>
          {/* 공지사항 영역 (조건부) */}
          {showNotices && (
            <div style={{ height: '35%', minHeight: '200px' }}>
              <NoticeListPanel />
            </div>
          )}
          {/* 환자 명단 영역 */}
          <div style={{ flex: 1, minHeight: '250px' }}>
            <PatientListPanel />
          </div>
        </div>
      </div>
    );
  }

  const currentLeft = leftContents[leftIndex];

  return (
    <div className="w-full h-full flex">
      {/* 왼쪽: 순환 콘텐츠 */}
      <div className="w-2/3 h-full">
        {renderLeftContent(currentLeft)}
      </div>

      {/* 오른쪽: 날짜/시간 + (공지사항) + 환자 명단 */}
      <div className="w-1/3 h-full bg-gray-100 p-4 flex flex-col" style={{ gap: '1rem' }}>
        {/* 날짜/시간 영역 */}
        <div className="bg-white p-4 rounded-lg shadow" style={{ height: showNotices ? '15%' : '20%', minHeight: '80px' }}>
          <DateTimeWidget />
        </div>
        {/* 공지사항 영역 (조건부) */}
        {showNotices && (
          <div style={{ height: '35%', minHeight: '200px' }}>
            <NoticeListPanel />
          </div>
        )}
        {/* 환자 명단 영역 */}
        <div style={{ flex: 1, minHeight: '250px' }}>
          <PatientListPanel />
        </div>
      </div>
    </div>
  );
}

function renderLeftContent(content: MixedElement) {
  switch (content.type) {
    case 'text':
      // fontSize가 숫자면 px 추가, 아니면 그대로 사용 (하위 호환성)
      const fontSize = content.fontSize
        ? (isNaN(Number(content.fontSize)) ? content.fontSize : `${content.fontSize}px`)
        : '32px';
      return (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            backgroundColor: content.backgroundColor || '#FFFFFF',
          }}
        >
          <div
            className="text-center px-8"
            style={{
              color: content.fontColor || '#000000',
              fontSize: fontSize,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {content.text}
          </div>
        </div>
      );

    case 'image':
      return (
        <div className="w-full h-full relative bg-black flex items-center justify-center">
          <img
            src={content.url}
            alt="Split layout image"
            className="w-full h-full object-contain"
            loading="eager"
          />
        </div>
      );

    case 'video':
      return (
        <div className="w-full h-full relative">
          <video
            src={content.url}
            autoPlay
            muted={content.muted !== false}
            loop
            className="w-full h-full object-contain"
          />
        </div>
      );

    case 'youtube':
      if (!content.url) return null;

      let videoId = '';
      try {
        if (content.url.includes('youtube.com/watch?v=')) {
          videoId = new URL(content.url).searchParams.get('v') || '';
        } else if (content.url.includes('youtu.be/')) {
          videoId = content.url.split('youtu.be/')[1]?.split('?')[0] || '';
        }
      } catch (error) {
        console.error('YouTube URL 파싱 오류:', error);
      }

      if (!videoId) return null;

      return (
        <div className="w-full h-full relative">
          <YoutubePlayer
            videoId={videoId}
            type="video"
            autoplay={content.autoplay !== false}
            loop={content.loop || false}
            mute={content.muted !== false}
          />
        </div>
      );

    default:
      return null;
  }
}

// 날짜/시간 위젯 컴포넌트
function DateTimeWidget() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-full flex flex-col justify-center">
      <div className="text-2xl font-bold text-gray-800">
        {currentTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="text-sm text-gray-600">
        {currentTime.toLocaleDateString('ko-KR')}
      </div>
    </div>
  );
}

// 공지사항 패널 컴포넌트 (자동 순환)
function NoticeListPanel() {
  const [notices, setNotices] = useState<any[]>([]);
  const [currentNoticeIndex, setCurrentNoticeIndex] = useState(0);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const response = await fetch('/api/notices');
        if (response.ok) {
          const data = await response.json();
          setNotices(data);
        }
      } catch (error) {
        console.error('공지사항 목록 가져오기 오류:', error);
      }
    };

    fetchNotices();

    // 1분마다 공지사항 목록 갱신
    const refreshInterval = setInterval(fetchNotices, 60000);

    return () => clearInterval(refreshInterval);
  }, []);

  // 공지사항 자동 순환 (5초마다)
  useEffect(() => {
    if (notices.length === 0) return;

    const timer = setInterval(() => {
      setCurrentNoticeIndex((prev) => (prev + 1) % notices.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [notices.length]);

  return (
    <div className="h-full bg-white rounded-lg shadow p-4 overflow-hidden flex flex-col">
      <h3 className="text-lg font-bold text-teal-800 mb-2 flex items-center">
        <span className="mr-2">📢</span>
        공지사항
      </h3>
      {notices.length === 0 ? (
        <p className="text-gray-500 text-center py-4 flex-1 flex items-center justify-center">
          등록된 공지사항이 없습니다.
        </p>
      ) : (
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col justify-center">
            <div className="mb-2">
              <span className="px-2 py-1 text-xs font-medium bg-teal-100 text-teal-800 rounded">
                {notices[currentNoticeIndex]?.category || '기타'}
              </span>
            </div>
            <h4 className="text-lg font-semibold text-gray-800 mb-2">
              {notices[currentNoticeIndex]?.title}
            </h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap break-words overflow-y-auto">
              {notices[currentNoticeIndex]?.content}
            </p>
            {notices.length > 1 && (
              <div className="mt-3 flex justify-center space-x-1">
                {notices.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      index === currentNoticeIndex ? 'bg-teal-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 간단한 환자 명단 패널 컴포넌트
function PatientListPanel() {
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch('/api/patients');
        if (response.ok) {
          const data = await response.json();
          setPatients(data);
        }
      } catch (error) {
        console.error('환자 목록 가져오기 오류:', error);
      }
    };

    fetchPatients();

    // WebSocket이나 이벤트를 통한 실시간 업데이트 감지
    const handleUpdate = () => {
      fetchPatients();
    };

    window.addEventListener('patientListUpdate', handleUpdate);

    return () => {
      window.removeEventListener('patientListUpdate', handleUpdate);
    };
  }, []);

  return (
    <div className="h-full bg-white rounded-lg shadow p-4 overflow-y-auto flex flex-col">
      <h3 className="text-lg font-bold text-gray-800 mb-3">대기 환자</h3>
      {patients.length === 0 ? (
        <p className="text-gray-500 text-center py-4">대기 중인 환자가 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {patients.map((patient) => (
            <div key={patient.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center space-x-3">
                <span className="bg-green-600 text-white font-bold px-2 py-1 rounded text-sm">
                  {patient.number}
                </span>
                <span className="font-medium">{patient.name}</span>
              </div>
              <span className="text-sm text-green-600">{patient.department}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
