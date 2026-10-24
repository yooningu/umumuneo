import { useState, useEffect } from 'react';
import { getSchedules } from '../../api/schedule';
import { getHolidays } from '../../api/holiday';
import type { Schedule } from '../../types';
import { toDateStr } from '../../utils/date';
import styles from './MiniCalendar.module.css';
import Tooltip from '../common/Tooltip';
import { PiAlarmFill } from "react-icons/pi";

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
  clipStartDay: number;
  clipEndDay: number;
  isTrueStart: boolean;
  isTrueEnd: boolean;
  hasNotification: boolean;
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
const MAX_DOTS = 3;
const MAX_PERIOD_BARS = 3;

export default function MiniCalendar({ selectedDate, onDateSelect, refreshKey }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [holidays, setHolidays] = useState<Map<string, string>>(new Map());
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

  useEffect(() => {
    const from = toDateStr(new Date(year, month, 1));
    const to = toDateStr(new Date(year, month, daysInMonth));
    getSchedules(from, to)
      // 내용이 실제로 바뀌지 않았으면 이전 배열을 그대로 돌려줘서(참조 동일) 불필요한 재렌더링을 막음
      .then(data => setSchedules(prev => (JSON.stringify(prev) === JSON.stringify(data) ? prev : data)))
      .catch(console.error);
  }, [year, month, daysInMonth, refreshKey]);

  // 공휴일(빨간날) - 월이 바뀔 때만 새로 조회
  useEffect(() => {
    getHolidays(year, month + 1)
      .then(list => setHolidays(new Map(list.map(h => [h.date, h.name]))))
      .catch(console.error);
  }, [year, month]);

  // 날짜별 점(dot)/알림 정보 + 기간 일정 바 계산
  const monthStartStr = toDateStr(new Date(year, month, 1));
  const monthEndStr = toDateStr(new Date(year, month, daysInMonth));
  const dayInfos = new Map<number, DayInfo>();
  const periodIntervals: PeriodInterval[] = [];

  for (const s of schedules) {
    const color = s.color || '#7c8cf8';
    if (s.type === 'PERIOD') {
      const rangeStart = s.startDate;
      const rangeEnd = s.endDate ?? s.startDate;
      if (rangeEnd < monthStartStr || rangeStart > monthEndStr) continue;
      const isTrueStart = rangeStart >= monthStartStr;
      const isTrueEnd = rangeEnd <= monthEndStr;
      const clipStartDay = isTrueStart ? Number(rangeStart.slice(8, 10)) : 1;
      const clipEndDay = isTrueEnd ? Number(rangeEnd.slice(8, 10)) : daysInMonth;
      periodIntervals.push({ color, clipStartDay, clipEndDay, isTrueStart, isTrueEnd, hasNotification: !!s.notification });
      for (let d = clipStartDay; d <= clipEndDay; d++) {
        // 기간 일정은 아래 바(bar)로 표시되므로 점은 따로 찍지 않음 (중복 방지)
        const info = dayInfos.get(d) ?? { dots: [], hasNotification: false, titles: [] };
        if (s.notification) info.hasNotification = true;
        info.titles.push(s.title);
        dayInfos.set(d, info);
      }
    } else {
      if (s.startDate < monthStartStr || s.startDate > monthEndStr) continue;
      const d = Number(s.startDate.slice(8, 10));
      const info = dayInfos.get(d) ?? { dots: [], hasNotification: false, titles: [] };
      if (info.dots.length < MAX_DOTS) info.dots.push(color);
      if (s.notification) info.hasNotification = true;
      info.titles.push(s.title);
      dayInfos.set(d, info);
    }
  }

  // 기간 일정마다 겹치지 않는 "줄(slot)"을 하나 배정해서, 같은 일정은 시작부터 끝까지
  // 항상 같은 줄에 표시되도록 한다 (날짜마다 따로 계산하면 중간에 줄이 바뀌어 끊겨 보임).
  periodIntervals.sort((a, b) => a.clipStartDay - b.clipStartDay);
  const slotLastDay: number[] = [];
  const periodBarByDay = new Map<number, (PeriodBar | null)[]>();
  for (const iv of periodIntervals) {
    let slot = -1;
    for (let s = 0; s < MAX_PERIOD_BARS; s++) {
      if (slotLastDay[s] === undefined || slotLastDay[s] < iv.clipStartDay) {
        slot = s;
        break;
      }
    }
    if (slot === -1) continue; // 동시에 겹치는 기간 일정이 MAX_PERIOD_BARS개를 넘으면 생략
    slotLastDay[slot] = iv.clipEndDay;

    for (let d = iv.clipStartDay; d <= iv.clipEndDay; d++) {
      const arr = periodBarByDay.get(d) ?? [];
      while (arr.length <= slot) arr.push(null);
      arr[slot] = {
        color: iv.color,
        roundLeft: d === iv.clipStartDay && iv.isTrueStart,
        roundRight: d === iv.clipEndDay && iv.isTrueEnd,
      };
      periodBarByDay.set(d, arr);
    }
  }

  // 달력 아래에 보여줄 이번 달 일정 목록 (시작일 순)
  const sortedSchedules = [...schedules].sort((a, b) => a.startDate.localeCompare(b.startDate));

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
        <button onClick={prevMonth} className={styles.navButton}>‹</button>
        <span className={styles.title}>
          {year}년 {String(month + 1).padStart(2, '0')}월
        </span>
        <button onClick={nextMonth} className={styles.navButton}>›</button>
      </div>

      {/* 요일 헤더 */}
      <div className={styles.weekdayRow}>
        {DAY_LABELS.map(d => (
          <div key={d} className={styles.weekdayCell}>{d}</div>
        ))}
      </div>

      {/* 날짜 */}
      <div className={styles.daysGrid}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const date = new Date(year, month, day, 0, 0, 0, 0); // 시간 0으로 초기화
          const isToday = date.toDateString() === today.toDateString();
          const isSelected = date.toDateString() === selectedDate.toDateString();
          const info = dayInfos.get(day);
          const periodSlots = periodBarByDay.get(day) ?? [];
          const col = i % 7;
          const isGridLeftEdge = col === 0;
          const isGridRightEdge = col === 6;
          const wrapperClassName = [
            styles.dayCell,
            isToday ? styles.today : '',
            isSelected ? styles.selected : '',
          ].join(' ').trim();
          const holidayName = holidays.get(toDateStr(date));
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
              <div onClick={() => onDateSelect(date)} className={wrapperClassName}>
                <span className={numberClassName}>
                  {day}
                  {info?.hasNotification && <span className={styles.bell}><PiAlarmFill /></span>}
                </span>
                <div className={styles.dotsRow}>
                  {(info?.dots ?? []).map((c, idx) => (
                    <span key={idx} className={styles.dot} style={{ backgroundColor: c }} />
                  ))}
                </div>
                {periodSlots.length > 0 && (
                  <div className={styles.periodBarStack}>
                    {periodSlots.map((pb, idx) => {
                      if (!pb) return <div key={idx} className={styles.periodBarRow} />;
                      // 실제로 옆 칸까지 이어지는 방향으로만 틈(gap)을 메워 붙이고,
                      // 진짜 시작/종료 칸은 끝까지 가지 않고 칸 중간에서 끊어서 시작/종료되게 한다.
                      const bleedLeft = !pb.roundLeft && !isGridLeftEdge;
                      const bleedRight = !pb.roundRight && !isGridRightEdge;
                      // 줄이 바뀌는 경계(왼쪽 끝/오른쪽 끝 칸)는 옆 칸과 실제로 붙어있지 않으므로
                      // 이어지는 중이어도 칸 끝까지 채우지 않고 중간에서 끊어 보이게 한다.
                      const rowWrapLeft = !pb.roundLeft && isGridLeftEdge;
                      const rowWrapRight = !pb.roundRight && isGridRightEdge;
                      const isSingleDay = pb.roundLeft && pb.roundRight;
                      const left = bleedLeft ? '-1px' : pb.roundLeft ? (isSingleDay ? '25%' : '50%') : rowWrapLeft ? '50%' : '0';
                      const right = bleedRight ? '-1px' : pb.roundRight ? (isSingleDay ? '25%' : '50%') : rowWrapRight ? '50%' : '0';
                      return (
                        <div key={idx} className={styles.periodBarRow}>
                          <div
                            className={styles.periodBar}
                            style={{
                              backgroundColor: pb.color,
                              left,
                              right,
                              borderTopLeftRadius: pb.roundLeft ? 4 : 0,
                              borderBottomLeftRadius: pb.roundLeft ? 4 : 0,
                              borderTopRightRadius: pb.roundRight ? 4 : 0,
                              borderBottomRightRadius: pb.roundRight ? 4 : 0,
                            }}
                          />
                        </div>
                      );
                    })}
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
