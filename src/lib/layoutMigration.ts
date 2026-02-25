import { AdvancedLayoutData, LayoutContentItem } from '@/types/layout';

/**
 * 기존 split_layout 데이터를 advanced_layout 형식으로 변환
 *
 * @param leftContents - 기존 split_layout의 leftContents 배열
 * @param showNotices - 우측에 대기환자 명단 표시 여부
 * @returns AdvancedLayoutData 형식의 새 데이터
 */
export function migrateSplitLayoutToAdvanced(
  leftContents: any[],
  showNotices: boolean = true
): AdvancedLayoutData {
  // leftContents를 새 형식으로 변환
  const contents: LayoutContentItem[] = leftContents.map((item: any) => ({
    id: item.id || String(Date.now() + Math.random()),
    type: item.type === 'youtube' ? 'youtube' : item.type,
    duration: item.duration || 5000,
    url: item.url,
    text: item.text,
    fontSize: item.fontSize,
    fontColor: item.fontColor,
    backgroundColor: item.backgroundColor,
    metadata: item.type === 'youtube' ? {
      youtubeType: 'video',
      autoplay: true,
      loop: true,
      mute: true,
    } : undefined,
  }));

  return {
    version: 2,
    templateId: 'split_h_2_1', // 기존 2:1 비율 레이아웃
    areas: {
      'area-0': {
        type: 'content',
        contents,
      },
      'area-1': {
        type: 'widget',
        widgetType: showNotices ? 'waiting_list' : 'datetime',
      },
    },
  };
}

/**
 * devicecontent 레코드에서 split_layout 데이터를 파싱하고 변환
 *
 * @param textField - devicecontent.text 필드 (JSON 문자열)
 * @param metadataField - devicecontent.metadata 필드 (JSON 문자열)
 * @returns AdvancedLayoutData 형식의 새 데이터
 */
export function parseAndMigrateSplitLayout(
  textField: string | null,
  metadataField: string | null
): AdvancedLayoutData {
  const leftContents = textField ? JSON.parse(textField) : [];
  const metadata = metadataField ? JSON.parse(metadataField) : { showNotices: true };

  return migrateSplitLayoutToAdvanced(leftContents, metadata.showNotices ?? true);
}

/**
 * 데이터가 이미 advanced_layout 형식인지 확인
 */
export function isAdvancedLayoutData(data: any): data is AdvancedLayoutData {
  return (
    data &&
    typeof data === 'object' &&
    data.version === 2 &&
    typeof data.templateId === 'string' &&
    typeof data.areas === 'object'
  );
}
