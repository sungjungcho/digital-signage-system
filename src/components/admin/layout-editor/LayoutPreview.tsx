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
        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-xs">
          {areaName}
          <br />
          (비어있음)
        </div>
      );
    }

    if (content.type === 'widget') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-green-100 text-green-800 text-xs p-2">
          <span className="text-green-600 mb-1 font-medium">위젯</span>
          <span>{content.widgetType === 'datetime' ? '날짜/시간' : '대기환자'}</span>
        </div>
      );
    }

    if (content.type === 'content' && content.contents) {
      const count = content.contents.length;
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-blue-100 text-blue-800 text-xs p-2">
          <span className="text-blue-600 mb-1 font-medium">콘텐츠</span>
          <span>{count}개 {count > 1 ? '순환' : ''}</span>
        </div>
      );
    }

    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-xs">
        {areaName}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-300">
      <div className="p-2 bg-gray-700 text-white text-xs text-center">
        미리보기 - {template.name}
      </div>
      <div
        className="grid aspect-video bg-white p-1 gap-1"
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
            className="border-2 border-black"
          >
            {getAreaPreview(area.id, area.name)}
          </div>
        ))}
      </div>
    </div>
  );
}
