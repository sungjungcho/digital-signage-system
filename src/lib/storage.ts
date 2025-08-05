import { type Schedule } from '@/types';

// localStorage에서 스케줄 데이터를 가져오는 함수
export function getStoredSchedules(): Schedule[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem('schedules');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('스케줄 데이터를 불러오는 중 오류가 발생했습니다:', error);
    return [];
  }
}

// localStorage에 스케줄 데이터를 저장하는 함수
export function storeSchedules(schedules: Schedule[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('schedules', JSON.stringify(schedules));
  } catch (error) {
    console.error('스케줄 데이터를 저장하는 중 오류가 발생했습니다:', error);
  }
}

// 새로운 스케줄을 추가하는 함수
export function addSchedule(schedule: Schedule): void {
  const schedules = getStoredSchedules();
  schedules.push(schedule);
  storeSchedules(schedules);
}

// 스케줄을 수정하는 함수
export function updateSchedule(updatedSchedule: Schedule): void {
  const schedules = getStoredSchedules();
  const index = schedules.findIndex((s) => s.id === updatedSchedule.id);
  
  if (index !== -1) {
    schedules[index] = updatedSchedule;
    storeSchedules(schedules);
  }
}

// 스케줄을 삭제하는 함수
export function deleteSchedule(scheduleId: string): void {
  const schedules = getStoredSchedules();
  const filteredSchedules = schedules.filter((s) => s.id !== scheduleId);
  storeSchedules(filteredSchedules);
}
