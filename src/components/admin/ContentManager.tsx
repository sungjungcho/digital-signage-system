'use client';

import { useState, useRef, useEffect } from 'react';
import type { device as Device, devicecontent as DeviceContent } from '@/types/device';
import ScheduleSettings, { type ScheduleData } from './ScheduleSettings';
import { formatScheduleInfo } from '@/lib/scheduleUtils';

interface ContentManagerProps {
  device: Device;
}

export default function ContentManager({ device }: ContentManagerProps) {
  const [contents, setContents] = useState<DeviceContent[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contentType, setContentType] = useState<'image' | 'video' | 'text' | 'split_layout'>('text');
  const [videoSource, setVideoSource] = useState<'file' | 'youtube'>('file');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeOptions, setYoutubeOptions] = useState({
    autoplay: true,
    loop: true,
    mute: false,
  });
  const [textContent, setTextContent] = useState({
    text: '',
    duration: 5000,
    fontSize: '24',
    fontColor: '#000000',
    backgroundColor: '#FFFFFF',
  });
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // 복합형 콘텐츠 state (순차 재생)
  interface MixedElement {
    id: string;
    type: 'text' | 'image' | 'video' | 'youtube' | 'split_layout';
    order: number;
    duration: number;
    text?: string;
    fontSize?: string;
    fontColor?: string;
    backgroundColor?: string;
    url?: string;
    file?: File;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    leftContents?: MixedElement[]; // split_layout의 왼쪽 콘텐츠 배열
  }
  const [mixedElements, setMixedElements] = useState<MixedElement[]>([]);
  const [currentMixedElement, setCurrentMixedElement] = useState<Partial<MixedElement>>({
    type: 'text',
    duration: 5000,
    fontSize: '24',
    fontColor: '#000000',
    backgroundColor: '#FFFFFF',
  });

  // 복합형 콘텐츠 수정 관련 state
  const [editingMixedContentId, setEditingMixedContentId] = useState<string | null>(null);
  const [editingMixedElements, setEditingMixedElements] = useState<MixedElement[]>([]);
  const [showMixedEditModal, setShowMixedEditModal] = useState(false);
  const [editingElementIndex, setEditingElementIndex] = useState<number | null>(null);
  const [editingElementData, setEditingElementData] = useState<Partial<MixedElement>>({});

  // split_layout 왼쪽 콘텐츠 관리 state
  const [splitLayoutLeftContents, setSplitLayoutLeftContents] = useState<MixedElement[]>([]);
  const [currentLeftContent, setCurrentLeftContent] = useState<Partial<MixedElement>>({
    type: 'text',
    duration: 5000,
    fontSize: '24',
    fontColor: '#000000',
    backgroundColor: '#FFFFFF',
  });
  const [splitLayoutOptions, setSplitLayoutOptions] = useState({ showNotices: true });
  const [editingSplitLayoutId, setEditingSplitLayoutId] = useState<string | null>(null);
  const [editingLeftContentId, setEditingLeftContentId] = useState<string | null>(null);

  // 스케줄 설정 state
  const [scheduleData, setScheduleData] = useState<ScheduleData>({
    scheduleType: 'always',
  });

  // 이미지/동영상 수정 모달 state
  const [showMediaEditModal, setShowMediaEditModal] = useState(false);
  const [editingMediaContent, setEditingMediaContent] = useState<DeviceContent | null>(null);
  const [editingMediaFile, setEditingMediaFile] = useState<File | null>(null);
  const [editingMediaDuration, setEditingMediaDuration] = useState(5000);

  // 라이브러리 콘텐츠 스케줄 수정 모달 state
  const [showScheduleEditModal, setShowScheduleEditModal] = useState(false);
  const [editingScheduleContent, setEditingScheduleContent] = useState<DeviceContent | null>(null);
  const [editingScheduleData, setEditingScheduleData] = useState<ScheduleData>({
    scheduleType: 'always',
  });

  // 시간 변환 헬퍼 함수
  const msToTime = (ms: number): { hours: number; minutes: number; seconds: number } => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { hours, minutes, seconds };
  };

  const timeToMs = (hours: number, minutes: number, seconds: number): number => {
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  };

  const formatDuration = (ms: number): string => {
    const { hours, minutes, seconds } = msToTime(ms);
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}시간`);
    if (minutes > 0) parts.push(`${minutes}분`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}초`);
    return parts.join(' ');
  };

  // 유튜브 썸네일 URL 생성 함수
  const getYoutubeThumbnail = (url: string): string => {
    try {
      // youtube:로 시작하는 경우 (저장된 형식)
      const videoUrl = url.replace('youtube:', '');

      // 비디오 ID 추출
      let videoId = '';
      if (videoUrl.includes('youtube.com/watch?v=')) {
        videoId = new URL(videoUrl).searchParams.get('v') || '';
      } else if (videoUrl.includes('youtu.be/')) {
        videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0] || '';
      } else if (videoUrl.includes('youtube.com/embed/')) {
        videoId = videoUrl.split('youtube.com/embed/')[1]?.split('?')[0] || '';
      }

      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      }
    } catch (error) {
      console.error('유튜브 썸네일 URL 생성 실패:', error);
    }
    return '/placeholder-video.png'; // 기본 이미지
  };

  // 디바이스가 선택되면 해당 디바이스의 콘텐츠 목록을 가져옴
  useEffect(() => {
    if (device) {
      fetchContents().then((fetchedContents) => {
        if (fetchedContents && fetchedContents.length > 0) {
          setContentType(fetchedContents[0].type);
        } else {
          setContentType('text');
        }
        setEditingTextId(null);
        setTextContent({
          text: '',
          duration: 5000,
          fontSize: '24',
          fontColor: '#000000',
          backgroundColor: '#FFFFFF',
        });
        setEditingSplitLayoutId(null);
        setSplitLayoutLeftContents([]);
        setSplitLayoutOptions({ showNotices: true });
      });
    }
  }, [device]);

  // contentType이 split_layout으로 변경될 때 기존 split_layout 콘텐츠 자동 로드
  useEffect(() => {
    if (contentType === 'split_layout' && contents.length > 0) {
      // 기존 split_layout 콘텐츠 찾기
      const existingSplitLayout = contents.find(c => c.type === 'split_layout');

      if (existingSplitLayout && !editingSplitLayoutId) {
        // 기존 split_layout이 있으면 자동으로 수정 모드로 전환
        handleEditContent(existingSplitLayout);
      } else if (!existingSplitLayout) {
        // 기존 split_layout이 없으면 새로 추가 모드
        setEditingSplitLayoutId(null);
        setSplitLayoutLeftContents([]);
        setSplitLayoutOptions({ showNotices: true });
      }
    }
  }, [contentType, contents]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setSelectedFile(files[0]);
  };
    // 콘텐츠 삭제 함수
    const handleDeleteContent = async (contentId: string) => {
      try {
        const response = await fetch(`/api/devices/${device.id}/contents/${contentId}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          fetchContents(); // 삭제 후 목록 새로고침
        } else {
          alert('콘텐츠 삭제에 실패했습니다.');
        }
      } catch (error) {
        console.error('콘텐츠 삭제 중 오류 발생:', error);
        alert('오류가 발생했습니다.');
      }
    };

  // 라이브러리 콘텐츠 연결 해제 함수
  const handleUnlinkContent = async (contentId: string) => {
    try {
      const response = await fetch(`/api/devices/${device.id}/contents/link/${contentId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchContents();
        alert('콘텐츠 연결이 해제되었습니다.');
      } else {
        const error = await response.json();
        alert('연결 해제 실패: ' + (error.error || '알 수 없는 오류'));
      }
    } catch (error) {
      console.error('연결 해제 중 오류 발생:', error);
      alert('오류가 발생했습니다.');
    }
  };

  // 라이브러리 콘텐츠 스케줄 수정 모달 열기
  const handleEditSchedule = (content: DeviceContent) => {
    setEditingScheduleContent(content);
    setEditingScheduleData({
      scheduleType: content.scheduleType || 'always',
      specificDate: content.specificDate,
      daysOfWeek: content.daysOfWeek,
      startDate: content.startDate,
      endDate: content.endDate,
      startTime: content.startTime,
      endTime: content.endTime,
    });
    setShowScheduleEditModal(true);
  };

  // 라이브러리 콘텐츠 스케줄 저장
  const handleSaveSchedule = async () => {
    if (!editingScheduleContent) return;

    try {
      const response = await fetch(`/api/devices/${device.id}/contents/link/${editingScheduleContent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingScheduleData),
      });

      if (response.ok) {
        setShowScheduleEditModal(false);
        setEditingScheduleContent(null);
        fetchContents();
        alert('스케줄이 저장되었습니다.');
      } else {
        const error = await response.json();
        alert('스케줄 저장 실패: ' + (error.error || '알 수 없는 오류'));
      }
    } catch (error) {
      console.error('스케줄 저장 중 오류:', error);
      alert('오류가 발생했습니다.');
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    try {
      const formData = new FormData();
      formData.append('deviceId', device.id);
      formData.append('file', selectedFile);
      formData.append('type', contentType);

      // 스케줄 데이터 추가
      formData.append('scheduleType', scheduleData.scheduleType);
      if (scheduleData.specificDate) formData.append('specificDate', scheduleData.specificDate);
      if (scheduleData.daysOfWeek) formData.append('daysOfWeek', scheduleData.daysOfWeek);
      if (scheduleData.startDate) formData.append('startDate', scheduleData.startDate);
      if (scheduleData.endDate) formData.append('endDate', scheduleData.endDate);
      if (scheduleData.startTime) formData.append('startTime', scheduleData.startTime);
      if (scheduleData.endTime) formData.append('endTime', scheduleData.endTime);

      const response = await fetch('/api/contents/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setScheduleData({ scheduleType: 'always' });
        fetchContents();
      }
    } catch (error) {
      console.error('파일 업로드 중 오류 발생:', error);
    }
  };

  const handleYoutubeSubmit = async () => {
    if (!youtubeUrl.trim()) return;

    try {
      const response = await fetch('/api/contents/youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: device.id,
          url: youtubeUrl,
          autoplay: youtubeOptions.autoplay,
          loop: youtubeOptions.loop,
          mute: youtubeOptions.mute,
          ...scheduleData,
        }),
      });

      if (response.ok) {
        setYoutubeUrl('');
        setScheduleData({ scheduleType: 'always' });
        fetchContents();
      } else {
        const error = await response.json();
        alert(error.error || '유튜브 영상 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('유튜브 영상 추가 중 오류 발생:', error);
      alert('유튜브 영상 추가 중 오류가 발생했습니다.');
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let response;
      if (editingTextId) {
        // 수정
        response = await fetch(`/api/devices/${device.id}/contents/${editingTextId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...textContent,
            ...scheduleData,
          }),
        });
      } else {
        // 신규 등록
        response = await fetch('/api/contents/text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deviceId: device.id,
            ...textContent,
            ...scheduleData,
          }),
        });
      }
      if (response.ok) {
        setTextContent({
          text: '',
          duration: 5000,
          fontSize: '24',
          fontColor: '#000000',
          backgroundColor: '#FFFFFF',
        });
        setScheduleData({ scheduleType: 'always' });
        setEditingTextId(null);
        fetchContents();
      }
    } catch (error) {
      console.error('텍스트 콘텐츠 등록/수정 중 오류 발생:', error);
    }
  };

  const handleEditContent = (content: DeviceContent) => {
    // 스케줄 데이터 로드
    setScheduleData({
      scheduleType: content.scheduleType || 'always',
      specificDate: content.specificDate,
      daysOfWeek: content.daysOfWeek,
      startDate: content.startDate,
      endDate: content.endDate,
      startTime: content.startTime,
      endTime: content.endTime,
    });

    if (content.type === 'text') {
      setContentType('text');
      setTextContent({
        text: content.text ?? '',
        duration: content.duration ?? 5000,
        fontSize: content.fontSize ?? '32',
        fontColor: content.fontColor ?? '#000000',
        backgroundColor: content.backgroundColor ?? '#FFFFFF',
      });
      setEditingTextId(content.id);
    } else if (content.type === 'split_layout') {
      // 분할 레이아웃 수정 모드로 전환
      setContentType('split_layout');
      setEditingSplitLayoutId(content.id);
      try {
        // text 필드에서 leftContents 파싱
        const leftContents = content.text ? JSON.parse(content.text) : [];
        setSplitLayoutLeftContents(leftContents);

        // metadata에서 showNotices 파싱
        const metadata = content.metadata ? JSON.parse(content.metadata) : { showNotices: true };
        setSplitLayoutOptions({ showNotices: metadata.showNotices ?? true });

        } catch (error) {
        console.error('분할 레이아웃 데이터 파싱 오류:', error);
        alert('분할 레이아웃 데이터를 불러오는 중 오류가 발생했습니다.');
      }
    } else if (content.type === 'image' || content.type === 'video') {
      // 이미지/동영상 수정 모달 열기
      setEditingMediaContent(content);
      setEditingMediaDuration(content.duration ?? 5000);
      setEditingMediaFile(null);
      setShowMediaEditModal(true);
    }
  };

  // 이미지/동영상 수정 저장
  const handleSaveMediaEdit = async () => {
    if (!editingMediaContent) return;

    try {
      let newUrl = editingMediaContent.url;

      // 새 파일이 선택된 경우 업로드
      if (editingMediaFile) {
        const formData = new FormData();
        formData.append('file', editingMediaFile);
        formData.append('deviceId', device.id);
        formData.append('skipDbInsert', 'true'); // DB 저장 생략, URL만 반환

        const uploadResponse = await fetch('/api/contents/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('파일 업로드 실패');
        }

        const uploadData = await uploadResponse.json();
        newUrl = uploadData.url;
      }

      // 콘텐츠 업데이트
      const response = await fetch(`/api/devices/${device.id}/contents/${editingMediaContent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newUrl,
          duration: editingMediaDuration,
        }),
      });

      if (response.ok) {
        alert(`${editingMediaContent.type === 'image' ? '이미지' : '동영상'}가 수정되었습니다.`);
        setShowMediaEditModal(false);
        setEditingMediaContent(null);
        setEditingMediaFile(null);
        fetchContents();
      } else {
        const errorData = await response.json();
        alert('수정 실패: ' + (errorData.error || '알 수 없는 오류'));
      }
    } catch (error) {
      console.error('미디어 콘텐츠 수정 중 오류:', error);
      alert('오류가 발생했습니다.');
    }
  };

  // 복합형 콘텐츠 요소 수정 시작
  const handleEditMixedElement = (index: number) => {
    const element = editingMixedElements[index];
    setEditingElementIndex(index);
    setEditingElementData({
      ...element,
      file: undefined // file은 새로 선택해야 함
    });
  };

  // 복합형 콘텐츠 요소 수정 저장
  const handleSaveMixedElement = () => {
    if (editingElementIndex === null) return;

    const updatedElements = [...editingMixedElements];
    updatedElements[editingElementIndex] = {
      ...updatedElements[editingElementIndex],
      ...editingElementData,
      // file은 제외하고 저장
      file: undefined
    } as MixedElement;

    setEditingMixedElements(updatedElements);
    setEditingElementIndex(null);
    setEditingElementData({});
  };

  // 복합형 콘텐츠 요소 삭제
  const handleDeleteMixedElement = (index: number) => {
    if (!confirm('이 요소를 삭제하시겠습니까?')) return;

    const updatedElements = editingMixedElements.filter((_, i) => i !== index);
    // order 재정렬
    const reorderedElements = updatedElements.map((el, i) => ({
      ...el,
      order: i
    }));
    setEditingMixedElements(reorderedElements);
  };

  // 복합형 콘텐츠 전체 저장
  const handleSaveMixedContent = async () => {
    if (!editingMixedContentId) return;

    try {
      // 파일 업로드가 필요한 요소들 처리
      const processedElements = await Promise.all(
        editingMixedElements.map(async (element) => {
          if (element.file && (element.type === 'image' || element.type === 'video')) {
            // 파일 업로드
            const formData = new FormData();
            formData.append('file', element.file);

            const uploadResponse = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            });

            if (uploadResponse.ok) {
              const { url } = await uploadResponse.json();
              return { ...element, url, file: undefined };
            } else {
              console.error('[ContentManager] 파일 업로드 실패');
              return { ...element, file: undefined };
            }
          }
          // file 속성 제거 (undefined 값도 제거)
          const { file, ...cleanElement } = element as any;
          return cleanElement;
        })
      );

      const metadataString = JSON.stringify(processedElements);
      // metadata 업데이트
      const response = await fetch(`/api/devices/${device.id}/contents/${editingMixedContentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadata: metadataString,
        }),
      });

      if (response.ok) {
        alert('복합형 콘텐츠가 수정되었습니다.');
        setShowMixedEditModal(false);
        setEditingMixedContentId(null);
        setEditingMixedElements([]);
        fetchContents();
      } else {
        const errorData = await response.json();
        console.error('[ContentManager] 저장 실패:', errorData);
        alert('수정에 실패했습니다: ' + (errorData.error || '알 수 없는 오류'));
      }
    } catch (error) {
      console.error('[ContentManager] 복합형 콘텐츠 수정 중 오류:', error);
      alert('오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    }
  };

  // 복합형 콘텐츠 수정 취소
  const handleCancelMixedEdit = () => {
    if (confirm('수정을 취소하시겠습니까? 변경사항이 저장되지 않습니다.')) {
      setShowMixedEditModal(false);
      setEditingMixedContentId(null);
      setEditingMixedElements([]);
      setEditingElementIndex(null);
      setEditingElementData({});
    }
  };

  const handleUpdateDuration = async (contentId: string, newDuration: number) => {
    try {
      const response = await fetch(`/api/devices/${device.id}/contents/${contentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          duration: newDuration,
        }),
      });

      if (response.ok) {
        alert('재생 시간이 수정되었습니다.');
        fetchContents();
      } else {
        alert('수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('재생 시간 수정 중 오류:', error);
      alert('오류가 발생했습니다.');
    }
  };

  const fetchContents = async () => {
    try {
      const response = await fetch(`/api/devices/${device.id}/contents`);
      const data = await response.json();
      setContents(data);
      return data;
    } catch (error) {
      console.error('[ContentManager] fetchContents 오류:', error);
      setContents([]);
      return [];
    }
  };

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium">디바이스: {device.name}</h3>
          <p className="text-base text-gray-500">위치: {device.location}</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className={`px-3 py-1 rounded-full text-sm ${
            device.status === 'online'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {device.status}
          </div>
          <a
            href={`/display/${device.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
            title="콘텐츠 미리보기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </a>
        </div>
      </div>

      {/* 안내 메시지 - 콘텐츠 등록은 라이브러리에서, 연결은 콘텐츠 연결 메뉴에서 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm text-blue-800 font-medium">콘텐츠 등록 안내</p>
            <p className="text-sm text-blue-700 mt-1">
              새 콘텐츠는 <span className="font-semibold">콘텐츠 라이브러리</span> 메뉴에서 등록하세요.
              디바이스에 콘텐츠를 연결하려면 <span className="font-semibold">콘텐츠 연결</span> 메뉴를 이용하세요.
            </p>
          </div>
        </div>
      </div>

      {/* 기존 콘텐츠 추가 폼 숨김 처리 */}
      {false && (
      <div>
        <h3 className="text-lg font-medium">콘텐츠 선택</h3>
        <div className="mt-4">
          <select
            value={contentType}
            onChange={(e) => {
              setContentType(e.target.value as 'image' | 'video' | 'text' | 'split_layout');
              setEditingTextId(null);
              setTextContent({
                text: '',
                duration: 5000,
                fontSize: '24',
                fontColor: '#ffffff',
                backgroundColor: '#000000',
              });
            }}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="text">텍스트</option>
            <option value="image">이미지</option>
            <option value="video">동영상</option>
            <option value="split_layout">분할 레이아웃 (좌측: 콘텐츠, 우측: 날짜/환자명단)</option>
          </select>
        </div>

        {contentType === 'split_layout' ? (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">
              분할 레이아웃 설정 {editingSplitLayoutId && <span className="text-sm font-normal text-blue-600">(수정 모드)</span>}
            </h4>
            <p className="text-base text-blue-600 mb-2">
              이 레이아웃은 화면을 좌측(콘텐츠)과 우측(날짜/시간 + 대기환자 명단)으로 분할합니다.
              좌측에는 추가한 콘텐츠가 순환 표시되고, 우측에는 실시간 정보가 표시됩니다.
            </p>
            {editingSplitLayoutId && (
              <p className="text-base text-green-700 font-medium mb-4 bg-green-50 p-2 rounded border border-green-200">
                ✓ 기존 분할 레이아웃을 수정하는 중입니다. 왼쪽 콘텐츠를 추가/수정/삭제 후 "분할 레이아웃 수정" 버튼을 클릭하세요.
              </p>
            )}

            <div className="space-y-4 p-4 bg-white border border-blue-200 rounded-lg mb-4">
              <p className="text-base text-gray-700 font-medium mb-2">
                화면 왼쪽에 표시할 콘텐츠를 추가하세요
              </p>

              {/* 왼쪽 콘텐츠 타입 선택 */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">왼쪽 콘텐츠 타입</label>
                <select
                  value={currentLeftContent.type}
                  onChange={(e) => setCurrentLeftContent({ ...currentLeftContent, type: e.target.value as 'text' | 'image' | 'video' | 'youtube' })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="text">텍스트</option>
                  <option value="image">이미지</option>
                  <option value="video">동영상</option>
                  <option value="youtube">유튜브</option>
                </select>
              </div>

              {/* 텍스트 입력 */}
              {currentLeftContent.type === 'text' && (
                <>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">텍스트 내용</label>
                    <textarea
                      value={currentLeftContent.text || ''}
                      onChange={(e) => setCurrentLeftContent({ ...currentLeftContent, text: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-6 gap-3">
                    {/* 글자 크기 */}
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">글자 크기 (pt)</label>
                      <input
                        type="number"
                        value={currentLeftContent.fontSize || '32'}
                        onChange={(e) => setCurrentLeftContent({ ...currentLeftContent, fontSize: e.target.value })}
                        className="block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        min="8"
                        max="200"
                      />
                    </div>

                    {/* 글자 색상 */}
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">글자 색상</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="color"
                          value={currentLeftContent.fontColor || '#000000'}
                          onChange={(e) => setCurrentLeftContent({ ...currentLeftContent, fontColor: e.target.value })}
                          className="h-10 w-12 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={currentLeftContent.fontColor || '#000000'}
                          onChange={(e) => setCurrentLeftContent({ ...currentLeftContent, fontColor: e.target.value })}
                          className="flex-1 px-2 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="#000000"
                        />
                      </div>
                    </div>

                    {/* 배경 색상 */}
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">배경 색상</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="color"
                          value={currentLeftContent.backgroundColor || '#FFFFFF'}
                          onChange={(e) => setCurrentLeftContent({ ...currentLeftContent, backgroundColor: e.target.value })}
                          className="h-10 w-12 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={currentLeftContent.backgroundColor || '#FFFFFF'}
                          onChange={(e) => setCurrentLeftContent({ ...currentLeftContent, backgroundColor: e.target.value })}
                          className="flex-1 px-2 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="#FFFFFF"
                        />
                      </div>
                    </div>

                    {/* 표시 시간 - 시간 */}
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">시간</label>
                      <input
                        type="number"
                        min="0"
                        value={msToTime(currentLeftContent.duration || 5000).hours}
                        onChange={(e) => {
                          const { minutes, seconds } = msToTime(currentLeftContent.duration || 5000);
                          setCurrentLeftContent({
                            ...currentLeftContent,
                            duration: timeToMs(Number(e.target.value), minutes, seconds)
                          });
                        }}
                        className="block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-center"
                      />
                    </div>

                    {/* 표시 시간 - 분 */}
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">분</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={msToTime(currentLeftContent.duration || 5000).minutes}
                        onChange={(e) => {
                          const { hours, seconds } = msToTime(currentLeftContent.duration || 5000);
                          setCurrentLeftContent({
                            ...currentLeftContent,
                            duration: timeToMs(hours, Number(e.target.value), seconds)
                          });
                        }}
                        className="block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-center"
                      />
                    </div>

                    {/* 표시 시간 - 초 */}
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-1">초</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={msToTime(currentLeftContent.duration || 5000).seconds}
                        onChange={(e) => {
                          const { hours, minutes } = msToTime(currentLeftContent.duration || 5000);
                          setCurrentLeftContent({
                            ...currentLeftContent,
                            duration: timeToMs(hours, minutes, Number(e.target.value))
                          });
                        }}
                        className="block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-center"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* 유튜브 URL 입력 */}
              {currentLeftContent.type === 'youtube' && (
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-1">유튜브 URL</label>
                  <input
                    type="text"
                    value={currentLeftContent.url || ''}
                    onChange={(e) => setCurrentLeftContent({ ...currentLeftContent, url: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
              )}

              {/* 이미지/동영상 파일 업로드 */}
              {(currentLeftContent.type === 'image' || currentLeftContent.type === 'video') && (
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-1">
                    {currentLeftContent.type === 'image' ? '이미지 파일' : '동영상 파일'}
                  </label>
                  <input
                    type="file"
                    accept={currentLeftContent.type === 'image' ? 'image/*' : 'video/*'}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCurrentLeftContent({ ...currentLeftContent, file, url: file.name });
                      }
                    }}
                    className="block w-full text-base text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {currentLeftContent.url && (
                    <p className="mt-1 text-base text-gray-500">선택된 파일: {currentLeftContent.url}</p>
                  )}
                </div>
              )}

              {/* 왼쪽 콘텐츠 추가/수정 버튼 */}
              <button
                type="button"
                onClick={() => {
                  // 입력 검증
                  if (currentLeftContent.type === 'text' && !currentLeftContent.text) {
                    alert('텍스트 내용을 입력해주세요.');
                    return;
                  }
                  if ((currentLeftContent.type === 'image' || currentLeftContent.type === 'video') && !currentLeftContent.file && !currentLeftContent.url) {
                    alert('파일을 선택하거나 URL을 입력해주세요.');
                    return;
                  }
                  if (currentLeftContent.type === 'youtube' && !currentLeftContent.url) {
                    alert('유튜브 URL을 입력해주세요.');
                    return;
                  }

                  if (editingLeftContentId) {
                    // 수정 모드
                    const updatedContents = splitLayoutLeftContents.map(content =>
                      content.id === editingLeftContentId
                        ? {
                            ...content,
                            type: currentLeftContent.type as 'text' | 'image' | 'video' | 'youtube',
                            duration: currentLeftContent.duration || 5000,
                            text: currentLeftContent.text,
                            url: currentLeftContent.url,
                            file: currentLeftContent.file,
                            fontSize: currentLeftContent.fontSize,
                            fontColor: currentLeftContent.fontColor,
                            backgroundColor: currentLeftContent.backgroundColor,
                          }
                        : content
                    );
                    setSplitLayoutLeftContents(updatedContents);
                    setEditingLeftContentId(null);
                  } else {
                    // 추가 모드
                    const newLeftContent: MixedElement = {
                      id: Date.now().toString(),
                      type: currentLeftContent.type as 'text' | 'image' | 'video' | 'youtube',
                      order: splitLayoutLeftContents.length,
                      duration: currentLeftContent.duration || 5000,
                      text: currentLeftContent.text,
                      url: currentLeftContent.url,
                      file: currentLeftContent.file,
                      fontSize: currentLeftContent.fontSize,
                      fontColor: currentLeftContent.fontColor,
                      backgroundColor: currentLeftContent.backgroundColor,
                    };
                    setSplitLayoutLeftContents([...splitLayoutLeftContents, newLeftContent]);
                  }

                  // 입력 폼 초기화
                  setCurrentLeftContent({
                    type: 'text',
                    duration: 5000,
                    fontSize: '24',
                    fontColor: '#ffffff',
                    backgroundColor: '#000000',
                  });
                }}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
              >
                {editingLeftContentId ? '왼쪽 콘텐츠 수정 완료' : `왼쪽 콘텐츠 추가 (${splitLayoutLeftContents.length}개)`}
              </button>

              {/* 수정 취소 버튼 */}
              {editingLeftContentId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingLeftContentId(null);
                    setCurrentLeftContent({
                      type: 'text',
                      duration: 5000,
                      fontSize: '24',
                      fontColor: '#ffffff',
                      backgroundColor: '#000000',
                    });
                  }}
                  className="w-full mt-2 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
                >
                  수정 취소
                </button>
              )}

              {/* 추가된 왼쪽 콘텐츠 목록 */}
              {splitLayoutLeftContents.length > 0 && (
                <div className="space-y-2">
                  <h6 className="text-base font-medium text-gray-700">왼쪽 콘텐츠 목록</h6>
                  {splitLayoutLeftContents.map((content, idx) => (
                    <div key={content.id} className={`flex items-center justify-between p-2 rounded border ${editingLeftContentId === content.id ? 'bg-blue-100 border-blue-400' : 'bg-gray-50 border-gray-200'}`}>
                      <span className="text-sm flex-1">
                        #{idx + 1} - [{content.type}] {content.type === 'text' ? content.text?.substring(0, 30) : content.url?.substring(0, 40)} ({formatDuration(content.duration)})
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            // 수정할 콘텐츠 데이터를 폼에 로드
                            setEditingLeftContentId(content.id);
                            setCurrentLeftContent({
                              type: content.type,
                              duration: content.duration,
                              text: content.text,
                              url: content.url,
                              fontSize: content.fontSize,
                              fontColor: content.fontColor,
                              backgroundColor: content.backgroundColor,
                            });
                          }}
                          className="text-blue-600 hover:text-blue-800 text-base font-medium"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('이 콘텐츠를 삭제하시겠습니까?')) {
                              setSplitLayoutLeftContents(splitLayoutLeftContents.filter(c => c.id !== content.id));
                              // 수정 중이던 콘텐츠를 삭제한 경우 수정 모드 해제
                              if (editingLeftContentId === content.id) {
                                setEditingLeftContentId(null);
                                setCurrentLeftContent({
                                  type: 'text',
                                  duration: 5000,
                                  fontSize: '24',
                                  fontColor: '#ffffff',
                                  backgroundColor: '#000000',
                                });
                              }
                            }
                          }}
                          className="text-red-600 hover:text-red-800 text-base font-medium"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="flex items-center space-x-2 text-base text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={splitLayoutOptions.showNotices}
                  onChange={(e) => setSplitLayoutOptions({ showNotices: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>공지사항 표시 (날짜/시간 + 공지사항 + 환자명단 3단 구성)</span>
              </label>
              <p className="text-base text-gray-500 ml-6 mt-1">
                체크 해제 시: 날짜/시간 + 환자명단 2단 구성
              </p>
            </div>

            {/* 스케줄 설정 */}
            <div className="border-t pt-4 mt-4">
              <ScheduleSettings
                value={scheduleData}
                onChange={setScheduleData}
              />
            </div>

            <button
              onClick={async () => {
                try {
                  if (splitLayoutLeftContents.length === 0) {
                    alert('왼쪽에 표시할 콘텐츠를 최소 1개 이상 추가해주세요.');
                    return;
                  }

                  // 파일 업로드가 필요한 콘텐츠 처리
                  const processedLeftContents = await Promise.all(
                    splitLayoutLeftContents.map(async (content) => {
                      // file 객체 제거한 복사본 생성
                      const { file, ...contentWithoutFile } = content;

                      // 파일이 있는 경우 업로드
                      if (file && (content.type === 'image' || content.type === 'video')) {
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('deviceId', device.id);
                        formData.append('skipDbInsert', 'true'); // DB에 저장하지 않고 파일만 업로드

                        const uploadResponse = await fetch('/api/contents/upload', {
                          method: 'POST',
                          body: formData,
                        });

                        if (uploadResponse.ok) {
                          const uploadData = await uploadResponse.json();
                          // 업로드된 URL로 교체
                          return {
                            ...contentWithoutFile,
                            url: uploadData.url,
                          };
                        } else {
                          const errorData = await uploadResponse.json().catch(() => ({ error: '알 수 없는 오류' }));
                          console.error('[파일 업로드] 실패:', {
                            status: uploadResponse.status,
                            statusText: uploadResponse.statusText,
                            error: errorData
                          });
                          throw new Error(`파일 업로드 실패: ${errorData.error || uploadResponse.statusText}`);
                        }
                      }
                      // 유튜브의 경우 youtube: 접두사 추가
                      if (content.type === 'youtube' && content.url && !content.url.startsWith('youtube:')) {
                        return {
                          ...contentWithoutFile,
                          url: 'youtube:' + content.url,
                        };
                      }
                      // 파일이 없으면 기존 URL 유지하면서 file 필드만 제거
                      return contentWithoutFile;
                    })
                  );

                  let response;
                  if (editingSplitLayoutId) {
                    // 수정 모드
                    const updateData = {
                      type: 'split_layout',
                      text: JSON.stringify(processedLeftContents),
                      duration: processedLeftContents.reduce((sum: number, content: any) => sum + (content.duration || 5000), 0),
                      metadata: JSON.stringify({ showNotices: splitLayoutOptions.showNotices }),
                      ...scheduleData,
                    };
                    response = await fetch(`/api/devices/${device.id}/contents/${editingSplitLayoutId}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(updateData),
                    });
                  } else {
                    // 신규 추가 모드
                    response = await fetch('/api/contents/splitlayout', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        deviceId: device.id,
                        leftContents: processedLeftContents,
                        showNotices: splitLayoutOptions.showNotices,
                        ...scheduleData,
                      }),
                    });
                  }

                  if (response.ok) {
                    const data = await response.json();
                    alert(`분할 레이아웃이 ${editingSplitLayoutId ? '수정' : '추가'}되었습니다!`);

                    // 초기화
                    setSplitLayoutLeftContents([]);
                    setCurrentLeftContent({
                      type: 'text',
                      duration: 5000,
                      fontSize: '24',
                      fontColor: '#ffffff',
                      backgroundColor: '#000000',
                    });
                    setEditingSplitLayoutId(null);
                    setScheduleData({ scheduleType: 'always' });

                    fetchContents();
                  } else {
                    const error = await response.json();
                    console.error(`분할 레이아웃 ${editingSplitLayoutId ? '수정' : '추가'} 실패:`, error);
                    alert(`분할 레이아웃 ${editingSplitLayoutId ? '수정' : '추가'} 실패: ${error.error || '알 수 없는 오류'}`);
                  }
                } catch (error) {
                  console.error('분할 레이아웃 콘텐츠 등록 중 오류 발생:', error);
                  console.error('오류 상세:', {
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                    splitLayoutLeftContents
                  });
                  alert(`오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
                }
              }}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {editingSplitLayoutId ? '분할 레이아웃 수정' : '분할 레이아웃 추가'}
            </button>
            {editingSplitLayoutId && (
              <button
                type="button"
                onClick={() => {
                  setSplitLayoutLeftContents([]);
                  setCurrentLeftContent({
                    type: 'text',
                    duration: 5000,
                    fontSize: '24',
                    fontColor: '#ffffff',
                    backgroundColor: '#000000',
                  });
                  setEditingSplitLayoutId(null);
                  setSplitLayoutOptions({ showNotices: true });
                  setScheduleData({ scheduleType: 'always' });
                }}
                className="w-full mt-2 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                수정 취소
              </button>
            )}
          </div>
        ) : contentType === 'text' ? (
          <form onSubmit={handleTextSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="text" className="block text-base font-medium text-gray-700">
                텍스트 내용
              </label>
              <textarea
                id="text"
                value={textContent.text}
                onChange={(e) => setTextContent((prev) => ({ ...prev, text: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
            <div className="grid grid-cols-6 gap-3">
              {/* 글자 크기 */}
              <div>
                <label htmlFor="fontSize" className="block text-base font-medium text-gray-700 mb-1">
                  글자 크기 (pt)
                </label>
                <input
                  type="number"
                  id="fontSize"
                  value={textContent.fontSize}
                  onChange={(e) => setTextContent((prev) => ({ ...prev, fontSize: e.target.value }))}
                  className="block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  min="8"
                  max="200"
                  required
                />
              </div>

              {/* 글자 색상 */}
              <div>
                <label htmlFor="fontColor" className="block text-base font-medium text-gray-700 mb-1">
                  글자 색상
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="color"
                    id="fontColor"
                    value={textContent.fontColor}
                    onChange={(e) => setTextContent((prev) => ({ ...prev, fontColor: e.target.value }))}
                    className="h-10 w-12 rounded border border-gray-300 cursor-pointer"
                    required
                  />
                  <input
                    type="text"
                    value={textContent.fontColor}
                    onChange={(e) => setTextContent((prev) => ({ ...prev, fontColor: e.target.value }))}
                    className="flex-1 px-2 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="#000000"
                  />
                </div>
              </div>

              {/* 배경 색상 */}
              <div>
                <label htmlFor="backgroundColor" className="block text-base font-medium text-gray-700 mb-1">
                  배경 색상
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="color"
                    id="backgroundColor"
                    value={textContent.backgroundColor}
                    onChange={(e) => setTextContent((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                    className="h-10 w-12 rounded border border-gray-300 cursor-pointer"
                    required
                  />
                  <input
                    type="text"
                    value={textContent.backgroundColor}
                    onChange={(e) => setTextContent((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                    className="flex-1 px-2 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>

              {/* 표시 시간 - 시간 */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-1">
                  시간
                </label>
                <input
                  type="number"
                  min="0"
                  value={msToTime(textContent.duration).hours}
                  onChange={(e) => {
                    const { minutes, seconds } = msToTime(textContent.duration);
                    setTextContent((prev) => ({
                      ...prev,
                      duration: timeToMs(Number(e.target.value), minutes, seconds)
                    }));
                  }}
                  className="block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-center"
                />
              </div>

              {/* 표시 시간 - 분 */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-1">
                  분
                </label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={msToTime(textContent.duration).minutes}
                  onChange={(e) => {
                    const { hours, seconds } = msToTime(textContent.duration);
                    setTextContent((prev) => ({
                      ...prev,
                      duration: timeToMs(hours, Number(e.target.value), seconds)
                    }));
                  }}
                  className="block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-center"
                />
              </div>

              {/* 표시 시간 - 초 */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-1">
                  초
                </label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={msToTime(textContent.duration).seconds}
                  onChange={(e) => {
                    const { hours, minutes } = msToTime(textContent.duration);
                    setTextContent((prev) => ({
                      ...prev,
                      duration: timeToMs(hours, minutes, Number(e.target.value))
                    }));
                  }}
                  className="block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-center"
                />
              </div>
            </div>

            {/* 스케줄 설정 */}
            <div className="border-t pt-4">
              <ScheduleSettings
                value={scheduleData}
                onChange={setScheduleData}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {editingTextId ? '텍스트 수정' : '텍스트 추가'}
            </button>
            {editingTextId && (
              <button
                type="button"
                onClick={() => {
                  setEditingTextId(null);
                  setTextContent({
                    text: '',
                    duration: 5000,
                    fontSize: '24',
                    fontColor: '#ffffff',
                    backgroundColor: '#000000',
                  });
                  setScheduleData({ scheduleType: 'always' });
                }}
                className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
              >
                취소
              </button>
            )}
          </form>
        ) : contentType === 'video' ? (
          <div className="mt-4 space-y-4">
            {/* 동영상 소스 선택 탭 */}
            <div className="flex space-x-2 border-b border-gray-200">
              <button
                type="button"
                onClick={() => setVideoSource('file')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  videoSource === 'file'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                파일 업로드
              </button>
              <button
                type="button"
                onClick={() => setVideoSource('youtube')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  videoSource === 'youtube'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                유튜브 연결
              </button>
            </div>

            {videoSource === 'file' ? (
              <div className="space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="video/*"
                  className="block w-full text-base text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                />

                {/* 스케줄 설정 */}
                {selectedFile && (
                  <div className="border-t pt-4">
                    <ScheduleSettings
                      value={scheduleData}
                      onChange={setScheduleData}
                    />
                  </div>
                )}

                {selectedFile && (
                  <button
                    onClick={handleFileUpload}
                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    동영상 업로드
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    유튜브 URL
                  </label>
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... 또는 재생목록 URL"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <p className="mt-1 text-base text-gray-500">
                    단일 영상, 재생목록 모두 지원됩니다
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-base font-medium text-gray-700">재생 옵션</label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={youtubeOptions.autoplay}
                        onChange={(e) => setYoutubeOptions(prev => ({ ...prev, autoplay: e.target.checked }))}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-base text-gray-700">자동 재생</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={youtubeOptions.loop}
                        onChange={(e) => setYoutubeOptions(prev => ({ ...prev, loop: e.target.checked }))}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-base text-gray-700">반복 재생</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={youtubeOptions.mute}
                        onChange={(e) => setYoutubeOptions(prev => ({ ...prev, mute: e.target.checked }))}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-base text-gray-700">음소거</span>
                    </label>
                  </div>
                </div>

                {/* 스케줄 설정 */}
                <div className="border-t pt-4">
                  <ScheduleSettings
                    value={scheduleData}
                    onChange={setScheduleData}
                  />
                </div>

                <button
                  onClick={handleYoutubeSubmit}
                  disabled={!youtubeUrl.trim()}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  유튜브 영상 추가
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="block w-full text-base text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
            />
            {selectedFile && (
              <button
                onClick={handleFileUpload}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                이미지 업로드
              </button>
            )}
          </div>
        )}
      </div>
      )}

      <div>
        <h3 className="text-lg font-medium">등록된 콘텐츠</h3>
        <div className="mt-4 space-y-4">
          {contents.length > 0 ? (
            contents.map((content) => (
              <div
                key={content.id}
                className="flex items-start justify-between border rounded-lg p-4"
              >
                {/* 썸네일 영역 */}
                {(content.type === 'image' || content.type === 'video') && content.url && (
                  <div className="flex-shrink-0 mr-4">
                    {content.type === 'image' ? (
                      <img
                        src={content.url}
                        alt="이미지 썸네일"
                        className="w-32 h-20 object-cover rounded-md border border-gray-300 bg-gray-100"
                        loading="lazy"
                      />
                    ) : content.url.startsWith('youtube:') ? (
                      <div className="relative w-32 h-20 rounded-md border border-gray-300 overflow-hidden bg-black">
                        <img
                          src={getYoutubeThumbnail(content.url)}
                          alt="유튜브 썸네일"
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center opacity-90">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-32 h-20 bg-gradient-to-br from-gray-700 to-gray-900 rounded-md border border-gray-300 flex flex-col items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-white text-base font-medium">동영상</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-2 flex-grow mr-4">
                  {content.type === 'text' ? (
                    <>
                      <p className="font-medium break-words">{content.text}</p>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className="text-black">글자 크기: {content.fontSize}</span>
                        <span className="text-black">글자 색상: {content.fontColor}</span>
                        <span className="text-black">배경 색상: {content.backgroundColor}</span>
                      </div>
                    </>
                  ) : content.type === 'split_layout' ? (
                    <>
                      <p className="font-medium break-words text-blue-700 mb-3">분할 레이아웃</p>
                      {content.text && (() => {
                        try {
                          const leftContents = JSON.parse(content.text);
                          const metadata = content.metadata ? JSON.parse(content.metadata) : { showNotices: true };

                          return (
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2 text-sm mb-2">
                                <span className="text-blue-600 font-medium">왼쪽: {leftContents.length}개 콘텐츠</span>
                                <span className="text-gray-600">|</span>
                                <span className="text-gray-600">우측: {metadata.showNotices ? '날짜/시간 + 공지사항 + 환자명단' : '날짜/시간 + 환자명단'}</span>
                              </div>

                              {/* 왼쪽 콘텐츠 목록 */}
                              <div className="space-y-2 pl-2 border-l-2 border-blue-300">
                                {leftContents.map((element: any, index: number) => (
                                  <div key={index} className="flex items-start gap-3 p-2 bg-blue-50 rounded">
                                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                      {index + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2 py-0.5 bg-blue-200 text-blue-800 rounded text-base font-medium">
                                          {element.type === 'text' ? '텍스트' : element.type === 'image' ? '이미지' : element.type === 'video' ? '동영상' : '유튜브'}
                                        </span>
                                        <span className="text-base text-gray-600">{formatDuration(element.duration)}</span>
                                      </div>
                                      {element.type === 'text' && element.text && (
                                        <p className="text-base text-gray-700 truncate">{element.text}</p>
                                      )}
                                      {(element.type === 'image' || element.type === 'video' || element.type === 'youtube') && element.url && (
                                        <p className="text-base text-gray-600 truncate">{element.url}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        } catch (e) {
                          return (
                            <div className="flex flex-wrap gap-2 text-sm">
                              <span className="text-black">좌측: 콘텐츠 정보 파싱 오류</span>
                              <span className="text-black">우측: 날짜/시간 + 환자명단</span>
                            </div>
                          );
                        }
                      })()}
                    </>
                  ) : (
                    <>
                      {content.type === 'video' && content.url?.startsWith('youtube:') ? (
                        <>
                          <p className="font-medium break-words flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                            유튜브 영상
                          </p>
                          <div className="flex flex-wrap gap-2 text-sm">
                            {content.metadata && (() => {
                              try {
                                const metadata = JSON.parse(content.metadata);
                                return (
                                  <>
                                    <span className="text-black">
                                      {metadata.youtubeType === 'playlist' ? '재생목록' : '단일 영상'}
                                    </span>
                                    <span className="text-black">{metadata.autoplay ? '자동 재생' : '수동 재생'}</span>
                                    <span className="text-black">{metadata.loop ? '반복 재생' : '1회 재생'}</span>
                                    <span className="text-black">{metadata.mute ? '음소거' : '소리 있음'}</span>
                                  </>
                                );
                              } catch {
                                return <span className="text-black">설정 정보 없음</span>;
                              }
                            })()}
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="font-medium break-words">{content.type === 'image' ? '이미지' : '동영상'}</p>
                          <div className="flex flex-wrap gap-2 text-sm">
                            <span className="text-black">파일: {content.url}</span>
                            {content.type === 'video' && (
                              <>
                                <span className="text-black">{content.autoplay ? '자동 재생' : '수동 재생'}</span>
                                <span className="text-black">{content.loop ? '반복 재생' : '1회 재생'}</span>
                                <span className="text-black">{content.muted ? '음소거' : '소리 있음'}</span>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  )}
                  <div className="text-base text-black flex items-center gap-2 flex-wrap">
                    <span>재생 시간: {content.isLibraryContent ? `${content.duration}초` : formatDuration(content.duration)}</span>
                    <span>순서: {content.order + 1}번째</span>
                    {content.isLibraryContent && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full border border-green-300">
                        라이브러리
                      </span>
                    )}
                  </div>
                  {/* 스케줄 정보 표시 */}
                  {content.scheduleType && content.scheduleType !== 'always' && (
                    <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-base font-medium bg-blue-100 text-blue-800 border border-blue-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{formatScheduleInfo(content)}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {content.isLibraryContent ? (
                    <>
                      <button
                        onClick={() => handleEditSchedule(content)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        스케줄 설정
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (window.confirm('디바이스에서 이 콘텐츠 연결을 해제하시겠습니까?')) {
                            handleUnlinkContent(content.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        연결 해제
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEditContent(content)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        수정
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (window.confirm('정말로 삭제하시겠습니까?')) {
                            handleDeleteContent(content.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">등록된 콘텐츠가 없습니다.</p>
          )}
        </div>
      </div>
    </div>

    {/* 이미지/동영상 수정 모달 */}
    {showMediaEditModal && editingMediaContent && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
          <div className="border-b px-6 py-4 flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800">
              {editingMediaContent.type === 'image' ? '이미지' : '동영상'} 수정
            </h3>
            <button
              onClick={() => {
                setShowMediaEditModal(false);
                setEditingMediaContent(null);
                setEditingMediaFile(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* 현재 미디어 미리보기 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">현재 파일</label>
              {editingMediaContent.type === 'image' ? (
                <img
                  src={editingMediaContent.url}
                  alt="현재 이미지"
                  className="w-full h-48 object-contain bg-gray-100 rounded"
                />
              ) : (
                <video
                  src={editingMediaContent.url}
                  className="w-full h-48 object-contain bg-gray-100 rounded"
                  controls
                />
              )}
            </div>

            {/* 새 파일 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                새 파일 선택 (선택사항)
              </label>
              <input
                type="file"
                accept={editingMediaContent.type === 'image' ? 'image/*' : 'video/*'}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setEditingMediaFile(file);
                }}
                className="w-full border rounded px-3 py-2"
              />
              {editingMediaFile && (
                <p className="mt-1 text-sm text-green-600">
                  선택됨: {editingMediaFile.name}
                </p>
              )}
            </div>

            {/* 재생 시간 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                재생 시간 (초) {editingMediaContent.type === 'video' && '(0 = 동영상 끝까지)'}
              </label>
              <input
                type="number"
                min="0"
                value={editingMediaDuration / 1000}
                onChange={(e) => setEditingMediaDuration(Number(e.target.value) * 1000)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="border-t px-6 py-4 flex gap-3 justify-end">
            <button
              onClick={() => {
                setShowMediaEditModal(false);
                setEditingMediaContent(null);
                setEditingMediaFile(null);
              }}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              취소
            </button>
            <button
              onClick={handleSaveMediaEdit}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    )}

    {/* 라이브러리 콘텐츠 스케줄 수정 모달 */}
    {showScheduleEditModal && editingScheduleContent && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
            <h3 className="text-xl font-bold text-blue-700">스케줄 설정</h3>
            <button
              onClick={() => {
                setShowScheduleEditModal(false);
                setEditingScheduleContent(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* 콘텐츠 정보 (읽기 전용) */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">콘텐츠 정보</p>
              <p className="font-medium text-gray-800">
                [{editingScheduleContent.type}] {editingScheduleContent.text?.substring(0, 50) || editingScheduleContent.url?.substring(0, 50) || '콘텐츠'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                재생 시간: {editingScheduleContent.duration}초
                <span className="ml-2 text-blue-600">(콘텐츠 라이브러리에서 수정 가능)</span>
              </p>
            </div>

            {/* 스케줄 설정 */}
            <ScheduleSettings
              value={editingScheduleData}
              onChange={setEditingScheduleData}
            />
          </div>

          <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowScheduleEditModal(false);
                setEditingScheduleContent(null);
              }}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              취소
            </button>
            <button
              onClick={handleSaveSchedule}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
