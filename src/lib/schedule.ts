import { type Content, type Schedule, type DayOfWeek, type ImageContent, type VideoContent, type TextContent } from '@/types';

// 현재 시간에 맞는 콘텐츠를 가져오는 함수
export function getCurrentSchedule(schedules: Schedule[]): Schedule | null {
  const now = new Date();
  const currentDay = now.getDay() as DayOfWeek;
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

  return (
    schedules.find((schedule) => {
      // 상태 확인
      if (schedule.status !== 'active') {
        return false;
      }

      // 요일 확인
      if (!schedule.days.includes(currentDay)) {
        return false;
      }

      // 시간 확인
      return schedule.startTime <= currentTime && currentTime < schedule.endTime;
    }) || null
  );
}

// 시간 형식이 올바른지 확인하는 함수 (HH:mm)
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
}

// 스케줄 유효성 검사
export function validateSchedule(schedule: Schedule): boolean {
  // 필수 필드 확인
  if (
    !schedule.id ||
    !schedule.name ||
    !schedule.startTime ||
    !schedule.endTime ||
    !schedule.days ||
    !schedule.status ||
    typeof schedule.priority !== 'number'
  ) {
    return false;
  }

  // 시간 형식 확인
  if (!isValidTimeFormat(schedule.startTime) || !isValidTimeFormat(schedule.endTime)) {
    return false;
  }

  // 요일 유효성 확인
  if (!schedule.days.every((day) => day >= 0 && day <= 6)) {
    return false;
  }

  // 날짜 형식 확인
  if (!schedule.createdAt || !schedule.updatedAt) {
    return false;
  }

  // 콘텐츠 유효성 확인
  return schedule.contents.every(validateContent);
}

// 콘텐츠 유효성 검사
export function validateContent(content: Content): boolean {
  // 공통 필드 확인
  if (!content.id || !content.duration || !content.createdAt || !content.updatedAt) {
    return false;
  }

  // 타입별 필수 필드 확인
  switch (content.type) {
    case 'image':
      return Boolean((content as ImageContent).url);
    case 'video':
      return Boolean((content as VideoContent).url);
    case 'text':
      return Boolean((content as TextContent).text);
    default:
      return false;
  }
}
