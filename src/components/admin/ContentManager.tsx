'use client';

import { useState, useRef, useEffect } from 'react';
import type { device as Device, devicecontent as DeviceContent } from '@/types/device';

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
    fontSize: '2rem',
    fontColor: '#ffffff',
    backgroundColor: '#000000',
  });
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

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
          fontSize: '2rem',
          fontColor: '#ffffff',
          backgroundColor: '#000000',
        });
      });
    }
  }, [device]);

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

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    try {
      const formData = new FormData();
      formData.append('deviceId', device.id);
      formData.append('file', selectedFile);
      formData.append('type', contentType);

      const response = await fetch('/api/contents/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
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
        }),
      });

      if (response.ok) {
        setYoutubeUrl('');
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
          }),
        });
      }
      if (response.ok) {
        setTextContent({
          text: '',
          duration: 5000,
          fontSize: '2rem',
          fontColor: '#ffffff',
          backgroundColor: '#000000',
        });
        setEditingTextId(null);
        fetchContents();
      }
    } catch (error) {
      console.error('텍스트 콘텐츠 등록/수정 중 오류 발생:', error);
    }
  };

  const handleEditContent = (content: DeviceContent) => {
    if (content.type === 'text') {
      setContentType('text');
      setTextContent({
        text: content.text ?? '',
        duration: content.duration ?? 5000,
        fontSize: content.fontSize ?? '2rem',
        fontColor: content.fontColor ?? '#ffffff',
        backgroundColor: content.backgroundColor ?? '#000000',
      });
      setEditingTextId(content.id);
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
      setContents([]);
      return [];
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium">디바이스: {device.name}</h3>
          <p className="text-sm text-gray-500">위치: {device.location}</p>
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
            href={`/device/${device.id}`}
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

      <div>
        <h3 className="text-lg font-medium">새 콘텐츠 추가</h3>
        <div className="mt-4">
          <select
            value={contentType}
            onChange={(e) => {
              setContentType(e.target.value as 'image' | 'video' | 'text' | 'split_layout');
              setEditingTextId(null);
              setTextContent({
                text: '',
                duration: 5000,
                fontSize: '2rem',
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
            <h4 className="font-semibold text-blue-800 mb-2">분할 레이아웃 설정</h4>
            <p className="text-sm text-blue-600 mb-4">
              이 레이아웃은 화면을 좌측(콘텐츠)과 우측(날짜/시간 + 대기환자 명단)으로 분할합니다.
              좌측에는 기존에 등록된 모든 콘텐츠가 순환 표시되고, 우측에는 실시간 정보가 표시됩니다.
            </p>
            <button
              onClick={async () => {
                try {
                  console.log('분할 레이아웃 추가 시작:', device.id);
                  const response = await fetch('/api/contents/splitlayout', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      deviceId: device.id,
                      duration: 10000, // 10초간 표시
                    }),
                  });

                  console.log('응답 상태:', response.status);

                  if (response.ok) {
                    const data = await response.json();
                    console.log('분할 레이아웃 추가 성공:', data);
                    alert('분할 레이아웃이 추가되었습니다!');
                    fetchContents();
                  } else {
                    const error = await response.json();
                    console.error('분할 레이아웃 추가 실패:', error);
                    alert(`분할 레이아웃 추가 실패: ${error.error || '알 수 없는 오류'}`);
                  }
                } catch (error) {
                  console.error('분할 레이아웃 콘텐츠 등록 중 오류 발생:', error);
                  alert('오류가 발생했습니다. 콘솔을 확인해주세요.');
                }
              }}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              분할 레이아웃 추가
            </button>
          </div>
        ) : contentType === 'text' ? (
          <form onSubmit={handleTextSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="text" className="block text-sm font-medium text-gray-700">
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                  표시 시간 (ms)
                </label>
                <input
                  type="number"
                  id="duration"
                  value={textContent.duration}
                  onChange={(e) => setTextContent((prev) => ({ ...prev, duration: Number(e.target.value) }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="fontSize" className="block text-sm font-medium text-gray-700">
                  글자 크기
                </label>
                <input
                  type="text"
                  id="fontSize"
                  value={textContent.fontSize}
                  onChange={(e) => setTextContent((prev) => ({ ...prev, fontSize: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="fontColor" className="block text-sm font-medium text-gray-700">
                  글자 색상
                </label>
                <input
                  type="color"
                  id="fontColor"
                  value={textContent.fontColor}
                  onChange={(e) => setTextContent((prev) => ({ ...prev, fontColor: e.target.value }))}
                  className="mt-1 block w-full"
                  required
                />
              </div>
              <div>
                <label htmlFor="backgroundColor" className="block text-sm font-medium text-gray-700">
                  배경 색상
                </label>
                <input
                  type="color"
                  id="backgroundColor"
                  value={textContent.backgroundColor}
                  onChange={(e) => setTextContent((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                  className="mt-1 block w-full"
                  required
                />
              </div>
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
                    fontSize: '2rem',
                    fontColor: '#ffffff',
                    backgroundColor: '#000000',
                  });
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
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                />
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    유튜브 URL
                  </label>
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... 또는 재생목록 URL"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    단일 영상, 재생목록 모두 지원됩니다
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">재생 옵션</label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={youtubeOptions.autoplay}
                        onChange={(e) => setYoutubeOptions(prev => ({ ...prev, autoplay: e.target.checked }))}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">자동 재생</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={youtubeOptions.loop}
                        onChange={(e) => setYoutubeOptions(prev => ({ ...prev, loop: e.target.checked }))}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">반복 재생</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={youtubeOptions.mute}
                        onChange={(e) => setYoutubeOptions(prev => ({ ...prev, mute: e.target.checked }))}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">음소거</span>
                    </label>
                  </div>
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
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
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

      <div>
        <h3 className="text-lg font-medium">등록된 콘텐츠</h3>
        <div className="mt-4 space-y-4">
          {contents.length > 0 ? (
            contents.map((content) => (
              <div
                key={content.id}
                className="flex items-center justify-between border rounded-lg p-4"
              >
                <div className="space-y-2 flex-grow mr-4">
                  {content.type === 'text' ? (
                    <>
                      <p className="font-medium break-words">{content.text}</p>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className="text-gray-600">글자 크기: {content.fontSize}</span>
                        <span className="text-gray-600">글자 색상: {content.fontColor}</span>
                        <span className="text-gray-600">배경 색상: {content.backgroundColor}</span>
                      </div>
                    </>
                  ) : content.type === 'split_layout' ? (
                    <>
                      <p className="font-medium break-words">분할 레이아웃</p>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className="text-gray-600">좌측: 기존 콘텐츠</span>
                        <span className="text-gray-600">우측: 날짜/시간 + 대기환자</span>
                      </div>
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
                                    <span className="text-gray-600">
                                      {metadata.youtubeType === 'playlist' ? '재생목록' : '단일 영상'}
                                    </span>
                                    <span className="text-gray-600">{metadata.autoplay ? '자동 재생' : '수동 재생'}</span>
                                    <span className="text-gray-600">{metadata.loop ? '반복 재생' : '1회 재생'}</span>
                                    <span className="text-gray-600">{metadata.mute ? '음소거' : '소리 있음'}</span>
                                  </>
                                );
                              } catch {
                                return <span className="text-gray-600">설정 정보 없음</span>;
                              }
                            })()}
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="font-medium break-words">{content.type === 'image' ? '이미지' : '동영상'}</p>
                          <div className="flex flex-wrap gap-2 text-sm">
                            <span className="text-gray-600">파일: {content.url}</span>
                            {content.type === 'video' && (
                              <>
                                <span className="text-gray-600">{content.autoplay ? '자동 재생' : '수동 재생'}</span>
                                <span className="text-gray-600">{content.loop ? '반복 재생' : '1회 재생'}</span>
                                <span className="text-gray-600">{content.muted ? '음소거' : '소리 있음'}</span>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  )}
                  <div className="text-sm text-gray-500">
                    <span>재생 시간: {content.duration}ms</span>
                    <span className="ml-3">순서: {content.order + 1}번째</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {content.type === 'text' ? (
                    <button
                      onClick={() => handleEditContent(content)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      수정
                    </button>
                  ) : content.type !== 'split_layout' && (
                    <button
                      onClick={() => {
                        const newDuration = prompt(`재생 시간을 입력하세요 (밀리초, 현재: ${content.duration}ms):`, String(content.duration));
                        if (newDuration && !isNaN(Number(newDuration))) {
                          handleUpdateDuration(content.id, Number(newDuration));
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      수정
                    </button>
                  )}
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
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">등록된 콘텐츠가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
