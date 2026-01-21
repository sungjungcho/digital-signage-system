'use client';

import { useState, useEffect } from 'react';

export interface ScheduleData {
  scheduleType: 'always' | 'specific_date' | 'days_of_week' | 'date_range';
  specificDate?: string;
  daysOfWeek?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
}

interface ScheduleSettingsProps {
  value: ScheduleData;
  onChange: (data: ScheduleData) => void;
  showLabel?: boolean;
}

export default function ScheduleSettings({ value, onChange, showLabel = true }: ScheduleSettingsProps) {
  const [scheduleType, setScheduleType] = useState<ScheduleData['scheduleType']>(value.scheduleType || 'always');
  const [specificDate, setSpecificDate] = useState(value.specificDate || '');
  const [selectedDays, setSelectedDays] = useState<number[]>(
    value.daysOfWeek ? value.daysOfWeek.split(',').map(d => parseInt(d)) : []
  );
  const [startDate, setStartDate] = useState(value.startDate || '');
  const [endDate, setEndDate] = useState(value.endDate || '');
  const [startTime, setStartTime] = useState(value.startTime || '');
  const [endTime, setEndTime] = useState(value.endTime || '');

  // 캘린더 상태
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];

  useEffect(() => {
    const newData: ScheduleData = {
      scheduleType,
      specificDate: scheduleType === 'specific_date' ? specificDate : undefined,
      daysOfWeek: scheduleType === 'days_of_week' ? selectedDays.join(',') : undefined,
      startDate: scheduleType === 'date_range' ? startDate : undefined,
      endDate: scheduleType === 'date_range' ? endDate : undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
    };
    onChange(newData);
  }, [scheduleType, specificDate, selectedDays, startDate, endDate, startTime, endTime]);

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const selectWeekdays = () => {
    setSelectedDays([1, 2, 3, 4, 5]);
  };

  const selectWeekend = () => {
    setSelectedDays([0, 6]);
  };

  // 캘린더 관련 함수들
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDateString = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const isDateSelected = (dateStr: string) => {
    if (scheduleType === 'specific_date') {
      return specificDate === dateStr;
    } else if (scheduleType === 'date_range') {
      if (!startDate && !endDate) return false;
      if (startDate && !endDate) return dateStr === startDate;
      if (!startDate && endDate) return dateStr === endDate;
      return dateStr >= startDate && dateStr <= endDate;
    }
    return false;
  };

  const isDateInRange = (dateStr: string) => {
    if (scheduleType === 'date_range' && startDate && endDate) {
      return dateStr > startDate && dateStr < endDate;
    }
    return false;
  };

  const isDateRangeStart = (dateStr: string) => {
    return scheduleType === 'date_range' && dateStr === startDate;
  };

  const isDateRangeEnd = (dateStr: string) => {
    return scheduleType === 'date_range' && dateStr === endDate;
  };

  const handleDateClick = (dateStr: string) => {
    if (scheduleType === 'specific_date') {
      setSpecificDate(dateStr);
    } else if (scheduleType === 'date_range') {
      if (!startDate || (startDate && endDate)) {
        // 새로운 범위 시작
        setStartDate(dateStr);
        setEndDate('');
      } else if (startDate && !endDate) {
        // 범위 종료
        if (dateStr >= startDate) {
          setEndDate(dateStr);
        } else {
          // 시작보다 이전 날짜를 클릭하면 시작을 변경
          setStartDate(dateStr);
        }
      }
    }
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days = [];
    const today = new Date();
    const todayStr = formatDateString(today.getFullYear(), today.getMonth(), today.getDate());

    // 빈 칸 추가 (이전 달 마지막 날들)
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    // 현재 달의 날짜들
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateString(currentYear, currentMonth, day);
      const isToday = dateStr === todayStr;
      const isSelected = isDateSelected(dateStr);
      const isInRange = isDateInRange(dateStr);
      const isRangeStart = isDateRangeStart(dateStr);
      const isRangeEnd = isDateRangeEnd(dateStr);

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDateClick(dateStr)}
          className={`
            aspect-square p-3 text-base rounded-lg transition-all relative flex items-center justify-center
            ${isToday ? 'font-bold' : ''}
            ${isSelected && !isInRange ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
            ${isRangeStart ? 'bg-blue-500 text-white rounded-r-none' : ''}
            ${isRangeEnd ? 'bg-blue-500 text-white rounded-l-none' : ''}
            ${isInRange ? 'bg-blue-100 text-blue-900 rounded-none' : ''}
            ${!isSelected && !isInRange && !isRangeStart && !isRangeEnd ? 'hover:bg-gray-100' : ''}
            ${isToday && !isSelected && !isInRange ? 'ring-2 ring-blue-400' : ''}
          `}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="space-y-4">
      {showLabel && (
        <label className="block text-base font-medium text-gray-700 mb-2">
          스케줄 설정
        </label>
      )}

      {/* 스케줄 타입 선택 */}
      <div className="space-y-2">
        <label className="block text-base text-gray-600">표시 기간</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setScheduleType('always')}
            className={`px-4 py-2 rounded-lg text-base font-medium transition-colors ${
              scheduleType === 'always'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            항상 표시
          </button>
          <button
            type="button"
            onClick={() => setScheduleType('specific_date')}
            className={`px-4 py-2 rounded-lg text-base font-medium transition-colors ${
              scheduleType === 'specific_date'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            특정 날짜
          </button>
          <button
            type="button"
            onClick={() => setScheduleType('days_of_week')}
            className={`px-4 py-2 rounded-lg text-base font-medium transition-colors ${
              scheduleType === 'days_of_week'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            특정 요일
          </button>
          <button
            type="button"
            onClick={() => setScheduleType('date_range')}
            className={`px-4 py-2 rounded-lg text-base font-medium transition-colors ${
              scheduleType === 'date_range'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            기간 설정
          </button>
        </div>
      </div>

      {/* 캘린더 (특정 날짜 또는 기간 설정) */}
      {(scheduleType === 'specific_date' || scheduleType === 'date_range') && (
        <div className="flex gap-4 items-start">
          <div className="border border-gray-300 rounded-lg p-4 bg-white w-96">
            {/* 캘린더 헤더 */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-base font-semibold">
                  {currentYear}년 {currentMonth + 1}월
                </span>
                <button
                  type="button"
                  onClick={goToToday}
                  className="px-2 py-0.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  오늘
                </button>
              </div>

              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {dayLabels.map((label, index) => (
                <div
                  key={index}
                  className={`text-center text-sm font-semibold py-1 ${
                    index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-600'
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* 캘린더 날짜들 */}
            <div className="grid grid-cols-7 gap-1.5">
              {renderCalendar()}
            </div>

            {/* 선택된 날짜 표시 */}
            {scheduleType === 'specific_date' && specificDate && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-base text-blue-800">
                  선택된 날짜: <span className="font-semibold">{specificDate}</span>
                </p>
              </div>
            )}

            {scheduleType === 'date_range' && (startDate || endDate) && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-base text-blue-800">
                  {startDate && !endDate && `시작일: ${startDate} (종료일을 선택하세요)`}
                  {startDate && endDate && `기간: ${startDate} ~ ${endDate}`}
                </p>
                {startDate && endDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="mt-2 text-base text-red-600 hover:text-red-800"
                  >
                    선택 초기화
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 시간 범위 설정 */}
          <div className="border border-gray-300 rounded-lg p-6 bg-white w-80">
            <label className="block text-base font-medium text-gray-700 mb-4">시간 범위 (선택사항)</label>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-base text-gray-600">시작 시간</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-base text-gray-600">종료 시간</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-base text-gray-500 pt-2">
                * 시간을 설정하지 않으면 하루 종일 표시됩니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 특정 요일 */}
      {scheduleType === 'days_of_week' && (
        <div className="flex gap-6 items-start">
          <div className="border border-gray-300 rounded-lg p-6 bg-white flex-1">
            <label className="block text-base font-medium text-gray-700 mb-4">요일 선택</label>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={selectWeekdays}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                평일
              </button>
              <button
                type="button"
                onClick={selectWeekend}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                주말
              </button>
            </div>
            <div className="flex gap-2">
              {dayLabels.map((label, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleDay(index)}
                  className={`flex-1 py-3 rounded-lg text-base font-medium transition-colors ${
                    selectedDays.includes(index)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 시간 범위 설정 */}
          <div className="border border-gray-300 rounded-lg p-6 bg-white w-80">
            <label className="block text-base font-medium text-gray-700 mb-4">시간 범위 (선택사항)</label>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-base text-gray-600">시작 시간</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-base text-gray-600">종료 시간</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-base text-gray-500 pt-2">
                * 시간을 설정하지 않으면 하루 종일 표시됩니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
