import { useState, useEffect } from 'react';
import { getSchedules } from '../../api/schedule';
import { getHolidays } from '../../api/holiday';
import type { Schedule } from '../../types';
import { toDateStr } from '../../utils/date';
import styles from './MonthCalendar.module.css';

interface Props {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  refreshKey?: number;
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
const MAX_DOTS = 3;

// MiniCalendar(사이드바용 작은 달력)와 달리, 메인 영역에 크게 띄우는 월간 달력.
// 월 이동/오늘 이동은 상위(ScheduleHeader)에서 selectedDate를 바꿔주는 방식으로 처리하고
// 여기선 그 달을 그려서 보여주는 역할만 한다.
export default function MonthCalendar({ selectedDate, onDateSelect, refreshKey }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [holidayDates, setHolidayDates] = useState<Set<string>>(new Set());
  const today = new Date();
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthStart = toDateStr(new Date(year, month, 1));
  const monthEnd = toDateStr(new Date(year, month, daysInMonth));

  useEffect(() => {
    getSchedules(monthStart, monthEnd)
      .then(setSchedules)
      .catch(console.error);
  }, [monthStart, monthEnd, refreshKey]);

  // 공휴일(빨간날)
  useEffect(() => {
    getHolidays(year, month + 1)
      .then(list => setHolidayDates(new Set(list.map(h => h.date))))
      .catch(console.error);
  }, [year, month]);

  // 날짜별로 보여줄 점(dot) 색상들을 계산 (기간 일정은 걸치는 모든 날에 다 찍음)
  const dotsByDay = new Map<number, string[]>();
  for (const s of schedules) {
    const rangeStart = s.startDate;
    const rangeEnd = s.endDate ?? s.startDate;
    if (rangeEnd < monthStart || rangeStart > monthEnd) continue;
    const dStart = rangeStart >= monthStart ? Number(rangeStart.slice(8, 10)) : 1;
    const dEnd = rangeEnd <= monthEnd ? Number(rangeEnd.slice(8, 10)) : daysInMonth;
    for (let d = dStart; d <= dEnd; d++) {
      const arr = dotsByDay.get(d) ?? [];
      if (arr.length < MAX_DOTS) arr.push(s.color || '#7c8cf8');
      dotsByDay.set(d, arr);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.weekdayRow}>
        {DAY_LABELS.map(d => (
          <div key={d} className={styles.weekdayCell}>{d}</div>
        ))}
      </div>
      <div className={styles.daysGrid}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} className={styles.emptyCell} />;
          const date = new Date(year, month, day, 0, 0, 0, 0);
          const isToday = date.toDateString() === today.toDateString();
          const isSelected = date.toDateString() === selectedDate.toDateString();
          const isHoliday = holidayDates.has(toDateStr(date));
          const numberClassName = [
            styles.dayNumber,
            isHoliday ? styles.holiday : '',
            isToday ? styles.today : '',
          ].join(' ').trim();
          return (
            <div
              key={i}
              onClick={() => onDateSelect(date)}
              className={`${styles.dayCell} ${isSelected ? styles.selected : ''}`}
            >
              <span className={numberClassName}>
                {day}
              </span>
              <div className={styles.dotsRow}>
                {(dotsByDay.get(day) ?? []).map((c, idx) => (
                  <span key={idx} className={styles.dot} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
