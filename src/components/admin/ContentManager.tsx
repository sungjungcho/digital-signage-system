'use client';

import { useState, useRef, useEffect } from 'react';
import { Device, DeviceContent } from '@/types/device';

interface ContentManagerProps {
  device: Device;
}

export default function ContentManager({ device }: ContentManagerProps) {
  const [contents, setContents] = useState<DeviceContent[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contentType, setContentType] = useState<'image' | 'video' | 'text'>('text');
  const [textContent, setTextContent] = useState({
    text: '',
    duration: 5000,
    fontSize: '2rem',
    fontColor: '#ffffff',
    backgroundColor: '#000000',
  });

  // 디바이스가 선택되면 해당 디바이스의 콘텐츠 목록을 가져옴
  useEffect(() => {
    if (device) {
      fetchContents();
    }
  }, [device]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setSelectedFile(files[0]);
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

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // TODO: 실제 API 호출로 대체
      const response = await fetch('/api/contents/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: device.id,
          ...textContent,
        }),
      });

      if (response.ok) {
        setTextContent({
          text: '',
          duration: 5000,
          fontSize: '2rem',
          fontColor: '#ffffff',
          backgroundColor: '#000000',
        });
        // TODO: 콘텐츠 목록 새로고침
        fetchContents();
      }
    } catch (error) {
      console.error('텍스트 콘텐츠 등록 중 오류 발생:', error);
    }
  };

  const fetchContents = async () => {
    try {
      console.log('콘텐츠 목록 가져오기 시작:', device.id);
      const response = await fetch(`/api/devices/${device.id}/contents`);
      const data = await response.json();
      console.log('가져온 콘텐츠 데이터:', data);
      setContents(data);
    } catch (error) {
      console.error('콘텐츠 목록을 가져오는 중 오류 발생:', error);
      setContents([]);
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
            onChange={(e) => setContentType(e.target.value as 'image' | 'video' | 'text')}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="text">텍스트</option>
            <option value="image">이미지</option>
            <option value="video">비디오</option>
          </select>
        </div>

        {contentType === 'text' ? (
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
              텍스트 추가
            </button>
          </form>
        ) : (
          <div className="mt-4 space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept={contentType === 'image' ? 'image/*' : 'video/*'}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
            />
            {selectedFile && (
              <button
                onClick={handleFileUpload}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {contentType === 'image' ? '이미지 업로드' : '비디오 업로드'}
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
                  ) : (
                    <>
                      <p className="font-medium break-words">{content.type === 'image' ? '이미지' : '비디오'}</p>
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
                  <div className="text-sm text-gray-500">
                    <span>재생 시간: {content.duration}ms</span>
                    <span className="ml-3">순서: {content.order + 1}번째</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // TODO: 콘텐츠 삭제 기능 구현
                  }}
                  className="text-red-600 hover:text-red-800"
                >
                  삭제
                </button>
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
