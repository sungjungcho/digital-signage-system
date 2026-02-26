// 레이아웃 템플릿 ID 타입
export type LayoutTemplateId =
  | 'fullscreen'       // 전체화면 (1x1)
  | 'split_h_1_1'      // 2분할 좌우 (1:1)
  | 'split_v_1_1'      // 2분할 상하 (1:1)
  | 'grid_2x2'         // 4분할 그리드 (2x2)
  | 'left_2_right_1'   // 2+1 좌측 (좌측 상하 2개 + 우측 1개)
  | 'left_1_right_2'   // 1+2 우측 (좌측 1개 + 우측 상하 2개)
  | 'top_1_bottom_2'   // 1+2 하단 (상단 1개 + 하단 좌우 2개)
  | 'top_2_bottom_1'   // 2+1 하단 (상단 좌우 2개 + 하단 1개)
  | 'split_h_2_1'      // 2분할 좌우 (2:1) - 기존 호환용
  | 'split_h_1_2';     // 2분할 좌우 (1:2)

// 위젯 타입
export type WidgetType = 'datetime' | 'waiting_list';

// 레이아웃 영역 정의
export interface LayoutArea {
  id: string;           // 영역 고유 ID (예: 'area-0', 'area-1')
  name: string;         // 영역 이름 (예: '좌측', '우측 상단')
  style: {
    gridRow: string;
    gridColumn: string;
  };
}

// 레이아웃 템플릿 정의
export interface LayoutTemplate {
  id: LayoutTemplateId;
  name: string;                    // 사용자에게 표시될 이름
  description: string;             // 설명
  areas: LayoutArea[];             // 영역 목록
  gridTemplate: {
    columns: string;               // grid-template-columns (예: '2fr 1fr')
    rows: string;                  // grid-template-rows (예: '1fr 1fr')
  };
}

// 콘텐츠 아이템 (순환용)
export interface LayoutContentItem {
  id: string;
  type: 'image' | 'video' | 'text' | 'youtube';
  duration: number;           // ms 단위
  // 콘텐츠 타입별 속성
  url?: string;               // image, video, youtube
  text?: string;              // text
  fontSize?: string;          // text
  fontColor?: string;         // text
  backgroundColor?: string;   // text, image
  metadata?: {                // youtube 등 추가 정보
    youtubeType?: 'video' | 'live' | 'playlist';
    autoplay?: boolean;
    loop?: boolean;
    mute?: boolean;
  };
}

// 영역 콘텐츠 정의 (콘텐츠 순환 또는 위젯)
export interface AreaContent {
  type: 'content' | 'widget';
  // type === 'content'인 경우
  contents?: LayoutContentItem[];  // 순환할 콘텐츠 배열
  // type === 'widget'인 경우
  widgetType?: WidgetType;
  widgetConfig?: {                 // 위젯별 설정
    showSeconds?: boolean;         // datetime 위젯
  };
}

// 고급 레이아웃 콘텐츠 (devicecontent에 저장될 전체 구조)
export interface AdvancedLayoutData {
  version: 2;                              // 데이터 버전 (마이그레이션용)
  templateId: LayoutTemplateId;            // 사용 중인 레이아웃 템플릿
  areas: {
    [areaId: string]: AreaContent;         // 영역별 콘텐츠 매핑
  };
}

// 레이아웃 템플릿 상수
export const LAYOUT_TEMPLATES: Record<LayoutTemplateId, LayoutTemplate> = {
  fullscreen: {
    id: 'fullscreen',
    name: '전체화면',
    description: '콘텐츠를 전체 화면에 표시',
    areas: [
      { id: 'area-0', name: '전체', style: { gridRow: '1', gridColumn: '1' } }
    ],
    gridTemplate: { columns: '1fr', rows: '1fr' },
  },
  split_h_1_1: {
    id: 'split_h_1_1',
    name: '2분할 좌우 (1:1)',
    description: '좌우 동일 비율로 분할',
    areas: [
      { id: 'area-0', name: '좌측', style: { gridRow: '1', gridColumn: '1' } },
      { id: 'area-1', name: '우측', style: { gridRow: '1', gridColumn: '2' } }
    ],
    gridTemplate: { columns: '1fr 1fr', rows: '1fr' },
  },
  split_v_1_1: {
    id: 'split_v_1_1',
    name: '2분할 상하 (1:1)',
    description: '상하 동일 비율로 분할',
    areas: [
      { id: 'area-0', name: '상단', style: { gridRow: '1', gridColumn: '1' } },
      { id: 'area-1', name: '하단', style: { gridRow: '2', gridColumn: '1' } }
    ],
    gridTemplate: { columns: '1fr', rows: '1fr 1fr' },
  },
  grid_2x2: {
    id: 'grid_2x2',
    name: '4분할 그리드',
    description: '2x2 그리드로 4개 영역 분할',
    areas: [
      { id: 'area-0', name: '좌측 상단', style: { gridRow: '1', gridColumn: '1' } },
      { id: 'area-1', name: '우측 상단', style: { gridRow: '1', gridColumn: '2' } },
      { id: 'area-2', name: '좌측 하단', style: { gridRow: '2', gridColumn: '1' } },
      { id: 'area-3', name: '우측 하단', style: { gridRow: '2', gridColumn: '2' } }
    ],
    gridTemplate: { columns: '1fr 1fr', rows: '1fr 1fr' },
  },
  left_2_right_1: {
    id: 'left_2_right_1',
    name: '2+1 좌측',
    description: '좌측 상하 2개 + 우측 1개',
    areas: [
      { id: 'area-0', name: '좌측 상단', style: { gridRow: '1', gridColumn: '1' } },
      { id: 'area-1', name: '좌측 하단', style: { gridRow: '2', gridColumn: '1' } },
      { id: 'area-2', name: '우측', style: { gridRow: '1 / 3', gridColumn: '2' } }
    ],
    gridTemplate: { columns: '1fr 1fr', rows: '1fr 1fr' },
  },
  left_1_right_2: {
    id: 'left_1_right_2',
    name: '1+2 우측',
    description: '좌측 1개 + 우측 상하 2개',
    areas: [
      { id: 'area-0', name: '좌측', style: { gridRow: '1 / 3', gridColumn: '1' } },
      { id: 'area-1', name: '우측 상단', style: { gridRow: '1', gridColumn: '2' } },
      { id: 'area-2', name: '우측 하단', style: { gridRow: '2', gridColumn: '2' } }
    ],
    gridTemplate: { columns: '1fr 1fr', rows: '1fr 1fr' },
  },
  top_1_bottom_2: {
    id: 'top_1_bottom_2',
    name: '1+2 하단',
    description: '상단 1개 + 하단 좌우 2개',
    areas: [
      { id: 'area-0', name: '상단', style: { gridRow: '1', gridColumn: '1 / 3' } },
      { id: 'area-1', name: '하단 좌측', style: { gridRow: '2', gridColumn: '1' } },
      { id: 'area-2', name: '하단 우측', style: { gridRow: '2', gridColumn: '2' } }
    ],
    gridTemplate: { columns: '1fr 1fr', rows: '1fr 1fr' },
  },
  top_2_bottom_1: {
    id: 'top_2_bottom_1',
    name: '2+1 하단',
    description: '상단 좌우 2개 + 하단 1개',
    areas: [
      { id: 'area-0', name: '상단 좌측', style: { gridRow: '1', gridColumn: '1' } },
      { id: 'area-1', name: '상단 우측', style: { gridRow: '1', gridColumn: '2' } },
      { id: 'area-2', name: '하단', style: { gridRow: '2', gridColumn: '1 / 3' } }
    ],
    gridTemplate: { columns: '1fr 1fr', rows: '1fr 1fr' },
  },
  split_h_2_1: {
    id: 'split_h_2_1',
    name: '2분할 좌우 (2:1)',
    description: '좌측 넓게, 우측 좁게 (기존 분할 레이아웃 호환)',
    areas: [
      { id: 'area-0', name: '좌측', style: { gridRow: '1', gridColumn: '1' } },
      { id: 'area-1', name: '우측', style: { gridRow: '1', gridColumn: '2' } }
    ],
    gridTemplate: { columns: '2fr 1fr', rows: '1fr' },
  },
  split_h_1_2: {
    id: 'split_h_1_2',
    name: '2분할 좌우 (1:2)',
    description: '좌측 좁게, 우측 넓게',
    areas: [
      { id: 'area-0', name: '좌측', style: { gridRow: '1', gridColumn: '1' } },
      { id: 'area-1', name: '우측', style: { gridRow: '1', gridColumn: '2' } }
    ],
    gridTemplate: { columns: '1fr 2fr', rows: '1fr' },
  },
};

// 템플릿 목록 배열 (UI에서 사용)
export const LAYOUT_TEMPLATE_LIST = Object.values(LAYOUT_TEMPLATES);
