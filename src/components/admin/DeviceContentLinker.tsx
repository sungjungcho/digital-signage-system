'use client';

import { useState, useEffect } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { LayoutTemplateId, LAYOUT_TEMPLATES } from '@/types/layout';

type Content = {
  id: string;
  name: string;
  type: string;
  url: string | null;
  text: string | null;
  duration: number;
  fontSize?: string | null;
  fontColor?: string | null;
  backgroundColor?: string | null;
  linkedDeviceCount?: number;
};

type LinkedContent = Content & {
  link_id: string;
  order: number;
  active: number;
  zone_id: string;
};

type Device = {
  id: string;
  name: string;
  location: string;
  alias: string;
  layout_template: LayoutTemplateId;
};

export default function DeviceContentLinker() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [libraryContents, setLibraryContents] = useState<Content[]>([]);
  const [linkedContents, setLinkedContents] = useState<LinkedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all'); // 콘텐츠 타입 필터
  const [applyingToDevice, setApplyingToDevice] = useState(false);

  // 디바이스에 콘텐츠 변경사항 적용 (새로고침 트리거)
  const handleApplyToDevice = async () => {
    if (!selectedDevice) {
      alert('디바이스를 선택하세요.');
      return;
    }
    setApplyingToDevice(true);
    try {
      const response = await fetch('http://localhost:3032/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'contentUpdate',
          data: { deviceId: selectedDevice.id }
        }),
      });

      if (response.ok) {
        alert('디바이스에 적용되었습니다.');
      } else {
        alert('디바이스 적용에 실패했습니다. WebSocket 서버를 확인해주세요.');
      }
    } catch (error) {
      console.error('디바이스 적용 오류:', error);
      alert('디바이스 적용 중 오류가 발생했습니다. WebSocket 서버가 실행 중인지 확인해주세요.');
    } finally {
      setApplyingToDevice(false);
    }
  };

  // 디바이스 목록 조회
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch('/api/devices');
        const data = await response.json();
        if (Array.isArray(data)) {
          setDevices(data);
        }
      } catch (error) {
        console.error('디바이스 목록 조회 오류:', error);
      }
    };
    fetchDevices();
  }, []);

  // 콘텐츠 라이브러리 조회
  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const response = await fetch('/api/contents');
        if (response.ok) {
          const data = await response.json();
          setLibraryContents(data);
        }
      } catch (error) {
        console.error('콘텐츠 라이브러리 조회 오류:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLibrary();
  }, []);

  // 선택된 디바이스의 연결된 콘텐츠 조회
  useEffect(() => {
    if (!selectedDevice) {
      setLinkedContents([]);
      return;
    }

    const fetchLinked = async () => {
      try {
        const response = await fetch(`/api/devices/${selectedDevice.id}/contents/link`);
        if (response.ok) {
          const data = await response.json();
          setLinkedContents(data);
        }
      } catch (error) {
        console.error('연결된 콘텐츠 조회 오류:', error);
      }
    };
    fetchLinked();
  }, [selectedDevice]);

  // 현재 디바이스의 레이아웃 템플릿
  const layoutTemplate = selectedDevice
    ? LAYOUT_TEMPLATES[selectedDevice.layout_template || 'fullscreen']
    : null;

  // 영역별 콘텐츠 그룹화
  const getContentsByZone = (zoneId: string) => {
    return linkedContents
      .filter(c => (c.zone_id || 'area-0') === zoneId)
      .sort((a, b) => a.order - b.order);
  };

  // 드래그 종료 핸들러
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination || !selectedDevice) return;

    // 같은 위치로 드래그한 경우 무시
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // 라이브러리에서 영역으로 드래그 (연결)
    if (source.droppableId === 'library' && destination.droppableId.startsWith('zone-')) {
      const contentId = draggableId.replace('library-', '');
      const zoneId = destination.droppableId.replace('zone-', '');

      try {
        const response = await fetch(`/api/devices/${selectedDevice.id}/contents/link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentId, zoneId }),
        });

        if (response.ok) {
          // 연결된 콘텐츠 새로고침
          const linkedResponse = await fetch(`/api/devices/${selectedDevice.id}/contents/link`);
          if (linkedResponse.ok) {
            setLinkedContents(await linkedResponse.json());
          }
        }
      } catch (error) {
        console.error('콘텐츠 연결 오류:', error);
      }
      return;
    }

    // 영역 내에서 순서 변경 또는 영역 간 이동
    if (source.droppableId.startsWith('zone-') && destination.droppableId.startsWith('zone-')) {
      const sourceZoneId = source.droppableId.replace('zone-', '');
      const destZoneId = destination.droppableId.replace('zone-', '');
      const contentId = draggableId.replace('zone-content-', '');

      // 같은 영역 내 순서 변경
      if (sourceZoneId === destZoneId) {
        const zoneContents = getContentsByZone(sourceZoneId);
        const items = Array.from(zoneContents);
        const [reorderedItem] = items.splice(source.index, 1);
        items.splice(destination.index, 0, reorderedItem);

        // UI 즉시 업데이트
        const newLinkedContents = linkedContents.map(c => {
          if ((c.zone_id || 'area-0') !== sourceZoneId) return c;
          const newIndex = items.findIndex(item => item.id === c.id);
          if (newIndex === -1) return c;
          return { ...c, order: newIndex };
        });
        setLinkedContents(newLinkedContents);

        // API 호출
        try {
          await fetch(`/api/devices/${selectedDevice.id}/contents/link`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              zoneId: sourceZoneId,
              orderedContentIds: items.map(item => item.id),
            }),
          });
        } catch (error) {
          console.error('순서 변경 오류:', error);
        }
      } else {
        // 영역 간 이동
        try {
          await fetch(`/api/devices/${selectedDevice.id}/contents/link/${contentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zoneId: destZoneId }),
          });

          // 새로고침
          const linkedResponse = await fetch(`/api/devices/${selectedDevice.id}/contents/link`);
          if (linkedResponse.ok) {
            setLinkedContents(await linkedResponse.json());
          }
        } catch (error) {
          console.error('영역 이동 오류:', error);
        }
      }
      return;
    }

    // 영역에서 라이브러리로 드래그 (연결 해제)
    if (source.droppableId.startsWith('zone-') && destination.droppableId === 'library') {
      const contentId = draggableId.replace('zone-content-', '');

      try {
        const response = await fetch(
          `/api/devices/${selectedDevice.id}/contents/link/${contentId}`,
          { method: 'DELETE' }
        );

        if (response.ok) {
          setLinkedContents(prev => prev.filter(c => c.id !== contentId));
        }
      } catch (error) {
        console.error('연결 해제 오류:', error);
      }
      return;
    }
  };

  // 콘텐츠 연결 해제
  const handleUnlink = async (contentId: string) => {
    if (!selectedDevice) return;
    if (!confirm('이 콘텐츠의 연결을 해제하시겠습니까?')) return;

    try {
      const response = await fetch(
        `/api/devices/${selectedDevice.id}/contents/link/${contentId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setLinkedContents(prev => prev.filter(c => c.id !== contentId));
      }
    } catch (error) {
      console.error('연결 해제 오류:', error);
    }
  };

  // 콘텐츠 썸네일 컴포넌트
  const ContentThumbnail = ({ content, size = 'md' }: { content: Content; size?: 'sm' | 'md' }) => {
    const sizeClass = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12';

    if (content.type === 'image' && content.url) {
      return (
        <div className={`${sizeClass} flex-shrink-0 rounded-lg overflow-hidden bg-gray-100`}>
          <img src={content.url} alt={content.name} className="w-full h-full object-cover" />
        </div>
      );
    }
    if (content.type === 'video' && content.url) {
      if (content.url.startsWith('youtube:')) {
        const videoUrl = content.url.replace('youtube:', '');
        let videoId = '';
        if (videoUrl.includes('youtube.com/watch?v=')) {
          videoId = new URL(videoUrl).searchParams.get('v') || '';
        } else if (videoUrl.includes('youtu.be/')) {
          videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0] || '';
        }
        if (videoId) {
          return (
            <div className={`${sizeClass} flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 relative`}>
              <img
                src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                alt={content.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="text-white text-xs">▶</span>
              </div>
            </div>
          );
        }
      }
      return (
        <div className={`${sizeClass} flex-shrink-0 rounded-lg bg-gray-800 flex items-center justify-center`}>
          <span className="text-white">🎬</span>
        </div>
      );
    }
    // 텍스트 콘텐츠 미리보기
    if (content.type === 'text' && content.text) {
      const bgColor = content.backgroundColor || '#1a1a2e';
      const textColor = content.fontColor || '#ffffff';
      return (
        <div
          className={`${sizeClass} flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center p-1`}
          style={{ backgroundColor: bgColor }}
        >
          <span
            className="text-[8px] leading-tight text-center line-clamp-3 break-all"
            style={{ color: textColor }}
          >
            {content.text.length > 30 ? content.text.substring(0, 30) + '...' : content.text}
          </span>
        </div>
      );
    }

    return (
      <div className={`${sizeClass} flex-shrink-0 rounded-lg bg-gray-100 flex items-center justify-center`}>
        <span>📄</span>
      </div>
    );
  };

  // 영역 색상
  const getZoneColor = (index: number) => {
    const colors = [
      { bg: 'bg-blue-50', border: 'border-blue-300', hover: 'border-blue-500', text: 'text-blue-700' },
      { bg: 'bg-green-50', border: 'border-green-300', hover: 'border-green-500', text: 'text-green-700' },
      { bg: 'bg-amber-50', border: 'border-amber-300', hover: 'border-amber-500', text: 'text-amber-700' },
      { bg: 'bg-red-50', border: 'border-red-300', hover: 'border-red-500', text: 'text-red-700' },
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return <div className="text-center py-8">로딩 중...</div>;
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-indigo-100">
      <h3 className="text-2xl font-bold text-indigo-800 mb-4 flex items-center">
        <span className="mr-2">🔗</span>
        콘텐츠 연결 관리
      </h3>

      {/* 디바이스 선택 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">디바이스 선택</label>
        <div className="flex items-center gap-4">
          <select
            value={selectedDevice?.id || ''}
            onChange={(e) => {
              const device = devices.find(d => d.id === e.target.value);
              setSelectedDevice(device || null);
            }}
            className="flex-1 md:flex-none md:w-1/2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">디바이스를 선택하세요</option>
            {devices.map(device => (
              <option key={device.id} value={device.id}>
                {device.name} ({device.location})
              </option>
            ))}
          </select>
          {selectedDevice && (
            <button
              onClick={handleApplyToDevice}
              disabled={applyingToDevice}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 font-medium shadow-sm transition"
              title="변경사항을 디바이스에 적용"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {applyingToDevice ? '적용 중...' : '디바이스에 적용'}
            </button>
          )}
        </div>
      </div>

      {selectedDevice && layoutTemplate ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 레이아웃 영역들 */}
            <div className="lg:col-span-2">
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2">📺</span>
                {selectedDevice.name} - {layoutTemplate.name}
              </h4>

              {/* 레이아웃 그리드 */}
              <div
                className="rounded-xl border-2 border-gray-300 bg-gray-100 p-2 aspect-video"
                style={{
                  display: 'grid',
                  gridTemplateColumns: layoutTemplate.gridTemplate.columns,
                  gridTemplateRows: layoutTemplate.gridTemplate.rows,
                  gap: '8px',
                }}
              >
                {layoutTemplate.areas.map((area, index) => {
                  const zoneContents = getContentsByZone(area.id);
                  const colors = getZoneColor(index);

                  return (
                    <Droppable key={area.id} droppableId={`zone-${area.id}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`rounded-lg p-2 ${colors.bg} border-2 ${
                            snapshot.isDraggingOver ? colors.hover : colors.border
                          } transition-colors overflow-y-auto`}
                          style={{
                            gridRow: area.style.gridRow,
                            gridColumn: area.style.gridColumn,
                          }}
                        >
                          <div className={`text-xs font-medium ${colors.text} mb-2`}>
                            {area.name} ({zoneContents.length})
                          </div>

                          <div className="space-y-1">
                            {zoneContents.map((content, idx) => (
                              <Draggable
                                key={content.id}
                                draggableId={`zone-content-${content.id}`}
                                index={idx}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`flex items-center gap-2 p-1.5 bg-white rounded border ${
                                      snapshot.isDragging ? 'border-indigo-500 shadow-lg' : 'border-gray-200'
                                    } cursor-grab`}
                                  >
                                    <ContentThumbnail content={content} size="sm" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate">{content.name}</p>
                                      <p className="text-[10px] text-gray-500">{content.duration}초</p>
                                    </div>
                                    <button
                                      onClick={() => handleUnlink(content.id)}
                                      className="p-1 text-red-400 hover:text-red-600"
                                    >
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                            {zoneContents.length === 0 && (
                              <div className={`text-center py-4 text-xs ${colors.text} opacity-60`}>
                                콘텐츠를 여기로 드래그
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </div>
            </div>

            {/* 콘텐츠 라이브러리 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-700 flex items-center">
                  <span className="mr-2">📚</span>
                  콘텐츠 라이브러리
                </h4>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">전체</option>
                  <option value="image">이미지</option>
                  <option value="video">동영상</option>
                  <option value="text">텍스트</option>
                </select>
              </div>
              <Droppable droppableId="library">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`rounded-xl p-3 min-h-[400px] max-h-[500px] overflow-y-auto space-y-2 transition-colors ${
                      snapshot.isDraggingOver
                        ? 'bg-emerald-50 border-2 border-dashed border-emerald-400'
                        : 'bg-gray-50 border-2 border-dashed border-gray-200'
                    }`}
                  >
                    {libraryContents
                      .filter(c => !linkedContents.some(lc => lc.id === c.id))
                      .filter(c => filterType === 'all' || c.type === filterType)
                      .map((content, index) => (
                        <Draggable
                          key={content.id}
                          draggableId={`library-${content.id}`}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`flex items-center gap-3 p-2 bg-white rounded-lg border ${
                                snapshot.isDragging ? 'border-indigo-500 shadow-lg' : 'border-gray-200'
                              } cursor-grab`}
                            >
                              <ContentThumbnail content={content} size="sm" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{content.name}</p>
                                <p className="text-xs text-gray-500">{content.duration}초</p>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                    {libraryContents
                      .filter(c => !linkedContents.some(lc => lc.id === c.id))
                      .filter(c => filterType === 'all' || c.type === filterType)
                      .length === 0 && (
                      <div className="text-center text-gray-400 py-8 text-sm">
                        {filterType === 'all' ? '연결 가능한 콘텐츠가 없습니다' : `연결 가능한 ${filterType === 'image' ? '이미지' : filterType === 'video' ? '동영상' : '텍스트'} 콘텐츠가 없습니다`}
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </DragDropContext>
      ) : (
        <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-xl">
          <p>디바이스를 선택하면 레이아웃에 콘텐츠를 배치할 수 있습니다.</p>
        </div>
      )}
    </div>
  );
}
