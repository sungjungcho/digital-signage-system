export type device = {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline';
  lastConnected?: string;
  createdAt: string;
  updatedAt: string;
};

export type devicecontent = {
  id: string;
  deviceId: string;
  type: 'image' | 'video' | 'text' | 'split_layout' | 'mixed';
  url?: string;
  text?: string;
  duration: number;
  fontSize?: string;
  fontColor?: string;
  backgroundColor?: string;
  alt?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  metadata?: string; // 유튜브, 복합형 등 추가 정보를 JSON으로 저장
  order: number;
  active: boolean;
  // 스케줄 필드
  scheduleType?: 'always' | 'specific_date' | 'days_of_week' | 'date_range';
  specificDate?: string; // "2026-01-15" (specific_date인 경우)
  daysOfWeek?: string; // "1,2,3,4,5" = 월~금 (days_of_week인 경우)
  startDate?: string; // 시작일 (date_range)
  endDate?: string;   // 종료일 (date_range)
  startTime?: string; // "09:00" - 시작 시간
  endTime?: string;   // "18:00" - 종료 시간
  createdAt: string;
  updatedAt: string;
}

export type TimeSlot = {
  id: string;
  scheduleId: string;
  startTime: string; // "09:00"
  endTime: string;   // "12:00"
  contentIds: string[]; // JSON array로 저장됨
  createdAt: string;
  updatedAt: string;
}

export type ContentSchedule = {
  id: string;
  deviceId: string;
  name: string; // "평일 아침 스케줄", "주말 종일" 등

  // 적용 범위
  scheduleType: 'once' | 'weekly' | 'weekdays' | 'weekends' | 'custom' | 'dateRange';

  // 날짜 설정 (scheduleType에 따라)
  specificDate?: string; // "2026-01-15" (once인 경우)
  daysOfWeek?: number[]; // [1,2,3,4,5] = 월~금 (weekly, custom) - JSON array로 저장됨
  startDate?: string; // 시작일 (dateRange)
  endDate?: string;   // 종료일 (dateRange)

  // 타임슬롯 배열 (JOIN으로 가져옴)
  timeSlots?: TimeSlot[];

  priority: number; // 겹칠 때 우선순위 (높을수록 우선)
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
