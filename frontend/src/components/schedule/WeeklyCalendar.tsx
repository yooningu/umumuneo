import { useState, useEffect, useRef } from 'react';
import { getSchedules } from '../../api/schedule';
import { getHolidays } from '../../api/holiday';
import type { Schedule } from '../../types';
import { toDateStr } from '../../utils/date';
import ScheduleDetailModal from './ScheduleDetailModal';
import ScheduleEditModal from './ScheduleEditModal';
import styles from './WeeklyCalendar.module.css';

interface Props {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  refreshKey?: number;
  onScheduleChange?: () => void;
  onVisibleCountChange?: (count: number) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

// 달력 주(월~일) 단위가 아니라, 선택한 날짜를 가운데 두고 앞뒤로 균등하게 보여줄 날짜들을 계산
// (예: count=7이면 선택일 기준 앞 3일 + 선택일 + 뒤 3일)
// 상위(SchedulePage)에서 헤더의 기간 라벨/이전·다음 이동 폭을 맞추는 데도 똑같이 써야 해서 export함
export function getCenteredDates(center: Date, count: number): Date[] {
  const start = new Date(center);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - Math.floor((count - 1) / 2));
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

// JS의 getDay()(일요일=0)를 월요일=0 기준 인덱스로 변환
function mondayBasedDow(date: Date): number {
  return (date.getDay() + 6) % 7;
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
const MAX_ALLDAY_VISIBLE = 2;
const TIME_COL_WIDTH = 50;
const MIN_DAY_COL_WIDTH = 120; // 요일 칸 하나의 최소 너비 (CSS의 min-width와 맞춰야 함)

// 사용 가능한 너비에 맞춰 한 번에 보여줄 요일 수를 정한다 (7 -> 5 -> 3)
function calcVisibleCount(availableWidth: number): number {
  const fits = Math.floor(availableWidth / MIN_DAY_COL_WIDTH);
  if (fits >= 7) return 7;
  if (fits >= 5) return 5;
  return 3;
}

interface TimedItem {
  schedule: Schedule;
  startMin: number;
  endMin: number;
}

// 같은 날 안에서 시간이 겹치는 일정끼리 그룹으로 묶는다 (시작 시각 기준으로 정렬 후 스윕)
function groupOverlapping(items: TimedItem[]): TimedItem[][] {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin);
  const groups: TimedItem[][] = [];
  let current: TimedItem[] = [];
  let currentMaxEnd = -Infinity;
  for (const item of sorted) {
    if (current.length === 0 || item.startMin < currentMaxEnd) {
      current.push(item);
      currentMaxEnd = Math.max(currentMaxEnd, item.endMin);
    } else {
      groups.push(current);
      current = [item];
      currentMaxEnd = item.endMin;
    }
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

// 겹치는 일정이 있으면 끝이 가려지지 않도록 좌/우 여백을 준다.
// 2개: 위(먼저 시작)는 오른쪽 8px, 아래는 왼쪽 8px
// 3개 이상: 맨 앞은 오른쪽 18px, 맨 뒤는 왼쪽 18px, 중간은 양쪽 8px
function getOverlapMargins(index: number, total: number): { left: number; right: number } {
  if (total <= 1) return { left: 0, right: 0 };
  if (total === 2) {
    return index === 0 ? { left: 0, right: 8 } : { left: 8, right: 0 };
  }
  if (index === 0) return { left: 0, right: 18 };
  if (index === total - 1) return { left: 18, right: 0 };
  return { left: 8, right: 8 };
}

export default function WeeklyCalendar({ selectedDate, onDateSelect, refreshKey, onScheduleChange, onVisibleCountChange }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [holidayDates, setHolidayDates] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(7);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const containerRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  // 달력 주 단위가 아니라, 선택한 날짜를 가운데 두고 그만큼(7/5/3일)만 보여줌
  const visibleDates = getCenteredDates(selectedDate, visibleCount);

  useEffect(() => {
    const from = toDateStr(visibleDates[0]);
    const to = toDateStr(visibleDates[visibleDates.length - 1]);
    getSchedules(from, to)
      .then(setSchedules)
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, refreshKey, visibleCount]);

  // 공휴일(빨간날) - 보이는 날짜 구간이 걸쳐있는 달(최대 2개)만 조회해서 합침
  useEffect(() => {
    const months = new Set(visibleDates.map(d => `${d.getFullYear()}-${d.getMonth() + 1}`));
    Promise.all([...months].map(m => {
      const [y, mo] = m.split('-').map(Number);
      return getHolidays(y, mo);
    }))
      .then(results => setHolidayDates(new Set(results.flat().map(h => h.date))))
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, visibleCount]);

  // 컨테이너 너비에 따라 보여줄 요일 수를 갱신
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const available = el.clientWidth - TIME_COL_WIDTH;
      setVisibleCount(calcVisibleCount(available));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 헤더(SchedulePage)가 기간 라벨/이전·다음 이동 폭을 똑같이 맞출 수 있도록 현재 보여주는 일수를 알려줌
  useEffect(() => {
    onVisibleCountChange?.(visibleCount);
  }, [visibleCount, onVisibleCountChange]);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const todayVisibleIndex = visibleDates.findIndex(d => d.toDateString() === today.toDateString());
  const todayInView = todayVisibleIndex !== -1;

  return (
    <div className={styles.container} ref={containerRef}>
      {/* 헤더: 요일 */}
      <div className={styles.headerRow}>
        <div className={styles.timeColSpacer} />
        {visibleDates.map((date, i) => {
          const isToday = date.toDateString() === today.toDateString();
          const isHoliday = holidayDates.has(toDateStr(date));
          const numberClassName = [
            styles.dayNumber,
            isHoliday ? styles.holiday : '',
            isToday ? styles.today : '',
          ].join(' ').trim();
          return (
            <div key={i} onClick={() => onDateSelect(date)} className={styles.dayHeaderCell}>
              <div className={styles.dayLabel}>{DAY_LABELS[mondayBasedDow(date)]}</div>
              <div className={numberClassName}>
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* 종일 일정 행 */}
      <div className={styles.alldayRow}>
        <div className={styles.alldayLabel}>종일</div>
        {visibleDates.map((date, i) => {
          const dateStr = toDateStr(date);
          const allday = schedules.filter(s =>
            (s.type === 'ALLDAY' || s.type === 'PERIOD') &&
            s.startDate <= dateStr && (s.endDate ?? s.startDate) >= dateStr
          );
          const visible = allday.slice(0, MAX_ALLDAY_VISIBLE);
          const hiddenCount = allday.length - visible.length;
          return (
            <div key={i} className={styles.alldayCell}>
              {visible.map(s => (
                <div
                  key={s.id}
                  className={styles.alldayBadge}
                  style={{ backgroundColor: s.color || '#7c8cf8' }}
                  onClick={() => { setSelectedSchedule(s); setModalMode('view'); }}
                >
                  {s.title}
                </div>
              ))}
              {hiddenCount > 0 && (
                <div className={styles.alldayMore}>···</div>
              )}
            </div>
          );
        })}
      </div>

      {/* 시간 그리드 */}
      <div className={styles.gridScroll}>
        <div className={styles.gridRow}>
          {/* 시간 컬럼 */}
          <div className={styles.timeCol}>
            {HOURS.map(h => (
              <div key={h} className={styles.hourCell}>
                <span className={styles.hourLabel}>{h === 0 ? '' : `${h}`}</span>
              </div>
            ))}
          </div>

          {/* 날짜별 컬럼 */}
          {visibleDates.map((date, i) => {
            const dateStr = toDateStr(date);

            // TIMED: 시작~종료 구간이 있는 블록으로 표시 (겹치면 좌우 여백)
            const timedItems: TimedItem[] = schedules
              .filter(s => s.type === 'TIMED' && s.startDate === dateStr && s.startTime)
              .map(s => {
                const [sh, sm] = s.startTime!.split(':').map(Number);
                const startMin = sh * 60 + sm;
                const endMin = s.endTime
                  ? (() => { const [eh, em] = s.endTime!.split(':').map(Number); return eh * 60 + em; })()
                  : startMin + 30;
                return { schedule: s, startMin, endMin };
              });
            const positionedItems = groupOverlapping(timedItems).flatMap(group =>
              group.map((item, idx) => ({ ...item, ...getOverlapMargins(idx, group.length) }))
            );

            // MOMENT: 특정 시각 하나를 나타내므로 구간 블록 대신 얇은 바로 표시
            const momentItems = schedules
              .filter(s => s.type === 'MOMENT' && s.startDate === dateStr && s.startTime)
              .map(s => {
                const [sh, sm] = s.startTime!.split(':').map(Number);
                return { schedule: s, startMin: sh * 60 + sm };
              });

            return (
              <div key={i} className={styles.dayCol}>
                {HOURS.map(h => (
                  <div key={h} className={styles.hourLine} />
                ))}

                {/* 일정 블록 (TIMED) */}
                {positionedItems.map(({ schedule: s, startMin, endMin, left, right }) => (
                  <div
                    key={s.id}
                    className={styles.scheduleBlock}
                    style={{
                      top: startMin,
                      height: Math.max(endMin - startMin, 20),
                      left: 2 + left,
                      right: 2 + right,
                      backgroundColor: s.color || '#7c8cf8',
                    }}
                    onClick={() => { setSelectedSchedule(s); setModalMode('view'); }}
                  >
                    <div className={styles.scheduleTitle}>{s.title}</div>
                  </div>
                ))}

                {/* 시각 바 (MOMENT): 텍스트 크기만큼 꽉 채운 알약 모양 */}
                {momentItems.map(({ schedule: s, startMin }) => (
                  <div
                    key={s.id}
                    className={styles.momentBadge}
                    style={{ top: startMin, backgroundColor: s.color || '#7c8cf8' }}
                    onClick={() => { setSelectedSchedule(s); setModalMode('view'); }}
                  >
                    {s.title}
                  </div>
                ))}
              </div>
            );
          })}

          {/* 현재 시간 선: 시간표 전체 너비에 걸쳐 표시 */}
          {todayInView && (
            <div className={styles.nowLine} style={{ top: nowMinutes }} />
          )}

          {/* 오늘 칸 위치에 현재 시각 배지 표시 */}
          {todayInView && todayVisibleIndex !== -1 && (
            <div
              className={styles.nowBadge}
              style={{
                top: nowMinutes,
                left: `calc(${TIME_COL_WIDTH}px + (100% - ${TIME_COL_WIDTH}px) * ${(todayVisibleIndex + 0.5) / visibleCount})`,
              }}
            >
              {nowLabel}
            </div>
          )}
        </div>
      </div>

      {selectedSchedule && modalMode === 'view' && (
        <ScheduleDetailModal
          schedule={selectedSchedule}
          onClose={() => setSelectedSchedule(null)}
          onEdit={() => setModalMode('edit')}
          onChanged={() => onScheduleChange?.()}
        />
      )}
      {selectedSchedule && modalMode === 'edit' && (
        <ScheduleEditModal
          schedule={selectedSchedule}
          onCancel={() => setModalMode('view')}
          onSaved={() => { onScheduleChange?.(); setSelectedSchedule(null); }}
          onDeleted={() => { onScheduleChange?.(); setSelectedSchedule(null); }}
        />
      )}
    </div>
  );
}
