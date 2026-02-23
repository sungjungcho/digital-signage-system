import { NextRequest, NextResponse } from 'next/server';
import { queryAll } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET: 사용자의 모든 디바이스에 대한 월별 스케줄 데이터 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));

    // 사용자의 디바이스 목록 조회
    let devices: any[];
    if (user.role === 'superadmin') {
      devices = await queryAll('SELECT id, name FROM device', []) as any[];
    } else {
      devices = await queryAll(
        'SELECT id, name FROM device WHERE user_id = ?',
        [user.userId]
      ) as any[];
    }

    if (devices.length === 0) {
      return NextResponse.json({});
    }

    // 해당 월의 마지막 날
    const lastDay = new Date(year, month, 0);

    // 모든 디바이스의 연결된 콘텐츠 조회
    const deviceIds = devices.map(d => d.id);
    const deviceMap = new Map(devices.map(d => [d.id, d.name]));

    const placeholders = deviceIds.map(() => '?').join(',');

    // 1. 콘텐츠 연결 (device_content + content) 조회
    let linkedContents: any[] = [];
    try {
      linkedContents = await queryAll(`
        SELECT
          c.id,
          c.name,
          c.type,
          c.url,
          c.duration,
          dc.device_id as deviceId,
          dc.scheduleType,
          dc.specificDate,
          dc.daysOfWeek,
          dc.startDate,
          dc.endDate,
          dc.startTime,
          dc.endTime,
          dc.active,
          dc.\`order\`,
          'library' as source
        FROM device_content dc
        JOIN content c ON dc.content_id = c.id
        WHERE dc.device_id IN (${placeholders}) AND dc.active = 1
        ORDER BY dc.\`order\` ASC
      `, deviceIds) as any[];
    } catch {
      linkedContents = [];
    }

    // 2. 기존 콘텐츠 (devicecontent) 조회
    let legacyContents: any[] = [];
    try {
      legacyContents = await queryAll(`
        SELECT
          id,
          COALESCE(text, SUBSTRING_INDEX(url, '/', -1)) as name,
          type,
          url,
          duration,
          deviceId,
          scheduleType,
          specificDate,
          daysOfWeek,
          startDate,
          endDate,
          startTime,
          endTime,
          active,
          \`order\`,
          'legacy' as source
        FROM devicecontent
        WHERE deviceId IN (${placeholders}) AND active = 1
        ORDER BY \`order\` ASC
      `, deviceIds) as any[];
    } catch {
      legacyContents = [];
    }

    // 3. 두 결과 합치기
    const allContents = [...linkedContents, ...legacyContents];

    // 날짜별로 콘텐츠 그룹화
    const scheduleByDate: Record<string, any[]> = {};

    // 해당 월의 모든 날짜에 대해 처리
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay(); // 0: 일요일, 1: 월요일, ...

      const contentsForDay: any[] = [];

      for (const content of allContents) {
        let shouldInclude = false;

        switch (content.scheduleType) {
          case 'always':
            shouldInclude = true;
            break;

          case 'specific_date':
            if (content.specificDate === dateStr) {
              shouldInclude = true;
            }
            break;

          case 'days_of_week':
            if (content.daysOfWeek) {
              const days = content.daysOfWeek.split(',').map((d: string) => parseInt(d.trim()));
              if (days.includes(dayOfWeek)) {
                shouldInclude = true;
              }
            }
            break;

          case 'date_range':
            if (content.startDate && content.endDate) {
              if (dateStr >= content.startDate && dateStr <= content.endDate) {
                shouldInclude = true;
              }
            }
            break;

          default:
            shouldInclude = true;
        }

        if (shouldInclude) {
          contentsForDay.push({
            id: content.id,
            name: content.name || '(이름 없음)',
            type: content.type,
            url: content.url,
            duration: content.duration,
            deviceId: content.deviceId,
            deviceName: deviceMap.get(content.deviceId) || '알 수 없음',
            scheduleType: content.scheduleType,
            specificDate: content.specificDate,
            daysOfWeek: content.daysOfWeek,
            startDate: content.startDate,
            endDate: content.endDate,
            startTime: content.startTime,
            endTime: content.endTime,
            active: content.active,
            source: content.source // 'library' 또는 'legacy'
          });
        }
      }

      if (contentsForDay.length > 0) {
        scheduleByDate[dateStr] = contentsForDay;
      }
    }

    return NextResponse.json(scheduleByDate);
  } catch (error) {
    console.error('스케줄 조회 오류:', error);
    return NextResponse.json(
      { error: '스케줄 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
