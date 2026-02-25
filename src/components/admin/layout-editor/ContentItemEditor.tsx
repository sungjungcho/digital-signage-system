'use client';

import { useState } from 'react';
import { LayoutContentItem } from '@/types/layout';

interface ContentItemEditorProps {
  onAdd: (item: LayoutContentItem) => void;
  onCancel?: () => void;
}

export default function ContentItemEditor({ onAdd, onCancel }: ContentItemEditorProps) {
  const [type, setType] = useState<'text' | 'image' | 'video' | 'youtube'>('text');
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState('24');
  const [fontColor, setFontColor] = useState('#ffffff');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState({ hours: 0, minutes: 0, seconds: 5 });

  const getDurationMs = () => {
    return (duration.hours * 3600 + duration.minutes * 60 + duration.seconds) * 1000;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleAdd = async () => {
    // 유효성 검사
    if (type === 'text' && !text.trim()) {
      alert('텍스트를 입력해주세요.');
      return;
    }
    if (type === 'youtube' && !url.trim()) {
      alert('유튜브 URL을 입력해주세요.');
      return;
    }
    if ((type === 'image' || type === 'video') && !file && !url) {
      alert('파일을 선택하거나 URL을 입력해주세요.');
      return;
    }

    let finalUrl = url;

    // 파일 업로드 처리
    if (file && (type === 'image' || type === 'video')) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('skipDbInsert', 'true');

      try {
        const response = await fetch('/api/contents/upload', {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) throw new Error('파일 업로드 실패');
        const data = await response.json();
        finalUrl = data.url;
      } catch (error) {
        alert('파일 업로드에 실패했습니다.');
        return;
      }
    }

    // 유튜브 URL 처리
    if (type === 'youtube' && url && !url.startsWith('youtube:')) {
      finalUrl = 'youtube:' + url;
    }

    const newItem: LayoutContentItem = {
      id: String(Date.now()),
      type,
      duration: getDurationMs(),
      ...(type === 'text' && {
        text,
        fontSize: fontSize + 'px',
        fontColor,
        backgroundColor,
      }),
      ...((type === 'image' || type === 'video' || type === 'youtube') && {
        url: finalUrl,
      }),
      ...(type === 'youtube' && {
        metadata: {
          youtubeType: 'video',
          autoplay: true,
          loop: true,
          mute: true,
        },
      }),
    };

    onAdd(newItem);

    // 폼 초기화
    setText('');
    setUrl('');
    setFile(null);
    setDuration({ hours: 0, minutes: 0, seconds: 5 });
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">콘텐츠 타입:</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as any)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="text">텍스트</option>
          <option value="image">이미지</option>
          <option value="video">동영상</option>
          <option value="youtube">유튜브</option>
        </select>
      </div>

      {/* 텍스트 입력 */}
      {type === 'text' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">텍스트</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              rows={3}
              placeholder="표시할 텍스트를 입력하세요"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">글자 크기 (px)</label>
              <input
                type="number"
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
                min="12"
                max="200"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">글자 색상</label>
              <input
                type="color"
                value={fontColor}
                onChange={(e) => setFontColor(e.target.value)}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">배경 색상</label>
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* 이미지/동영상 파일 업로드 */}
      {(type === 'image' || type === 'video') && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">파일 선택</label>
            <input
              type="file"
              accept={type === 'image' ? 'image/*' : 'video/*'}
              onChange={handleFileChange}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">또는 URL 입력</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder={type === 'image' ? '이미지 URL' : '동영상 URL'}
            />
          </div>
        </div>
      )}

      {/* 유튜브 URL */}
      {type === 'youtube' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">유튜브 URL</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>
      )}

      {/* 표시 시간 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">표시 시간</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={duration.hours}
            onChange={(e) => setDuration({ ...duration, hours: parseInt(e.target.value) || 0 })}
            className="w-16 border rounded px-2 py-1 text-sm text-center"
            min="0"
          />
          <span className="text-sm text-gray-600">시간</span>
          <input
            type="number"
            value={duration.minutes}
            onChange={(e) => setDuration({ ...duration, minutes: parseInt(e.target.value) || 0 })}
            className="w-16 border rounded px-2 py-1 text-sm text-center"
            min="0"
            max="59"
          />
          <span className="text-sm text-gray-600">분</span>
          <input
            type="number"
            value={duration.seconds}
            onChange={(e) => setDuration({ ...duration, seconds: parseInt(e.target.value) || 0 })}
            className="w-16 border rounded px-2 py-1 text-sm text-center"
            min="0"
            max="59"
          />
          <span className="text-sm text-gray-600">초</span>
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
          >
            취소
          </button>
        )}
        <button
          onClick={handleAdd}
          className="px-4 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded"
        >
          추가
        </button>
      </div>
    </div>
  );
}
