'use client';

import { useState, useEffect } from 'react';
import { LayoutTemplateId, AreaContent, AdvancedLayoutData, LAYOUT_TEMPLATES } from '@/types/layout';
import TemplateSelector from './TemplateSelector';
import AreaEditor from './AreaEditor';
import LayoutPreview from './LayoutPreview';

interface LayoutEditorProps {
  initialData?: AdvancedLayoutData;
  onSave: (data: AdvancedLayoutData, name: string) => Promise<void>;
  onCancel?: () => void;
}

export default function LayoutEditor({ initialData, onSave, onCancel }: LayoutEditorProps) {
  const [templateId, setTemplateId] = useState<LayoutTemplateId>(
    initialData?.templateId || 'fullscreen'
  );
  const [areas, setAreas] = useState<Record<string, AreaContent>>(
    initialData?.areas || {}
  );
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  // 템플릿 변경 시 영역 초기화 (기존 데이터가 없는 경우)
  useEffect(() => {
    if (!initialData) {
      const template = LAYOUT_TEMPLATES[templateId];
      const newAreas: Record<string, AreaContent> = {};
      template.areas.forEach((area) => {
        newAreas[area.id] = { type: 'content', contents: [] };
      });
      setAreas(newAreas);
    }
  }, [templateId, initialData]);

  const handleTemplateChange = (newTemplateId: LayoutTemplateId) => {
    setTemplateId(newTemplateId);
    // 템플릿 변경 시 영역 초기화
    const template = LAYOUT_TEMPLATES[newTemplateId];
    const newAreas: Record<string, AreaContent> = {};
    template.areas.forEach((area) => {
      newAreas[area.id] = areas[area.id] || { type: 'content', contents: [] };
    });
    setAreas(newAreas);
  };

  const handleAreaChange = (areaId: string, content: AreaContent) => {
    setAreas((prev) => ({
      ...prev,
      [areaId]: content,
    }));
  };

  const handleSave = async () => {
    // 유효성 검사
    const template = LAYOUT_TEMPLATES[templateId];
    const hasContent = template.areas.some((area) => {
      const content = areas[area.id];
      if (!content) return false;
      if (content.type === 'widget') return true;
      if (content.type === 'content' && content.contents && content.contents.length > 0) return true;
      return false;
    });

    if (!hasContent) {
      alert('최소 하나의 영역에 콘텐츠나 위젯을 추가해주세요.');
      return;
    }

    if (!name.trim()) {
      alert('레이아웃 이름을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const layoutData: AdvancedLayoutData = {
        version: 2,
        templateId,
        areas,
      };
      await onSave(layoutData, name);
    } catch (error) {
      console.error('레이아웃 저장 실패:', error);
      alert('레이아웃 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const template = LAYOUT_TEMPLATES[templateId];

  return (
    <div className="space-y-6">
      {/* 레이아웃 이름 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">레이아웃 이름</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          placeholder="레이아웃 이름을 입력하세요"
        />
      </div>

      {/* 템플릿 선택 */}
      <TemplateSelector selected={templateId} onChange={handleTemplateChange} />

      <div className="grid grid-cols-2 gap-6">
        {/* 좌측: 영역별 편집 */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">영역별 콘텐츠 설정</h3>
          {template.areas.map((area) => (
            <AreaEditor
              key={area.id}
              area={area}
              content={areas[area.id]}
              onChange={(content) => handleAreaChange(area.id, content)}
            />
          ))}
        </div>

        {/* 우측: 미리보기 */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">미리보기</h3>
          <LayoutPreview templateId={templateId} areas={areas} />
        </div>
      </div>

      {/* 저장/취소 버튼 */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            disabled={saving}
          >
            취소
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
        >
          {saving ? '저장 중...' : '레이아웃 저장'}
        </button>
      </div>
    </div>
  );
}
