'use client';

import { useState, useEffect } from 'react';

// 날짜 문자열을 Date 객체로 변환
const parseDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// Date 객체를 날짜 문자열로 변환
const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const HOLIDAY_SEPARATOR = ' / ';

const splitHolidayNames = (holidayName: string): string[] => {
  return holidayName.split(HOLIDAY_SEPARATOR).map(name => name.trim()).filter(Boolean);
};

// 대체공휴일 계산
const addSubstituteHolidays = (holidays: Record<string, string>): Record<string, string> => {
  const result = { ...holidays };

  const holidayDates = Object.keys(holidays);
  const addedSubstituteLabels = new Set<string>();

  const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;
  const isSunday = (date: Date) => date.getDay() === 0;
  const isWeekday = (date: Date) => !isWeekend(date);
  const hasMultipleHolidayNames = (dateStr: string) => splitHolidayNames(holidays[dateStr] || '').length > 1;

  const addSubstituteHoliday = (triggerDate: Date, label: string) => {
    if (addedSubstituteLabels.has(label)) return;

    // 공휴일 다음 첫 번째 비공휴일(토/일 제외) 찾기
    const substituteDate = new Date(triggerDate);
    substituteDate.setDate(substituteDate.getDate() + 1);

    while (result[formatDate(substituteDate)] || isWeekend(substituteDate)) {
      substituteDate.setDate(substituteDate.getDate() + 1);
    }

    result[formatDate(substituteDate)] = `대체공휴일(${label})`;
    addedSubstituteLabels.add(label);
  };

  // 설날/추석은 연휴 단위로 1회만 대체공휴일 계산
  const lunarHolidayGroups = [
    { keyword: '설날', label: '설날' },
    { keyword: '추석', label: '추석' },
  ];

  for (const { keyword, label } of lunarHolidayGroups) {
    const groupDates = holidayDates.filter(dateStr => holidays[dateStr].includes(keyword));
    if (groupDates.length === 0) continue;

    const triggerBySunday = groupDates.find(dateStr => isSunday(parseDate(dateStr)));
    const triggerByWeekdayOverlap = groupDates.find(dateStr => {
      const date = parseDate(dateStr);
      return isWeekday(date) && hasMultipleHolidayNames(dateStr);
    });

    const triggerDateStr = triggerBySunday || triggerByWeekdayOverlap;
    if (triggerDateStr) {
      addSubstituteHoliday(parseDate(triggerDateStr), label);
    }
  }

  // 단일 공휴일 대체공휴일 계산
  const singleHolidayTargets = ['어린이날', '삼일절', '광복절', '개천절', '한글날', '부처님오신날', '기독탄신일', '크리스마스', '제헌절'];

  for (const dateStr of holidayDates) {
    const holidayNames = splitHolidayNames(holidays[dateStr]);
    const targetName = singleHolidayTargets.find(target =>
      holidayNames.some(name => name.includes(target))
    );
    if (!targetName) continue;

    const date = parseDate(dateStr);
    const shouldSubstitute = isWeekend(date) || (isWeekday(date) && holidayNames.length > 1);
    if (shouldSubstitute) {
      addSubstituteHoliday(date, targetName);
    }
  }

  return result;
};

// 한국 공휴일 데이터 (고정 공휴일 + 음력 공휴일은 연도별로 다름)
const getKoreanHolidays = (year: number): Record<string, string> => {
  const holidays: Record<string, string> = {};

  const addHoliday = (dateStr: string, holidayName: string) => {
    const existing = holidays[dateStr];
    if (!existing) {
      holidays[dateStr] = holidayName;
      return;
    }

    const names = splitHolidayNames(existing);
    if (!names.includes(holidayName)) {
      holidays[dateStr] = `${existing}${HOLIDAY_SEPARATOR}${holidayName}`;
    }
  };

  // 고정 공휴일
  addHoliday(`${year}-01-01`, '신정');
  addHoliday(`${year}-03-01`, '삼일절');
  addHoliday(`${year}-05-05`, '어린이날');
  addHoliday(`${year}-06-06`, '현충일');
  addHoliday(`${year}-08-15`, '광복절');
  addHoliday(`${year}-10-03`, '개천절');
  addHoliday(`${year}-10-09`, '한글날');
  addHoliday(`${year}-12-25`, '크리스마스');

  // 2026년부터 제헌절 공휴일 복원
  if (year >= 2026) {
    addHoliday(`${year}-07-17`, '제헌절');
  }

  // 음력 기반 공휴일 (연도별 - 2024~2030년)
  const lunarHolidays: Record<number, Record<string, string>> = {
    2024: {
      '2024-02-09': '설날 연휴',
      '2024-02-10': '설날',
      '2024-02-11': '설날 연휴',
      '2024-05-15': '부처님오신날',
      '2024-09-16': '추석 연휴',
      '2024-09-17': '추석',
      '2024-09-18': '추석 연휴',
    },
    2025: {
      '2025-01-28': '설날 연휴',
      '2025-01-29': '설날',
      '2025-01-30': '설날 연휴',
      '2025-05-05': '부처님오신날',
      '2025-10-05': '추석 연휴',
      '2025-10-06': '추석',
      '2025-10-07': '추석 연휴',
    },
    2026: {
      '2026-02-16': '설날 연휴',
      '2026-02-17': '설날',
      '2026-02-18': '설날 연휴',
      '2026-05-24': '부처님오신날',
      '2026-09-24': '추석 연휴',
      '2026-09-25': '추석',
      '2026-09-26': '추석 연휴',
    },
    2027: {
      '2027-02-06': '설날 연휴',
      '2027-02-07': '설날',
      '2027-02-08': '설날 연휴',
      '2027-05-13': '부처님오신날',
      '2027-09-14': '추석 연휴',
      '2027-09-15': '추석',
      '2027-09-16': '추석 연휴',
    },
    2028: {
      '2028-01-26': '설날 연휴',
      '2028-01-27': '설날',
      '2028-01-28': '설날 연휴',
      '2028-05-02': '부처님오신날',
      '2028-10-02': '추석 연휴',
      '2028-10-03': '추석',
      '2028-10-04': '추석 연휴',
    },
    2029: {
      '2029-02-12': '설날 연휴',
      '2029-02-13': '설날',
      '2029-02-14': '설날 연휴',
      '2029-05-20': '부처님오신날',
      '2029-09-21': '추석 연휴',
      '2029-09-22': '추석',
      '2029-09-23': '추석 연휴',
    },
    2030: {
      '2030-02-02': '설날 연휴',
      '2030-02-03': '설날',
      '2030-02-04': '설날 연휴',
      '2030-05-09': '부처님오신날',
      '2030-09-11': '추석 연휴',
      '2030-09-12': '추석',
      '2030-09-13': '추석 연휴',
    },
  };

  if (lunarHolidays[year]) {
    for (const [dateStr, holidayName] of Object.entries(lunarHolidays[year])) {
      addHoliday(dateStr, holidayName);
    }
  }

  // 대체공휴일 자동 계산
  return addSubstituteHolidays(holidays);
};

type ScheduledContent = {
  id: string;
  name: string;
  type: string;
  url: string | null;
  duration: number;
  deviceId: string;
  deviceName: string;
  scheduleType: string;
  specificDate: string | null;
  daysOfWeek: string | null;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  active: number;
  source: 'library' | 'legacy';
};

export default function ScheduleViewer() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleData, setScheduleData] = useState<Record<string, ScheduledContent[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDayContents, setSelectedDayContents] = useState<ScheduledContent[] | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // 스케줄 데이터 조회
  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const response = await fetch(
          `/api/schedule?year=${year}&month=${month}`
        );
        if (response.ok) {
          const data = await response.json();
          setScheduleData(data);
        }
      } catch (error) {
        console.error('스케줄 조회 오류:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [currentDate]);

  // 이전 달로 이동
  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDayContents(null);
    setSelectedDay(null);
  };

  // 다음 달로 이동
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDayContents(null);
    setSelectedDay(null);
  };

  // 오늘로 이동
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDayContents(null);
    setSelectedDay(null);
  };

  // 달력 날짜 생성
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: (number | null)[] = [];

    // 이전 달 빈 칸
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // 현재 달 날짜
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  // 날짜 클릭 핸들러
  const handleDayClick = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const contents = scheduleData[dateStr] || [];
    setSelectedDayContents(contents);
    setSelectedDay(dateStr);
  };

  // 타입별 아이콘
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return '🖼️';
      case 'video': return '🎬';
      case 'text': return '📝';
      default: return '📄';
    }
  };

  // 스케줄 타입 표시
  const getScheduleTypeLabel = (scheduleType: string) => {
    switch (scheduleType) {
      case 'always': return '항상';
      case 'specific_date': return '특정 날짜';
      case 'days_of_week': return '요일별';
      case 'date_range': return '기간';
      default: return scheduleType;
    }
  };

  // 요일 이름
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  // 오늘 날짜 확인
  const today = new Date();
  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  // 해당 날짜에 콘텐츠가 있는지 확인
  const getContentsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return scheduleData[dateStr] || [];
  };

  // 공휴일 데이터
  const holidays = getKoreanHolidays(currentDate.getFullYear());

  // 해당 날짜가 공휴일인지 확인
  const getHoliday = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays[dateStr] || null;
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-indigo-100">
      <h3 className="text-2xl font-bold text-indigo-800 mb-6 flex items-center">
        <span className="mr-2">📅</span>
        스케줄 조회
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 캘린더 영역 */}
        <div className="lg:col-span-2">
          {/* 캘린더 헤더 */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPrevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center space-x-4">
              <h4 className="text-xl font-bold text-gray-800">
                {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
              </h4>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition"
              >
                오늘
              </button>
            </div>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 캘린더 그리드 */}
          <div className="bg-gray-50 rounded-xl overflow-hidden">
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 bg-indigo-600 text-white">
              {dayNames.map((day, index) => (
                <div
                  key={day}
                  className={`py-2 text-center font-medium text-sm ${
                    index === 0 ? 'text-red-200' : index === 6 ? 'text-blue-200' : ''
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            {loading ? (
              <div className="py-20 text-center text-gray-500">
                로딩 중...
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                  const contents = day ? getContentsForDay(day) : [];
                  const dayOfWeek = index % 7;
                  const dateStr = day
                    ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    : '';

                  const holiday = day ? getHoliday(day) : null;
                  const isHoliday = !!holiday;

                  return (
                    <div
                      key={index}
                      className={`min-h-[130px] border-b border-r border-gray-200 p-1.5 ${
                        day ? 'cursor-pointer hover:bg-indigo-50 transition' : 'bg-gray-100'
                      } ${selectedDay === dateStr ? 'bg-indigo-100' : ''}`}
                      onClick={() => day && handleDayClick(day)}
                    >
                      {day && (
                        <>
                          <div className="flex items-center gap-1 mb-1">
                            <div
                              className={`text-sm font-medium ${
                                isToday(day)
                                  ? 'bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs'
                                  : dayOfWeek === 0 || isHoliday
                                  ? 'text-red-500'
                                  : dayOfWeek === 6
                                  ? 'text-blue-500'
                                  : 'text-gray-700'
                              }`}
                            >
                              {day}
                            </div>
                            {holiday && (
                              <span className="text-[10px] text-red-500 truncate">
                                {holiday}
                              </span>
                            )}
                          </div>
                          {contents.length > 0 && (
                            <div className="space-y-0.5">
                              {contents.slice(0, 4).map((content, i) => (
                                <div
                                  key={i}
                                  className="text-[11px] px-1 py-0.5 bg-indigo-100 text-indigo-700 rounded truncate border-l-2 border-indigo-500"
                                  title={`${content.deviceName}: ${content.name}`}
                                >
                                  {content.name}
                                </div>
                              ))}
                              {contents.length > 4 && (
                                <div className="text-[10px] text-gray-500 px-1">
                                  +{contents.length - 4}개 더
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 선택된 날짜의 콘텐츠 상세 */}
        <div className="bg-gray-50 rounded-xl p-4 lg:max-h-[850px] flex flex-col">
          <h5 className="font-semibold text-gray-700 mb-3 flex items-center flex-shrink-0">
            <span className="mr-2">📋</span>
            {selectedDay ? (
              <>
                {selectedDay.replace(/-/g, '.')} 콘텐츠
                <span className="ml-2 text-sm text-gray-500">
                  ({selectedDayContents?.length || 0}개)
                </span>
              </>
            ) : (
              '날짜를 선택하세요'
            )}
          </h5>

          {selectedDayContents === null ? (
            <div className="text-center text-gray-400 py-8">
              <p>캘린더에서 날짜를 클릭하면</p>
              <p>해당 일의 콘텐츠를 볼 수 있습니다</p>
            </div>
          ) : selectedDayContents.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>등록된 콘텐츠가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2 flex-1 overflow-y-auto">
              {selectedDayContents.map((content, index) => (
                <div
                  key={`${content.deviceId}-${content.id}-${index}`}
                  className="bg-white rounded-lg border border-gray-200 p-3"
                >
                  <div className="flex items-start gap-3">
                    {/* 썸네일 */}
                    <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                      {content.type === 'image' && content.url ? (
                        <img
                          src={content.url}
                          alt={content.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl">{getTypeIcon(content.type)}</span>
                      )}
                    </div>

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="font-medium text-gray-800 truncate">
                          {content.name}
                        </p>
                        {content.source === 'library' && (
                          <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded">
                            라이브러리
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-indigo-600 truncate">
                        📺 {content.deviceName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {content.source === 'legacy' ? Math.round(content.duration / 1000) : content.duration}초 | {getScheduleTypeLabel(content.scheduleType)}
                      </p>
                      {content.startTime && content.endTime && (
                        <p className="text-xs text-gray-500">
                          {content.startTime} ~ {content.endTime}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
