import { useState, useEffect, useRef, type ReactNode, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { getSchedules } from '../../../api/schedule';
import { getHolidaysCached } from '../../../state/holidayCache';
import type { Schedule } from '../../../types';
import { toDateStr } from '../../../utils/date';
import { PiAlarmFill } from 'react-icons/pi';
import miniStyles from '../MiniCalendar.module.css';
import styles from './MobileCalendarGrid.module.css';

interface Props {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  refreshKey?: number;
}

interface DayInfo {
  dots: string[];
  hasNotification: boolean;
}

interface PeriodBar {
  color: string;
  roundLeft: boolean;
  roundRight: boolean;
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
const MAX_DOTS = 3;
const MAX_PERIOD_BARS = 3;
const ROW_GAP = 2; // miniStyles.daysGrid의 gap:2px와 맞춤
const SWIPE_CONFIRM_PX = 8;
const SWIPE_COMMIT_RATIO = 0.2;
const SWIPE_COMMIT_MIN_PX = 60;
const TRANSITION_MS = 200;
const HANDLE_DRAG_PX = 20;

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d: Date, n: number): Date {
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), last));
}

// 월요일 시작(월~일)으로 그 날이 속한 주의 월요일을 돌려줌
function mondayOf(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const offset = (x.getDay() + 6) % 7; // 월=0, 화=1, ..., 일=6
  x.setDate(x.getDate() - offset);
  return x;
}

function weekOf(d: Date): Date[] {
  const start = mondayOf(d);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// 그 달을 월~일 기준 그리드로 그릴 때 몇 주(줄)가 필요한지 - 달마다 4~6주로 다름
function monthRows(d: Date): number {
  const firstDow = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const offset = (firstDow + 6) % 7; // 월=0, ..., 일=6
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Math.ceil((offset + daysInMonth) / 7);
}

// 그 달 1일이 속한 주의 월요일 - 월 달력의 첫 칸(이전 달 꼬리 포함)
function monthGridStart(d: Date): Date {
  return mondayOf(new Date(d.getFullYear(), d.getMonth(), 1));
}

/* ---------- 좌우 스와이프 스트립(이전/현재/다음 3패널, 포인터 이벤트로 터치·마우스 공통 처리) ---------- */
interface SwipeStripProps {
  onPrev: () => void;
  onNext: () => void;
  render: (offset: -1 | 0 | 1) => ReactNode;
}

function SwipeStrip({ onPrev, onNext, render }: SwipeStripProps) {
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<'h' | 'v' | null>(null);
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);

  const onDown = (e: ReactPointerEvent) => {
    if (animating) return;
    start.current = { x: e.clientX, y: e.clientY };
    axis.current = null;
  };

  const onMove = (e: ReactPointerEvent) => {
    if (!start.current || animating) return;
    const mx = e.clientX - start.current.x;
    const my = e.clientY - start.current.y;
    if (!axis.current) {
      if (Math.abs(mx) < SWIPE_CONFIRM_PX && Math.abs(my) < SWIPE_CONFIRM_PX) return;
      // 수평/수직 중 더 크게 움직인 쪽으로 확정 - 수직이면 스와이프 취급 안 하고 페이지 스크롤에 맡김
      axis.current = Math.abs(mx) > Math.abs(my) ? 'h' : 'v';
      if (axis.current === 'h') ref.current?.setPointerCapture(e.pointerId);
    }
    if (axis.current === 'h') setDx(mx);
  };

  const finish = () => {
    if (!start.current) return;
    const width = ref.current?.clientWidth || 360;
    const moved = axis.current === 'h' ? dx : 0;
    start.current = null;
    axis.current = null;

    if (Math.abs(moved) > Math.min(SWIPE_COMMIT_MIN_PX, width * SWIPE_COMMIT_RATIO)) {
      const dir = moved < 0 ? 1 : -1; // 왼쪽으로 드래그 -> 다음
      setAnimating(true);
      setDx(-dir * width);
      window.setTimeout(() => {
        dir === 1 ? onNext() : onPrev();
        setAnimating(false);
        setDx(0);
      }, TRANSITION_MS);
    } else {
      setAnimating(true);
      setDx(0);
      window.setTimeout(() => setAnimating(false), TRANSITION_MS);
    }
  };

  // 패널 3개를 하나의 300% 너비 트랙으로 묶어 1/3씩 나누면(33.3333%) 반올림 오차가 생겨
  // 가장자리가 1px 미만으로 살짝 잘려 보였음. 대신 패널마다 자기 폭(100%)만큼만 좌우로
  // 옮기면(-100%/0%/+100%) 나눗셈 자체가 없어서 오차가 생길 수가 없음
  const panelStyle = (offset: -1 | 0 | 1): CSSProperties => ({
    transform: `translateX(calc(${offset * 100}% + ${dx}px))`,
    transition: animating ? `transform ${TRANSITION_MS}ms ease-out` : 'none',
  });

  return (
    <div
      ref={ref}
      className={styles.strip}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={finish}
      onPointerCancel={finish}
    >
      <div className={styles.panel} style={panelStyle(-1)}>{render(-1)}</div>
      <div className={styles.panel} style={panelStyle(0)}>{render(0)}</div>
      <div className={styles.panel} style={panelStyle(1)}>{render(1)}</div>
    </div>
  );
}

// 모바일 "스케줄" 토글의 달력 - 평소엔 선택한 날짜가 속한 주 한 줄만 보여주고(week 레이어),
// 손잡이를 아래로 드래그하면 한 달 전체(month 레이어)로 페이드 전환됨. 두 레이어 모두 항상
// 떠 있고(opacity로만 전환) 좌우 스와이프로 각각 주/월 단위 이전·다음 이동이 가능함.
// 날짜 칸 디자인(점/기간바/벨 아이콘/공휴일 색 등)은 데스크톱 MiniCalendar의 CSS를 그대로 재사용
export default function MobileCalendarGrid({ selectedDate, onDateSelect, refreshKey }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [holidays, setHolidays] = useState<Map<string, string>>(new Map());
  const [expanded, setExpanded] = useState(false);
  const [rowH, setRowH] = useState(50);
  const bodyRef = useRef<HTMLDivElement>(null);
  const handleStartY = useRef<number | null>(null);
  const today = new Date();
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  // 주 레이어(이전/현재/다음 주)와 월 레이어(이전/현재/다음 달, 각 6줄)가 모두 유효한 데이터를
  // 가지도록 이전 달 달력 시작 ~ 다음 달 달력 끝까지 한 번에 넉넉히 조회
  const paddedFrom = toDateStr(monthGridStart(addMonths(selectedDate, -1)));
  const paddedTo = toDateStr(addDays(monthGridStart(addMonths(selectedDate, 2)), -1));

  useEffect(() => {
    getSchedules(paddedFrom, paddedTo)
      .then(data => setSchedules(prev => (JSON.stringify(prev) === JSON.stringify(data) ? prev : data)))
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paddedFrom, paddedTo, refreshKey]);

  useEffect(() => {
    const months = [-1, 0, 1].map(o => addMonths(new Date(year, month, 1), o));
    Promise.all(months.map(d => getHolidaysCached(d.getFullYear(), d.getMonth() + 1)))
      .then(lists => setHolidays(new Map(lists.flat().map(h => [h.date, h.name]))))
      .catch(console.error);
  }, [year, month]);

  const dayInfos = new Map<string, DayInfo>();
  const periodByDate = new Map<string, PeriodBar[]>();
  {
    const intervals: { color: string; start: string; end: string }[] = [];
    for (const s of schedules) {
      const color = s.color || '#7c8cf8';
      if (s.type === 'PERIOD') {
        intervals.push({ color, start: s.startDate, end: s.endDate ?? s.startDate });
      } else {
        const info = dayInfos.get(s.startDate) ?? { dots: [], hasNotification: false };
        if (info.dots.length < MAX_DOTS) info.dots.push(color);
        if (s.notification) info.hasNotification = true;
        dayInfos.set(s.startDate, info);
      }
    }
    intervals.sort((a, b) => a.start.localeCompare(b.start));
    const slotLastEnd: string[] = [];
    for (const iv of intervals) {
      let slot = -1;
      for (let i = 0; i < MAX_PERIOD_BARS; i++) {
        if (slotLastEnd[i] === undefined || slotLastEnd[i] < iv.start) { slot = i; break; }
      }
      if (slot === -1) continue;
      slotLastEnd[slot] = iv.end;
      let cursor = iv.start;
      while (cursor <= iv.end) {
        const arr = periodByDate.get(cursor) ?? [];
        while (arr.length <= slot) arr.push({ color: '', roundLeft: false, roundRight: false });
        arr[slot] = { color: iv.color, roundLeft: cursor === iv.start, roundRight: cursor === iv.end };
        periodByDate.set(cursor, arr);
        cursor = toDateStr(addDays(new Date(cursor), 1));
      }
    }
  }

  // 기간 일정 바가 여러 줄 겹치면 고정 높이(48px)를 넘을 수 있어서, 현재 그려진 날짜 칸 중
  // 가장 큰 실제 콘텐츠 높이(scrollHeight)에 맞춰 한 줄 높이를 정함(잘림 방지)
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const cells = bodyRef.current?.querySelectorAll<HTMLElement>(`.${miniStyles.dayCell}`);
      if (!cells || cells.length === 0) return;
      let tallest = 0;
      cells.forEach(c => { tallest = Math.max(tallest, c.scrollHeight); });
      setRowH(tallest || 50);
    });
    return () => cancelAnimationFrame(id);
  }, [schedules, holidays, expanded]);

  const renderDayCell = (date: Date, inMonth: boolean) => {
    const ds = toDateStr(date);
    const info = dayInfos.get(ds);
    const periodSlots = periodByDate.get(ds) ?? [];
    const isToday = date.toDateString() === today.toDateString();
    const isSelected = date.toDateString() === selectedDate.toDateString();
    const dow = date.getDay();
    const holidayName = holidays.get(ds);
    const wrapperClassName = [miniStyles.dayCell, isToday ? miniStyles.today : '', isSelected ? miniStyles.selected : ''].join(' ').trim();
    const numberClassName = [
      miniStyles.dayNumber,
      dow === 6 ? miniStyles.saturday : '',
      dow === 0 ? miniStyles.sunday : '',
      holidayName ? miniStyles.holiday : '',
      isToday ? miniStyles.today : '',
    ].join(' ').trim();
    return (
      <div
        key={ds}
        onClick={() => onDateSelect(date)}
        className={wrapperClassName}
        style={{ opacity: inMonth ? 1 : 0.35 }}
      >
        <span className={numberClassName}>
          {date.getDate()}
          {info?.hasNotification && <span className={miniStyles.bell}><PiAlarmFill /></span>}
        </span>
        <div className={miniStyles.dotsRow}>
          {(info?.dots ?? []).map((c, idx) => <span key={idx} className={miniStyles.dot} style={{ backgroundColor: c }} />)}
        </div>
        {periodSlots.length > 0 && (
          <div className={miniStyles.periodBarStack}>
            {periodSlots.map((pb, idx) => (
              <div key={idx} className={miniStyles.periodBarRow}>
                {pb.color && (
                  <div
                    className={miniStyles.periodBar}
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
    );
  };

  const renderWeek = (weekOffset: number) => {
    const days = weekOf(addDays(selectedDate, weekOffset * 7));
    return <div className={miniStyles.daysGrid}>{days.map(d => renderDayCell(d, d.getMonth() === month))}</div>;
  };

  const renderMonthGrid = (monthOffset: number) => {
    const ref = addMonths(selectedDate, monthOffset);
    const gridStart = monthGridStart(ref);
    const cells = Array.from({ length: monthRows(ref) * 7 }, (_, i) => addDays(gridStart, i));
    return <div className={miniStyles.daysGrid}>{cells.map(d => renderDayCell(d, d.getMonth() === ref.getMonth()))}</div>;
  };

  // 손잡이 드래그: 일정 거리 이상 아래로 당기면 펼침, 위로 올리면 접힘(탭으로는 안 바뀜 -
  // 실수로 스치기만 해도 토글되지 않게, 반드시 의도적으로 당겨야만 전환되도록 함)
  const onHandleDown = (e: ReactPointerEvent) => {
    handleStartY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onHandleUp = (e: ReactPointerEvent) => {
    if (handleStartY.current === null) return;
    const dy = e.clientY - handleStartY.current;
    handleStartY.current = null;
    if (dy > HANDLE_DRAG_PX) setExpanded(true);
    else if (dy < -HANDLE_DRAG_PX) setExpanded(false);
  };

  const currentMonthRows = monthRows(selectedDate);
  const bodyHeight = expanded ? rowH * currentMonthRows + ROW_GAP * (currentMonthRows - 1) : rowH;

  return (
    <div className={miniStyles.container}>
      <div className={miniStyles.weekdayRow}>
        {DAY_LABELS.map((d, i) => (
          <div key={d} className={[miniStyles.weekdayCell, i === 5 ? miniStyles.saturday : '', i === 6 ? miniStyles.sunday : ''].join(' ').trim()}>
            {d}
          </div>
        ))}
      </div>

      <div className={styles.body} style={{ height: bodyHeight, transition: `height ${TRANSITION_MS}ms ease` }} ref={bodyRef}>
        <div className={styles.layer} style={{ opacity: expanded ? 0 : 1, pointerEvents: expanded ? 'none' : 'auto' }}>
          <SwipeStrip
            onPrev={() => onDateSelect(addDays(selectedDate, -7))}
            onNext={() => onDateSelect(addDays(selectedDate, 7))}
            render={renderWeek}
          />
        </div>
        <div className={styles.layer} style={{ opacity: expanded ? 1 : 0, pointerEvents: expanded ? 'auto' : 'none' }}>
          <SwipeStrip
            onPrev={() => onDateSelect(addMonths(selectedDate, -1))}
            onNext={() => onDateSelect(addMonths(selectedDate, 1))}
            render={renderMonthGrid}
          />
        </div>
      </div>

      <div className={styles.handle} onPointerDown={onHandleDown} onPointerUp={onHandleUp}>
        <span className={styles.handleBar} />
      </div>
    </div>
  );
}
