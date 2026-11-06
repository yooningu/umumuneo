import { useState, useEffect } from 'react';
import { getSchedules } from '../../api/schedule';
import { getHolidaysCached } from '../../state/holidayCache';
import type { Schedule } from '../../types';
import { toDateStr } from '../../utils/date';
import styles from './MiniCalendar.module.css';
import Tooltip from '../common/Tooltip';
import DatePickerPopover from '../common/DatePickerPopover';
import { PiAlarmFill } from "react-icons/pi";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";

interface Props {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  refreshKey?: number;
}

interface DayInfo {
  dots: string[];
  hasNotification: boolean;
  titles: string[];
}

interface PeriodBar {
  color: string;
  roundLeft: boolean;
  roundRight: boolean;
}

interface PeriodInterval {
  color: string;
  title: string;
  notification: boolean;
  start: string;
  end: string;
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
const MAX_DOTS = 3;
const MAX_PERIOD_BARS = 3;

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
  const offset = (firstDow + 6) % 7; // 월=0, ..., 일=6
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Math.ceil((offset + daysInMonth) / 7);
}

export default function MiniCalendar({ selectedDate, onDateSelect, refreshKey }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [holidays, setHolidays] = useState<Map<string, string>>(new Map());
  const [pickerOpen, setPickerOpen] = useState(false);
  const today = new Date();
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 이전/다음 달 일부가 옅게 보이는 그리드 - 모바일 달력과 동일하게, 그 달에 실제로 필요한 주(4~6주)만큼만
  const gridStart = mondayOf(new Date(year, month, 1));
  const gridDays = Array.from({ length: monthRows(selectedDate) * 7 }, (_, i) => addDays(gridStart, i));
  const paddedFromStr = toDateStr(gridStart);
  const paddedToStr = toDateStr(gridDays[gridDays.length - 1]);

  useEffect(() => {
    getSchedules(paddedFromStr, paddedToStr)
      // 내용이 실제로 바뀌지 않았으면 이전 배열을 그대로 돌려줘서(참조 동일) 불필요한 재렌더링을 막음
      .then(data => setSchedules(prev => (JSON.stringify(prev) === JSON.stringify(data) ? prev : data)))
      .catch(console.error);
  }, [paddedFromStr, paddedToStr, refreshKey]);

  // 공휴일(빨간날) - 그리드가 걸칠 수 있는 이전/이번/다음 달을 모두 조회
  useEffect(() => {
    const months = [-1, 0, 1].map(o => new Date(year, month + o, 1));
    Promise.all(months.map(d => getHolidaysCached(d.getFullYear(), d.getMonth() + 1)))
      .then(lists => setHolidays(new Map(lists.flat().map(h => [h.date, h.name]))))
      .catch(console.error);
  }, [year, month]);

  // 날짜별 점(dot)/알림 정보 + 기간 일정 바 계산 - 날짜 문자열 기준(모바일 달력과 동일한 방식)
  const dayInfos = new Map<string, DayInfo>();
  const periodIntervals: PeriodInterval[] = [];

  for (const s of schedules) {
    const color = s.color || '#7c8cf8';
    if (s.type === 'PERIOD') {
      periodIntervals.push({ color, title: s.title, notification: !!s.notification, start: s.startDate, end: s.endDate ?? s.startDate });
    } else {
      const info = dayInfos.get(s.startDate) ?? { dots: [], hasNotification: false, titles: [] };
      if (info.dots.length < MAX_DOTS) info.dots.push(color);
      if (s.notification) info.hasNotification = true;
      info.titles.push(s.title);
      dayInfos.set(s.startDate, info);
    }
  }

  // 기간 일정마다 겹치지 않는 "줄(slot)"을 하나 배정해서, 같은 일정은 시작부터 끝까지
  // 항상 같은 줄에 표시되도록 한다 (날짜마다 따로 계산하면 중간에 줄이 바뀌어 끊겨 보임).
  periodIntervals.sort((a, b) => a.start.localeCompare(b.start));
  const slotLastEnd: string[] = [];
  const periodBarByDate = new Map<string, (PeriodBar | null)[]>();
  for (const iv of periodIntervals) {
    let slot = -1;
    for (let s = 0; s < MAX_PERIOD_BARS; s++) {
      if (slotLastEnd[s] === undefined || slotLastEnd[s] < iv.start) {
        slot = s;
        break;
      }
    }
    if (slot === -1) continue; // 동시에 겹치는 기간 일정이 MAX_PERIOD_BARS개를 넘으면 생략
    slotLastEnd[slot] = iv.end;

    let cursor = iv.start;
    while (cursor <= iv.end) {
      const arr = periodBarByDate.get(cursor) ?? [];
      while (arr.length <= slot) arr.push(null);
      arr[slot] = { color: iv.color, roundLeft: cursor === iv.start, roundRight: cursor === iv.end };
      periodBarByDate.set(cursor, arr);

      // 기간 일정은 아래 바(bar)로 표시되므로 점은 따로 찍지 않지만, 알림/툴팁용 제목은 그대로 모음
      const info = dayInfos.get(cursor) ?? { dots: [], hasNotification: false, titles: [] };
      // 알림은 시작일 하루에만 가므로(기간 내내 매일 가는 게 아님), 벨 표시도 진짜 시작일에만
      if (iv.notification && cursor === iv.start) info.hasNotification = true;
      info.titles.push(iv.title);
      dayInfos.set(cursor, info);

      cursor = toDateStr(addDays(new Date(cursor), 1));
    }
  }

  // 달력 아래에 보여줄 이번 달 일정 목록 (이번 달과 겹치는 일정만, 시작일 순)
  const monthStartStr = toDateStr(new Date(year, month, 1));
  const monthEndStr = toDateStr(new Date(year, month, daysInMonth));
  const sortedSchedules = schedules
    .filter(s => (s.endDate ?? s.startDate) >= monthStartStr && s.startDate <= monthEndStr)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const prevMonth = () => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() - 1);
    onDateSelect(d);
  };

  const nextMonth = () => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() + 1);
    onDateSelect(d);
  };

  return (
    <div className={styles.container}>
      {/* 헤더 */}
      <div className={styles.header}>
        <button onClick={prevMonth} className={styles.navButton}><FaChevronLeft /></button>
        <span className={styles.titleWrap}>
          <button className={styles.title} onClick={() => setPickerOpen(v => !v)}>
            {year}년 {String(month + 1).padStart(2, '0')}월
          </button>
          {pickerOpen && (
            <DatePickerPopover
              value={selectedDate}
              onSelect={onDateSelect}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </span>
        <button onClick={nextMonth} className={styles.navButton}><FaChevronRight /></button>
      </div>

      {/* 요일 헤더 */}
      <div className={styles.weekdayRow}>
        {DAY_LABELS.map((d, i) => (
          <div
            key={d}
            className={[
              styles.weekdayCell,
              i === 5 ? styles.saturday : '',
              i === 6 ? styles.sunday : '',
            ].join(' ').trim()}
          >
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 - 이전/다음 달 일부는 옅게(모바일 달력과 동일) */}
      <div className={styles.daysGrid}>
        {gridDays.map((date, i) => {
          const ds = toDateStr(date);
          const inMonth = date.getMonth() === month;
          const isToday = date.toDateString() === today.toDateString();
          const isSelected = date.toDateString() === selectedDate.toDateString();
          const info = dayInfos.get(ds);
          const periodSlotsRaw = periodBarByDate.get(ds) ?? [];
          // 일정이 1개든 2개든 칸 높이가 고정되도록, 일정이 하나라도 있으면 항상 MAX_PERIOD_BARS줄만큼 채워둠
          // (개수만큼만 렌더링하면 옆 칸과 줄 수가 달라져서 높이가 들쭉날쭉해 보였음)
          const periodSlots = periodSlotsRaw.length > 0
            ? Array.from({ length: MAX_PERIOD_BARS }, (_, idx) => periodSlotsRaw[idx] ?? null)
            : periodSlotsRaw;
          const wrapperClassName = [
            styles.dayCell,
            isToday ? styles.today : '',
            isSelected ? styles.selected : '',
          ].join(' ').trim();
          const holidayName = holidays.get(ds);
          const tooltipText = [holidayName, ...(info?.titles ?? [])].filter(Boolean).join('\n');
          const dow = date.getDay();
          const numberClassName = [
            styles.dayNumber,
            dow === 6 ? styles.saturday : '',
            dow === 0 ? styles.sunday : '',
            holidayName ? styles.holiday : '',
            isToday ? styles.today : '',
          ].join(' ').trim();
          return (
            <Tooltip key={i} content={tooltipText}>
              <div
                onClick={() => onDateSelect(date)}
                className={wrapperClassName}
                style={{ opacity: inMonth ? 1 : 0.35 }}
              >
                <span className={numberClassName}>
                  {date.getDate()}
                  {info?.hasNotification && <span className={styles.bell}><PiAlarmFill /></span>}
                </span>
                <div className={styles.dotsRow}>
                  {(info?.dots ?? []).map((c, idx) => (
                    <span key={idx} className={styles.dot} style={{ backgroundColor: c }} />
                  ))}
                </div>
                {periodSlots.length > 0 && (
                  <div className={styles.periodBarStack}>
                    {periodSlots.map((pb, idx) => (
                      <div key={idx} className={styles.periodBarRow}>
                        {pb && (
                          <div
                            className={styles.periodBar}
                            style={{
                              backgroundColor: pb.color,
                              // 월요일(맨 왼쪽 칸)/일요일(맨 오른쪽 칸)은 옆으로 이어 붙일 칸이 없어서
                              // 끝까지 안 채우고 조금 짧게 끊어 보이게 한다
                              left: pb.roundLeft ? '50%' : dow === 1 ? '10%' : '-1px',
                              right: pb.roundRight ? '50%' : dow === 0 ? '10%' : '-1px',
                              borderTopLeftRadius: pb.roundLeft ? 4 : 0,
                              borderBottomLeftRadius: pb.roundLeft ? 4 : 0,
                              borderTopRightRadius: pb.roundRight ? 4 : 0,
                              borderBottomRightRadius: pb.roundRight ? 4 : 0,
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Tooltip>
          );
        })}
      </div>

      {/* 이번 달 일정 목록 (점 색상 + 일정 이름, 2열, 넘치면 스크롤) */}
      {sortedSchedules.length > 0 && (
        <>
          <div className={styles.legendDivider} />
          <div className={styles.legendScroll}>
            <div className={styles.legendGrid}>
              {sortedSchedules.map(s => (
                <div key={s.id} className={styles.legendItem} title={s.title}>
                  <span className={styles.legendDot} style={{ backgroundColor: s.color || '#7c8cf8' }} />
                  <span className={styles.legendText}>{s.title}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
