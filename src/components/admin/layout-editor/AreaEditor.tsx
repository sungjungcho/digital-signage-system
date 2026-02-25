'use client';

import { useState } from 'react';
import { LayoutArea, AreaContent, LayoutContentItem, WidgetType } from '@/types/layout';
import ContentItemEditor from './ContentItemEditor';

interface AreaEditorProps {
  area: LayoutArea;
  content?: AreaContent;
  onChange: (content: AreaContent) => void;
}

const WIDGET_OPTIONS: { value: WidgetType; label: string }[] = [
  { value: 'datetime', label: '날짜/시간' },
  { value: 'waiting_list', label: '대기환자 명단' },
];

export default function AreaEditor({ area, content, onChange }: AreaEditorProps) {
  const [showAddContent, setShowAddContent] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const contentType = content?.type || 'content';
  const contents = content?.contents || [];
  const widgetType = content?.widgetType || 'datetime';

  const handleTypeChange = (type: 'content' | 'widget') => {
    if (type === 'widget') {
      onChange({ type: 'widget', widgetType: 'datetime' });
    } else {
      onChange({ type: 'content', contents: [] });
    }
  };

  const handleWidgetChange = (widgetType: WidgetType) => {
    onChange({ type: 'widget', widgetType });
  };

  const handleAddContent = (item: LayoutContentItem) => {
    const newContents = [...contents, item];
    onChange({ type: 'content', contents: newContents });
    setShowAddContent(false);
  };

  const handleRemoveContent = (itemId: string) => {
    const newContents = contents.filter((c) => c.id !== itemId);
    onChange({ type: 'content', contents: newContents });
  };

  const handleMoveContent = (itemId: string, direction: 'up' | 'down') => {
    const index = contents.findIndex((c) => c.id === itemId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= contents.length) return;

    const newContents = [...contents];
    [newContents[index], newContents[newIndex]] = [newContents[newIndex], newContents[index]];
    onChange({ type: 'content', contents: newContents });
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}시간 ${minutes}분 ${secs}초`;
    } else if (minutes > 0) {
      return `${minutes}분 ${secs}초`;
    }
    return `${secs}초`;
  };

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'text': return '텍스트';
      case 'image': return '이미지';
      case 'video': return '동영상';
      case 'youtube': return '유튜브';
      default: return type;
    }
  };

  const getContentPreview = (item: LayoutContentItem) => {
    switch (item.type) {
      case 'text':
        return item.text?.slice(0, 20) + (item.text && item.text.length > 20 ? '...' : '');
      case 'image':
      case 'video':
      case 'youtube':
        return item.url?.split('/').pop()?.slice(0, 20) || item.url?.slice(0, 30);
      default:
        return '-';
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-800">{area.name}</h4>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">타입:</label>
          <select
            value={contentType}
            onChange={(e) => handleTypeChange(e.target.value as 'content' | 'widget')}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="content">콘텐츠</option>
            <option value="widget">위젯</option>
          </select>
        </div>
      </div>

      {contentType === 'widget' ? (
        <div className="space-y-2">
          <label className="text-sm text-gray-600">위젯 선택:</label>
          <select
            value={widgetType}
            onChange={(e) => handleWidgetChange(e.target.value as WidgetType)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            {WIDGET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="space-y-3">
          {/* 콘텐츠 목록 */}
          {contents.length > 0 && (
            <div className="space-y-2">
              {contents.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-gray-50 rounded px-3 py-2"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      {getContentTypeLabel(item.type)}
                    </span>
                    <span className="text-sm text-gray-600 truncate">
                      {getContentPreview(item)}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({formatDuration(item.duration)})
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveContent(item.id, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title="위로 이동"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleMoveContent(item.id, 'down')}
                      disabled={index === contents.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title="아래로 이동"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => handleRemoveContent(item.id)}
                      className="p-1 text-red-400 hover:text-red-600"
                      title="삭제"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 콘텐츠 추가 버튼 / 폼 */}
          {showAddContent ? (
            <ContentItemEditor
              onAdd={handleAddContent}
              onCancel={() => setShowAddContent(false)}
            />
          ) : (
            <button
              onClick={() => setShowAddContent(true)}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
            >
              + 콘텐츠 추가
            </button>
          )}

          {contents.length > 1 && (
            <p className="text-xs text-gray-500">
              * 여러 콘텐츠가 있으면 순환하며 표시됩니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
