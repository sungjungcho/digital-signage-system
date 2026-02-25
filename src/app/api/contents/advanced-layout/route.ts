import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { queryAll, execute } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { AdvancedLayoutData, LayoutContentItem, LayoutTemplateId, LAYOUT_TEMPLATES } from '@/types/layout';

// 총 duration 계산 (모든 영역 중 최대 duration)
function calculateTotalDuration(layoutData: AdvancedLayoutData): number {
  let maxDuration = 0;

  for (const areaId in layoutData.areas) {
    const area = layoutData.areas[areaId];
    if (area.type === 'content' && area.contents) {
      const areaDuration = area.contents.reduce(
        (sum: number, item: LayoutContentItem) => sum + (item.duration || 5000),
        0
      );
      maxDuration = Math.max(maxDuration, areaDuration);
    }
  }

  // 최소 5초
  return maxDuration > 0 ? maxDuration : 5000;
}

// POST: 새 고급 레이아웃 콘텐츠 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const data = await request.json();
    const { layoutData, name, deviceId } = data;

    // 유효성 검사
    if (!layoutData || !layoutData.templateId) {
      return NextResponse.json(
        { error: '레이아웃 데이터가 필요합니다.' },
        { status: 400 }
      );
    }

    // 템플릿 존재 여부 확인
    const templateId = layoutData.templateId as LayoutTemplateId;
    if (!LAYOUT_TEMPLATES[templateId]) {
      return NextResponse.json(
        { error: '유효하지 않은 레이아웃 템플릿입니다.' },
        { status: 400 }
      );
    }

    // 최소 하나의 영역에 콘텐츠가 있는지 확인
    const hasContent = Object.values(layoutData.areas || {}).some((area: any) => {
      if (area.type === 'widget') return true;
      if (area.type === 'content' && area.contents && area.contents.length > 0) return true;
      return false;
    });

    if (!hasContent) {
      return NextResponse.json(
        { error: '최소 하나의 영역에 콘텐츠나 위젯이 필요합니다.' },
        { status: 400 }
      );
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const totalDuration = calculateTotalDuration(layoutData);

    // 콘텐츠 라이브러리에 저장 (content 테이블)
    await execute(
      `INSERT INTO content (
        id, name, type, text, duration, metadata, user_id, createdAt, updatedAt
      ) VALUES (?, ?, 'advanced_layout', ?, ?, NULL, ?, ?, ?)`,
      [
        id,
        name || '고급 레이아웃',
        JSON.stringify(layoutData),
        Math.ceil(totalDuration / 1000), // 초 단위로 저장
        user.userId,
        now,
        now,
      ]
    );

    // deviceId가 있으면 해당 디바이스에도 연결
    if (deviceId) {
      const deviceContentId = randomUUID();

      // 현재 최대 order 조회
      const maxOrderResult = await queryAll(
        'SELECT MAX(`order`) as maxOrder FROM devicecontent WHERE deviceId = ?',
        [deviceId]
      ) as any[];
      const maxOrder = maxOrderResult[0]?.maxOrder ?? -1;

      await execute(
        `INSERT INTO devicecontent (
          id, deviceId, type, text, duration, metadata, \`order\`, active,
          scheduleType, createdAt, updatedAt
        ) VALUES (?, ?, 'advanced_layout', ?, ?, NULL, ?, 1, 'always', ?, ?)`,
        [
          deviceContentId,
          deviceId,
          JSON.stringify(layoutData),
          totalDuration,
          maxOrder + 1,
          now,
          now,
        ]
      );
    }

    return NextResponse.json({
      success: true,
      id,
      message: '고급 레이아웃이 생성되었습니다.',
    });
  } catch (error) {
    console.error('고급 레이아웃 생성 오류:', error);
    return NextResponse.json(
      { error: '고급 레이아웃 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// GET: 고급 레이아웃 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    let query = "SELECT * FROM content WHERE type = 'advanced_layout'";
    const params: any[] = [];

    // 슈퍼관리자가 아니면 자신의 콘텐츠만 조회
    if (user.role !== 'superadmin') {
      query += ' AND user_id = ?';
      params.push(user.userId);
    }

    query += ' ORDER BY createdAt DESC';

    const contents = await queryAll(query, params);

    return NextResponse.json(contents);
  } catch (error) {
    console.error('고급 레이아웃 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '고급 레이아웃 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
