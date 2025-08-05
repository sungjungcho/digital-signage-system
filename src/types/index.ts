// 콘텐츠 타입 정의
export type ContentType = 'image' | 'video' | 'text';

// 기본 콘텐츠 인터페이스
export interface BaseContent {
  id: string;
  type: ContentType;
  duration: number; // 밀리초 단위
  createdAt: string; // ISO 문자열
  updatedAt: string; // ISO 문자열
}

// 이미지 콘텐츠
export interface ImageContent extends BaseContent {
  type: 'image';
  url: string;
  alt?: string;
}

// 비디오 콘텐츠
export interface VideoContent extends BaseContent {
  type: 'video';
  url: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
}

// 텍스트 콘텐츠
export interface TextContent extends BaseContent {
  type: 'text';
  text: string;
  fontSize?: string;
  fontColor?: string;
  backgroundColor?: string;
}

// 통합 콘텐츠 타입
export type Content = ImageContent | VideoContent | TextContent;

// 요일 타입
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// 스케줄 상태
export type ScheduleStatus = 'active' | 'inactive' | 'draft';

// 스케줄 인터페이스
export interface Schedule {
  id: string;
  name: string;
  description?: string;
  contents: Content[];
  startTime: string; // HH:mm 형식
  endTime: string; // HH:mm 형식
  days: DayOfWeek[]; // 0-6 (일요일-토요일)
  status: ScheduleStatus;
  priority: number; // 우선순위 (높을수록 우선)
  createdAt: string; // ISO 문자열
  updatedAt: string; // ISO 문자열
}

// 에러 타입
export interface ValidationError {
  field: string;
  message: string;
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
  message?: string;
}
