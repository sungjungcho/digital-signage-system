import { devicecontent } from '@/types/device';

/**
 * 현재 시간에 표시해야 하는 콘텐츠인지 확인
 */
export function shouldDisplayContent(content: devicecontent, now: Date = new Date()): boolean {
  // scheduleType이 없거나 'always'면 항상 표시
  if (!content.scheduleType || content.scheduleType === 'always') {
    return true;
  }

  const currentDate = now.toISOString().split('T')[0]; // "2026-01-18"
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; // "14:30"
  const currentDayOfWeek = now.getDay(); // 0(일) ~ 6(토)

  // 시간 범위 체크 (startTime, endTime이 있는 경우)
  if (content.startTime && content.endTime) {
    if (currentTime < content.startTime || currentTime >= content.endTime) {
      return false;
    }
  }

  // scheduleType별 처리
  switch (content.scheduleType) {
    case 'specific_date':
      // 특정 날짜에만 표시
      if (!content.specificDate) return false;
      return currentDate === content.specificDate;

    case 'days_of_week':
      // 특정 요일에만 표시
      if (!content.daysOfWeek) return false;
      const allowedDays = content.daysOfWeek.split(',').map(d => parseInt(d.trim()));
      return allowedDays.includes(currentDayOfWeek);

    case 'date_range':
      // 날짜 범위 내에만 표시
      if (!content.startDate || !content.endDate) return false;
      return currentDate >= content.startDate && currentDate <= content.endDate;

    default:
      return true;
  }
}

/**
 * 콘텐츠 배열에서 현재 표시해야 하는 콘텐츠만 필터링
 */
export function filterContentsBySchedule(contents: devicecontent[], now: Date = new Date()): devicecontent[] {
  return contents.filter(content => shouldDisplayContent(content, now));
}

/**
 * 스케줄 타입 표시 텍스트 반환
 */
export function getScheduleTypeLabel(scheduleType?: string): string {
  switch (scheduleType) {
    case 'always':
      return '항상 표시';
    case 'specific_date':
      return '특정 날짜';
    case 'days_of_week':
      return '특정 요일';
    case 'date_range':
      return '기간 설정';
    default:
      return '항상 표시';
  }
}

/**
 * 요일 번호를 한글로 변환
 */
export function getDayOfWeekLabel(day: number): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[day] || '';
}

/**
 * daysOfWeek 문자열을 표시용 텍스트로 변환
 */
export function formatDaysOfWeek(daysOfWeek?: string): string {
  if (!daysOfWeek) return '';

  const days = daysOfWeek.split(',').map(d => parseInt(d.trim()));

  // 평일 (1,2,3,4,5)
  if (days.length === 5 && days.every(d => d >= 1 && d <= 5)) {
    return '평일';
  }

  // 주말 (0,6)
  if (days.length === 2 && days.includes(0) && days.includes(6)) {
    return '주말';
  }

  // 개별 요일 표시
  return days.map(getDayOfWeekLabel).join(', ');
}

/**
 * 스케줄 정보를 한 줄로 표시
 */
export function formatScheduleInfo(content: devicecontent): string {
  if (!content.scheduleType || content.scheduleType === 'always') {
    return '항상 표시';
  }

  const parts: string[] = [];

  // 날짜 정보
  switch (content.scheduleType) {
    case 'specific_date':
      parts.push(content.specificDate || '');
      break;
    case 'days_of_week':
      parts.push(formatDaysOfWeek(content.daysOfWeek));
      break;
    case 'date_range':
      parts.push(`${content.startDate} ~ ${content.endDate}`);
      break;
  }

  // 시간 정보
  if (content.startTime && content.endTime) {
    parts.push(`${content.startTime} ~ ${content.endTime}`);
  }

  return parts.join(' | ') || '항상 표시';
}
