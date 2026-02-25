'use client';

import { AdvancedLayoutData, LAYOUT_TEMPLATES } from '@/types/layout';
import LayoutArea from './LayoutArea';

interface AdvancedLayoutDisplayProps {
  data: AdvancedLayoutData;
  deviceId?: string;
}

export default function AdvancedLayoutDisplay({ data, deviceId }: AdvancedLayoutDisplayProps) {
  const template = LAYOUT_TEMPLATES[data.templateId];

  if (!template) {
    return (
      <div className="w-full h-full bg-red-900 flex items-center justify-center">
        <p className="text-white text-xl">알 수 없는 레이아웃 템플릿: {data.templateId}</p>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full grid"
      style={{
        gridTemplateColumns: template.gridTemplate.columns,
        gridTemplateRows: template.gridTemplate.rows,
      }}
    >
      {template.areas.map((area) => (
        <LayoutArea
          key={area.id}
          area={area}
          content={data.areas[area.id]}
          deviceId={deviceId}
        />
      ))}
    </div>
  );
}
