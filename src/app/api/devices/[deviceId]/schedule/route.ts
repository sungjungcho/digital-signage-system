import { NextRequest, NextResponse } from 'next/server';
import { queryOne, queryAll } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET: 디바이스의 월별 스케줄 데이터 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { deviceId } = await params;
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));

    // 디바이스 존재 확인
    const device = await queryOne(
      'SELECT * FROM device WHERE id = ? OR alias = ?',
      [deviceId, deviceId]
    ) as any;

    if (!device) {
      return NextResponse.json({ error: '디바이스를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 권한 확인
    if (user.role !== 'superadmin' && device.user_id !== user.userId) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    // 해당 월의 첫째 날과 마지막 날
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const firstDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

    // 연결된 콘텐츠 조회 (content 테이블과 JOIN)
    const linkedContents = await queryAll(`
      SELECT
        c.id,
        c.name,
        c.type,
        c.url,
        c.duration,
        dc.scheduleType,
        dc.specificDate,
        dc.daysOfWeek,
        dc.startDate,
        dc.endDate,
        dc.startTime,
        dc.endTime,
        dc.active,
        dc.\`order\`
      FROM device_content dc
      JOIN content c ON dc.content_id = c.id
      WHERE dc.device_id = ? AND dc.active = 1
      ORDER BY dc.\`order\` ASC
    `, [device.id]) as any[];

    // 날짜별로 콘텐츠 그룹화
    const scheduleByDate: Record<string, any[]> = {};

    // 해당 월의 모든 날짜에 대해 처리
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay(); // 0: 일요일, 1: 월요일, ...

      const contentsForDay: any[] = [];

      for (const content of linkedContents) {
        let shouldInclude = false;

        switch (content.scheduleType) {
          case 'always':
            // 항상 표시
            shouldInclude = true;
            break;

          case 'specific_date':
            // 특정 날짜에만 표시
            if (content.specificDate === dateStr) {
              shouldInclude = true;
            }
            break;

          case 'days_of_week':
            // 요일별 표시 (daysOfWeek: "0,1,2,3,4,5,6" 형식)
            if (content.daysOfWeek) {
              const days = content.daysOfWeek.split(',').map((d: string) => parseInt(d.trim()));
              if (days.includes(dayOfWeek)) {
                shouldInclude = true;
              }
            }
            break;

          case 'date_range':
            // 기간 내 표시
            if (content.startDate && content.endDate) {
              if (dateStr >= content.startDate && dateStr <= content.endDate) {
                shouldInclude = true;
              }
            }
            break;

          default:
            // 기본: 항상 표시
            shouldInclude = true;
        }

        if (shouldInclude) {
          contentsForDay.push({
            id: content.id,
            name: content.name,
            type: content.type,
            url: content.url,
            duration: content.duration,
            scheduleType: content.scheduleType,
            specificDate: content.specificDate,
            daysOfWeek: content.daysOfWeek,
            startDate: content.startDate,
            endDate: content.endDate,
            startTime: content.startTime,
            endTime: content.endTime,
            active: content.active
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
