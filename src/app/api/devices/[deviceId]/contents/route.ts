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
  req: Request,
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

    // 데이터베이스에서 디바이스별 콘텐츠 목록 조회
    const deviceContents = await queryAll(`
      SELECT * FROM devicecontent
      WHERE deviceId = ? AND active = 1
      ORDER BY \`order\` ASC
    `, [deviceId]) as any[];

    // 복합형 콘텐츠의 metadata를 elements로 파싱
    const processedContents = deviceContents.map(content => {
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
