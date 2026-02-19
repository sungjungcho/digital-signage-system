import { NextResponse } from 'next/server';
import { queryOne, queryAll } from '@/lib/db';

// UUID 형식인지 확인하는 함수
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// deviceId 또는 alias로 실제 deviceId 조회
async function getDeviceId(deviceIdOrAlias: string): Promise<string | null> {
  if (isUUID(deviceIdOrAlias)) {
    const device = await queryOne('SELECT id FROM device WHERE id = ?', [deviceIdOrAlias]) as any;
    return device?.id || null;
  }
  const device = await queryOne('SELECT id FROM device WHERE alias = ?', [deviceIdOrAlias]) as any;
  return device?.id || null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId: deviceIdOrAlias } = await params;

    // alias인 경우 실제 deviceId로 변환
    const deviceId = await getDeviceId(deviceIdOrAlias);
    if (!deviceId) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 1. 새 구조: device_content + content 테이블에서 조회 (테이블이 없으면 빈 배열)
    let newContents: any[] = [];
    try {
      newContents = await queryAll(`
        SELECT
          c.id,
          c.type,
          c.url,
          c.text,
          c.duration,
          c.fontSize,
          c.fontColor,
          c.backgroundColor,
          c.alt,
          c.autoplay,
          c.\`loop\`,
          c.muted,
          c.metadata,
          dc.\`order\`,
          dc.active,
          dc.scheduleType,
          dc.specificDate,
          dc.daysOfWeek,
          dc.startDate,
          dc.endDate,
          dc.startTime,
          dc.endTime,
          ? as deviceId
        FROM device_content dc
        JOIN content c ON dc.content_id = c.id
        WHERE dc.device_id = ? AND dc.active = 1
        ORDER BY dc.\`order\` ASC
      `, [deviceId, deviceId]) as any[];
    } catch {
      // 새 테이블이 아직 생성되지 않은 경우 무시
      newContents = [];
    }

    // 2. 기존 구조: devicecontent 테이블에서 조회 (하위 호환)
    const oldContents = await queryAll(`
      SELECT * FROM devicecontent
      WHERE deviceId = ? AND active = 1
      ORDER BY \`order\` ASC
    `, [deviceId]) as any[];

    // 3. 새 구조 콘텐츠 ID 목록 (중복 방지)
    const newContentIds = new Set(newContents.map(c => c.id));

    // 4. 기존 콘텐츠 중 새 구조에 없는 것만 추가
    const legacyContents = oldContents.filter(c => !newContentIds.has(c.id));

    // 5. 합치기 (새 구조 우선, 그 뒤에 기존 구조)
    const allContents = [...newContents, ...legacyContents];

    // 복합형 콘텐츠의 metadata를 elements로 파싱
    const processedContents = allContents.map(content => {
      if (content.type === 'mixed' && content.metadata) {
        try {
          const elements = JSON.parse(content.metadata);
          return {
            ...content,
            elements,
            metadata: undefined // metadata는 제거하고 elements만 사용
          };
        } catch (error) {
          console.error('복합형 콘텐츠 metadata 파싱 오류:', error);
          return content;
        }
      }
      return content;
    });

    return NextResponse.json(processedContents);
  } catch (error) {
    console.error('콘텐츠 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '콘텐츠 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
