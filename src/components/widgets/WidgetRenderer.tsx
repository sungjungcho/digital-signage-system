'use client';

import { WidgetType } from '@/types/layout';
import DateTimeWidget from '../DateTimeWidget';
import WaitingListWidget from '../WaitingListWidget';

interface WidgetRendererProps {
  widgetType: WidgetType;
  deviceId?: string;
  config?: {
    showSeconds?: boolean;
  };
}

export default function WidgetRenderer({ widgetType, deviceId, config }: WidgetRendererProps) {
  switch (widgetType) {
    case 'datetime':
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <DateTimeWidget />
        </div>
      );

    case 'waiting_list':
      return (
        <div className="w-full h-full bg-gray-100 p-2 overflow-hidden">
          <WaitingListWidget deviceId={deviceId || ''} className="h-full" />
        </div>
      );

    default:
      return (
        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
          <p className="text-gray-500">알 수 없는 위젯</p>
        </div>
      );
  }
}
