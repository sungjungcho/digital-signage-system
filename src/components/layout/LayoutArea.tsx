'use client';

import { LayoutArea as LayoutAreaType, AreaContent } from '@/types/layout';
import ContentCarousel from './ContentCarousel';
import WidgetRenderer from '../widgets/WidgetRenderer';

interface LayoutAreaProps {
  area: LayoutAreaType;
  content?: AreaContent;
  deviceId?: string;
}

export default function LayoutArea({ area, content, deviceId }: LayoutAreaProps) {
  // 콘텐츠가 없는 경우
  if (!content) {
    return (
      <div
        style={{
          gridRow: area.style.gridRow,
          gridColumn: area.style.gridColumn,
        }}
        className="bg-gray-800 flex items-center justify-center"
      >
        <p className="text-gray-500 text-sm">{area.name} - 콘텐츠 없음</p>
      </div>
    );
  }

  return (
    <div
      style={{
        gridRow: area.style.gridRow,
        gridColumn: area.style.gridColumn,
      }}
      className="overflow-hidden"
    >
      {content.type === 'widget' && content.widgetType ? (
        <WidgetRenderer
          widgetType={content.widgetType}
          deviceId={deviceId}
          config={content.widgetConfig}
        />
      ) : content.type === 'content' && content.contents ? (
        <ContentCarousel
          contents={content.contents}
          deviceId={deviceId}
        />
      ) : (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
          <p className="text-gray-500 text-sm">잘못된 콘텐츠 구성</p>
        </div>
      )}
    </div>
  );
}
