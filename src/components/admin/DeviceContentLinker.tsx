'use client';

import { useState, useEffect } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';

type Content = {
  id: string;
  name: string;
  type: string;
  url: string | null;
  duration: number;
  linkedDeviceCount?: number;
};

type LinkedContent = Content & {
  link_id: string;
  order: number;
  active: number;
};

type Device = {
  id: string;
  name: string;
  location: string;
  alias: string;
};

export default function DeviceContentLinker() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [libraryContents, setLibraryContents] = useState<Content[]>([]);
  const [linkedContents, setLinkedContents] = useState<LinkedContent[]>([]);
  const [loading, setLoading] = useState(true);

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

  // 드래그 종료 핸들러
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination || !selectedDevice) return;

    // 라이브러리에서 디바이스로 드래그 (연결)
    if (source.droppableId === 'library' && destination.droppableId === 'device') {
      const contentId = draggableId.replace('library-', '');

      // 이미 연결되어 있는지 확인
      if (linkedContents.some(c => c.id === contentId)) {
        alert('이미 연결된 콘텐츠입니다.');
        return;
      }

      try {
        const response = await fetch(`/api/devices/${selectedDevice.id}/contents/link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentId }),
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
    }

    // 디바이스에서 라이브러리로 드래그 (연결 해제)
    if (source.droppableId === 'device' && destination.droppableId === 'library') {
      const contentId = draggableId.replace('device-', '');
      const previousLinkedContents = [...linkedContents];

      // 즉시 UI 반영
      setLinkedContents(prev => prev.filter(c => c.id !== contentId));

      try {
        const response = await fetch(
          `/api/devices/${selectedDevice.id}/contents/link/${contentId}`,
          { method: 'DELETE' }
        );

        if (!response.ok) {
          // 실패 시 롤백
          setLinkedContents(previousLinkedContents);
          const error = await response.json();
          alert(error.error || '콘텐츠 연결 해제에 실패했습니다.');
        }
      } catch (error) {
        console.error('콘텐츠 연결 해제 오류:', error);
        setLinkedContents(previousLinkedContents);
        alert('콘텐츠 연결 해제 중 오류가 발생했습니다.');
      }
      return;
    }

    // 디바이스 내에서 순서 변경
    if (source.droppableId === 'device' && destination.droppableId === 'device') {
      const items = Array.from(linkedContents);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);

      setLinkedContents(items);

      // API 호출로 순서 저장
      try {
        await fetch(`/api/devices/${selectedDevice.id}/contents/link`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderedContentIds: items.map(item => item.id),
          }),
        });
      } catch (error) {
        console.error('순서 변경 오류:', error);
      }
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

  // 타입별 아이콘
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return '🖼️';
      case 'video': return '🎬';
      case 'text': return '📝';
      default: return '📄';
    }
  };

  // 콘텐츠 썸네일 컴포넌트
  const ContentThumbnail = ({ content }: { content: Content }) => {
    if (content.type === 'image' && content.url) {
      return (
        <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
          <img
            src={content.url}
            alt={content.name}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    if (content.type === 'video' && content.url) {
      // 유튜브인 경우 썸네일
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
            <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 relative">
              <img
                src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                alt={content.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="text-white text-lg">▶</span>
              </div>
            </div>
          );
        }
      }
      // 일반 동영상
      return (
        <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center">
          <span className="text-white text-2xl">🎬</span>
        </div>
      );
    }
    // 텍스트 또는 기타
    return (
      <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-gray-100 flex items-center justify-center">
        <span className="text-2xl">{getTypeIcon(content.type)}</span>
      </div>
    );
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
        <label className="block text-sm font-medium text-gray-700 mb-2">
          디바이스 선택
        </label>
        <select
          value={selectedDevice?.id || ''}
          onChange={(e) => {
            const device = devices.find(d => d.id === e.target.value);
            setSelectedDevice(device || null);
          }}
          className="w-full md:w-1/2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">디바이스를 선택하세요</option>
          {devices.map(device => (
            <option key={device.id} value={device.id}>
              {device.name} ({device.location})
            </option>
          ))}
        </select>
      </div>

      {selectedDevice ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 디바이스에 연결된 콘텐츠 (드롭 영역) */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2">📺</span>
                {selectedDevice.name}
                <span className="ml-2 text-sm text-gray-500">
                  ({linkedContents.length}개 연결됨)
                </span>
              </h4>
              <Droppable droppableId="device">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`rounded-xl p-3 min-h-[300px] max-h-[500px] overflow-y-auto space-y-2 transition-colors ${
                      snapshot.isDraggingOver
                        ? 'bg-indigo-50 border-2 border-dashed border-indigo-400'
                        : 'bg-indigo-50/50 border-2 border-dashed border-indigo-200'
                    }`}
                  >
                    {linkedContents.map((content, index) => (
                      <Draggable
                        key={content.id}
                        draggableId={`device-${content.id}`}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`flex items-center gap-3 p-3 bg-white rounded-lg border ${
                              snapshot.isDragging
                                ? 'border-indigo-500 shadow-lg'
                                : 'border-indigo-200'
                            } transition-all`}
                          >
                            <span className="text-lg font-bold text-indigo-400 w-6">
                              {index + 1}
                            </span>
                            <ContentThumbnail content={content} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 truncate">
                                {content.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {content.duration}초
                              </p>
                            </div>
                            <button
                              onClick={() => handleUnlink(content.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="연결 해제"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {linkedContents.length === 0 && (
                      <div className="text-center text-indigo-400 py-8">
                        <p>콘텐츠를 여기로 드래그하세요</p>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>

            {/* 콘텐츠 라이브러리 (드래그 가능) */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2">📚</span>
                콘텐츠 라이브러리
                <span className="ml-2 text-sm text-gray-500">
                  (드래그하여 연결)
                </span>
              </h4>
              <Droppable droppableId="library">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`rounded-xl p-3 min-h-[300px] max-h-[500px] overflow-y-auto space-y-2 transition-colors ${
                      snapshot.isDraggingOver
                        ? 'bg-emerald-50 border-2 border-dashed border-emerald-400'
                        : 'bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    {libraryContents
                      .filter(c => !linkedContents.some(lc => lc.id === c.id))
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
                              className={`flex items-center gap-3 p-3 bg-white rounded-lg border ${
                                snapshot.isDragging
                                  ? 'border-indigo-500 shadow-lg'
                                  : 'border-gray-200 hover:border-indigo-300'
                              } cursor-grab transition-all`}
                            >
                              <ContentThumbnail content={content} />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800 truncate">
                                  {content.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {content.duration}초
                                </p>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                    {libraryContents.filter(c => !linkedContents.some(lc => lc.id === c.id)).length === 0 && (
                      <div className="text-center text-gray-400 py-8">
                        연결 가능한 콘텐츠가 없습니다
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
          <p>디바이스를 선택하면 콘텐츠를 연결할 수 있습니다.</p>
        </div>
      )}
    </div>
  );
}
