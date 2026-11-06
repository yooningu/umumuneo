import { useState, useEffect } from 'react';
import { getSchedules } from '../../api/schedule';
import { getHolidaysCached } from '../../state/holidayCache';
import type { Schedule } from '../../types';
import { toDateStr } from '../../utils/date';
import { PiAlarmFill } from 'react-icons/pi';
import styles from './MonthCalendar.module.css';

interface Props {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  refreshKey?: number;
}

interface EventBar {
  title: string;
  color: string;
}

interface EventInterval {
  title: string;
  color: string;
  start: string;
  end: string;
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
// 칸 높이가 auto라 바가 많아지면 칸이 같이 늘어나므로, 사실상 무제한에 가깝게 여유 있게 잡음
const MAX_BARS = 30;

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// 월요일 시작(월~일)으로 그 날이 속한 주의 월요일을 돌려줌
function mondayOf(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const offset = (x.getDay() + 6) % 7; // 월=0, 화=1, ..., 일=6
  x.setDate(x.getDate() - offset);
  return x;
}

// 그 달을 월~일 기준 그리드로 그릴 때 몇 주(줄)가 필요한지 - 달마다 4~6주로 다름
function monthRows(d: Date): number {
  const firstDow = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const offset = (firstDow + 6) % 7;
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Math.ceil((offset + daysInMonth) / 7);
}

// MiniCalendar(사이드바용 작은 달력)와 달리, 메인 영역에 크게 띄우는 월간 달력.
// 월 이동/오늘 이동은 상위(ScheduleHeader)에서 selectedDate를 바꿔주는 방식으로 처리하고
// 여기선 그 달을 그려서 보여주는 역할만 한다. 이전/다음 달 일부는 미니달력처럼 옅게 같이 보여준다.
export default function MonthCalendar({ selectedDate, onDateSelect, refreshKey }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [holidays, setHolidays] = useState<Map<string, string>>(new Map());
  const today = new Date();
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  // 이전/다음 달 일부가 옅게 보이는 그리드 - 그 달에 실제로 필요한 주(4~6주)만큼만
  const gridStart = mondayOf(new Date(year, month, 1));
  const gridDays = Array.from({ length: monthRows(selectedDate) * 7 }, (_, i) => addDays(gridStart, i));
  const paddedFromStr = toDateStr(gridStart);
  const paddedToStr = toDateStr(gridDays[gridDays.length - 1]);

  useEffect(() => {
    getSchedules(paddedFromStr, paddedToStr)
      .then(setSchedules)
      .catch(console.error);
  }, [paddedFromStr, paddedToStr, refreshKey]);

  // 공휴일(빨간날) - 그리드가 걸칠 수 있는 이전/이번/다음 달을 모두 조회
  useEffect(() => {
    const months = [-1, 0, 1].map(o => new Date(year, month + o, 1));
    Promise.all(months.map(d => getHolidaysCached(d.getFullYear(), d.getMonth() + 1)))
      .then(lists => setHolidays(new Map(lists.flat().map(h => [h.date, h.name]))))
      .catch(console.error);
  }, [year, month]);

  // 일정마다(기간이든 하루짜리든 전부) 겹치는 구간을 계산 - 점이 아니라 제목이 보이는 바(bar)로 표시
  const intervals: EventInterval[] = [];
  for (const s of schedules) {
    const start = s.startDate;
    const end = s.endDate ?? s.startDate;
    if (end < paddedFromStr || start > paddedToStr) continue;
    intervals.push({ title: s.title, color: s.color || '#7c8cf8', start, end });
  }

  // 알림은 시작일 하루에만 가므로(기간 내내 가는 게 아님), 벨 표시도 시작일에만
  const notifiedDates = new Set<string>();
  for (const s of schedules) {
    if (s.notification && s.startDate >= paddedFromStr && s.startDate <= paddedToStr) {
      notifiedDates.add(s.startDate);
    }
  }

  // 일정마다 겹치지 않는 "줄(slot)"을 하나 배정해서, 같은 일정은 시작부터 끝까지
  // 항상 같은 줄에 표시되도록 한다 (날짜마다 따로 계산하면 중간에 줄이 바뀌어 끊겨 보임).
  intervals.sort((a, b) => a.start.localeCompare(b.start));
  const slotLastEnd: string[] = [];
  const barByDate = new Map<string, (EventBar | null)[]>();
  for (const iv of intervals) {
    let slot = -1;
    for (let s = 0; s < MAX_BARS; s++) {
      if (slotLastEnd[s] === undefined || slotLastEnd[s] < iv.start) {
        slot = s;
        break;
      }
    }
    if (slot === -1) continue; // 동시에 겹치는 일정이 MAX_BARS개를 넘으면 생략
    slotLastEnd[slot] = iv.end;

    // 그리드 밖으로 나가는 구간은 그릴 필요 없으니 화면에 보이는 범위로만 잘라서 돈다
    let cursor = iv.start < paddedFromStr ? paddedFromStr : iv.start;
    const cursorEnd = iv.end > paddedToStr ? paddedToStr : iv.end;
    while (cursor <= cursorEnd) {
      const arr = barByDate.get(cursor) ?? [];
      while (arr.length <= slot) arr.push(null);
      // 미니달력과 달리 이 달력은 날짜마다 독립된 바로 보여준다 - 기간 일정이어도 이어붙이지 않고
      // 매일 각자 둥근 모서리의 바 안에 제목이 그대로 들어간다.
      arr[slot] = { title: iv.title, color: iv.color };
      barByDate.set(cursor, arr);
      cursor = toDateStr(addDays(new Date(cursor), 1));
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.weekdayRow}>
        {DAY_LABELS.map(d => (
          <div
            key={d}
            className={[
              styles.weekdayCell,
              d === '토' ? styles.saturday : '',
              d === '일' ? styles.sunday : '',
            ].join(' ').trim()}
          >
            {d}
          </div>
        ))}
      </div>
      <div className={styles.daysGrid}>
        {gridDays.map((date, i) => {
          const ds = toDateStr(date);
          const inMonth = date.getMonth() === month;
          const isToday = date.toDateString() === today.toDateString();
          const isSelected = date.toDateString() === selectedDate.toDateString();
          const holidayName = holidays.get(ds);
          const dow = date.getDay();
          const numberClassName = [
            styles.dayNumber,
            dow === 6 ? styles.saturday : '',
            dow === 0 ? styles.sunday : '',
            holidayName ? styles.holiday : '',
            isToday ? styles.today : '',
          ].join(' ').trim();
          const barSlots = barByDate.get(ds) ?? [];
          return (
            <div
              key={i}
              onClick={() => onDateSelect(date)}
              className={`${styles.dayCell} ${isSelected ? styles.selected : ''} ${isToday ? styles.todayCell : ''}`}
              style={{ opacity: inMonth ? 1 : 0.35 }}
              title={holidayName}
            >
              <span className={numberClassName}>
                {date.getDate()}
                {notifiedDates.has(ds) && <span className={styles.bell}><PiAlarmFill /></span>}
              </span>
              {holidayName && <div className={styles.holidayLabel}>{holidayName}</div>}
              {barSlots.length > 0 && (
                <div className={styles.eventList}>
                  {barSlots.map((bar, idx) => (
                    <div key={idx} className={styles.eventRow}>
                      {bar && (
                        <div className={styles.eventBar} style={{ backgroundColor: bar.color }}>
                          <span className={styles.eventTitle}>{bar.title}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
