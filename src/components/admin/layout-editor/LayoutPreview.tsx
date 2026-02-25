'use client';

import { LayoutTemplateId, AreaContent, LAYOUT_TEMPLATES } from '@/types/layout';

interface LayoutPreviewProps {
  templateId: LayoutTemplateId;
  areas: Record<string, AreaContent>;
}

export default function LayoutPreview({ templateId, areas }: LayoutPreviewProps) {
  const template = LAYOUT_TEMPLATES[templateId];

  if (!template) {
    return (
      <div className="bg-gray-200 rounded-lg p-4 text-center text-gray-500">
        템플릿을 선택해주세요
      </div>
    );
  }

  const getAreaPreview = (areaId: string, areaName: string) => {
    const content = areas[areaId];

    if (!content) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-700 text-gray-400 text-xs">
          {areaName}
          <br />
          (비어있음)
        </div>
      );
    }

    if (content.type === 'widget') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-green-800 text-white text-xs p-2">
          <span className="text-green-300 mb-1">위젯</span>
          <span>{content.widgetType === 'datetime' ? '날짜/시간' : '대기환자'}</span>
        </div>
      );
    }

    if (content.type === 'content' && content.contents) {
      const count = content.contents.length;
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-blue-800 text-white text-xs p-2">
          <span className="text-blue-300 mb-1">콘텐츠</span>
          <span>{count}개 {count > 1 ? '순환' : ''}</span>
        </div>
      );
    }

    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-600 text-gray-300 text-xs">
        {areaName}
      </div>
    );
  };

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <div className="p-2 bg-gray-800 text-white text-xs text-center">
        미리보기 - {template.name}
      </div>
      <div
        className="grid aspect-video"
        style={{
          gridTemplateColumns: template.gridTemplate.columns,
          gridTemplateRows: template.gridTemplate.rows,
        }}
      >
        {template.areas.map((area) => (
          <div
            key={area.id}
            style={{
              gridRow: area.style.gridRow,
              gridColumn: area.style.gridColumn,
            }}
            className="border border-gray-700"
          >
            {getAreaPreview(area.id, area.name)}
          </div>
        ))}
      </div>
    </div>
  );
}
