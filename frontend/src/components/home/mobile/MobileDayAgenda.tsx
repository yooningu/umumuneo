import { useState, useEffect } from 'react';
import { getSchedules } from '../../../api/schedule';
import { getTimetables } from '../../../api/timetable';
import type { Schedule, Timetable } from '../../../types';
import { toDateStr } from '../../../utils/date';
import ScheduleDetailModal from '../../schedule/ScheduleDetailModal';
import ScheduleEditModal from '../../schedule/ScheduleEditModal';
import TimetableDetailModal from '../../schedule/TimetableDetailModal';
import TimetableEditModal from '../../schedule/TimetableEditModal';
import styles from './MobileDayAgenda.module.css';

interface Props {
  selectedDate: Date;
  refreshKey: number;
  onScheduleChange: () => void;
}

interface TimelineItem {
  key: string;
  title: string;
  color: string;
  startMin: number;
  endMin: number; // MOMENT(끝 시각 없음)는 startMin과 같은 값을 써서 높이 0 + CSS min-height로 표시
  isTimetable: boolean;
  onClick: () => void;
}

interface IndexedItem extends TimelineItem {
  startIdx: number; // 실제 사용되는 시각들 중 몇 번째인지 (분 단위 비례가 아니라 이 인덱스로 위치 계산)
  endIdx: number;
}

interface PositionedItem extends IndexedItem {
  lane: number;
  maxLane: number;
}

const GAP = 64;    // 실제 분 간격이 아니라, 실제로 쓰이는 시각끼리의 고정 세로 간격(px)
const PAD = 20;     // 위쪽 여백
const OFFSET = 24;  // 겹칠 때 카드가 오른쪽으로 밀리는 간격(px)
// 시각(MOMENT)일정처럼 길이가 0인 카드도 제목+시간 두 줄이 안 짤리게 보장하는 최소 높이(px)
const MIN_CELL_HEIGHT = 54;
// 일정 카드가 시간표 배경보다 안쪽에 들어가도록 주는 좌우 여백(px) - 왼쪽을 더 크게 줘서
// 일정이 오른쪽으로 치우치고, 뒤에 깔린 시간표가 왼쪽으로 더 잘 보이게 한다
const SCHEDULE_INSET_LEFT = 50;
const SCHEDULE_INSET_RIGHT = 10;

function formatMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

// 시간표 배경 블록은 PC 주간시간표와 동일하게 테두리는 그 색 그대로, 배경은 옅게(투명도)
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 일정 색상 팔레트에 파스텔(연한 색)도 있어서 글자를 항상 흰색으로 고정하면 그 위에서 안 보임 -
// 배경이 밝으면 어두운 글자, 어두우면 흰 글자를 쓰도록 명도를 계산
function isLightColor(hex: string): boolean {
  const h = hex.replace('#', '');
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

// 실제로 일정/시간표가 있는 시각(시작/종료)끼리만 모아 고정 간격으로 배치하고(빈 시간대는 건너뜀),
// 시간표/일정을 합쳐서 하나의 세로 축 인덱스를 만든다 (PC처럼 0~24시 전체 축에 분 단위로 비례시키지 않음).
// 0시/24시는 일정이 하나도 없어도 항상 포함시켜서 하루의 시작/끝을 알 수 있게 한다.
function buildTimeIndex(items: TimelineItem[]): { times: number[]; indexOf: Map<number, number>; height: number } {
  const times = [...new Set([0, 24 * 60, ...items.flatMap(e => [e.startMin, e.endMin])])].sort((a, b) => a - b);
  const indexOf = new Map(times.map((t, i) => [t, i]));
  const height = PAD * 2 + (times.length - 1) * GAP;
  return { times, indexOf, height };
}

// 지금 시각처럼 times[]에 정확히 없는 분(min)의 세로 위치를, 양옆에서 가장 가까운 두 시각
// 사이를 선형보간해서 구한다 (0~24시가 항상 양 끝에 있으므로 어떤 시각이든 그 사이 어딘가에 들어감)
function yOfMinute(min: number, times: number[]): number {
  let i = 0;
  while (i < times.length - 2 && times[i + 1] <= min) i++;
  const lo = times[i];
  const hi = times[i + 1] ?? lo;
  const ratio = hi > lo ? (min - lo) / (hi - lo) : 0;
  return PAD + (i + ratio) * GAP;
}

function toIndexed(items: TimelineItem[], indexOf: Map<number, number>): IndexedItem[] {
  return items.map(item => ({ ...item, startIdx: indexOf.get(item.startMin)!, endIdx: indexOf.get(item.endMin)! }));
}

// 겹치는 일정끼리는 묶어서 레인(lane)을 배정해 카드가 카드 뒤로 살짝 밀려 겹쳐 보이게 한다.
// 시간표는 여기 안 거치고 전체 너비 배경으로 따로 그림(PC 주간시간표와 같은 레이어 구조).
function layoutLanes(items: IndexedItem[]): PositionedItem[] {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const positioned: PositionedItem[] = [];
  let laneEnds: number[] = [];
  let clusterMaxLane = 0;
  let clusterStartIdx = 0;
  let currentEnd = -Infinity;

  const flushCluster = (fromIdx: number, toIdx: number, maxLane: number) => {
    for (let i = fromIdx; i < toIdx; i++) positioned[i].maxLane = maxLane;
  };

  sorted.forEach(item => {
    if (positioned.length === clusterStartIdx || item.startMin >= currentEnd) {
      flushCluster(clusterStartIdx, positioned.length, clusterMaxLane);
      laneEnds = [];
      clusterMaxLane = 0;
      clusterStartIdx = positioned.length;
      currentEnd = -Infinity;
    }
    let lane = laneEnds.findIndex(end => end <= item.startMin);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
    laneEnds[lane] = item.endMin;
    clusterMaxLane = Math.max(clusterMaxLane, lane);
    currentEnd = Math.max(currentEnd, item.endMin);
    positioned.push({ ...item, lane, maxLane: 0 });
  });
  flushCluster(clusterStartIdx, positioned.length, clusterMaxLane);

  return positioned;
}

// 모바일 홈의 "오늘 일정" 영역 - PC 주간시간표처럼 시작~종료 시간에 맞춰 세로 타임라인에 카드로
// 배치하지만, 실제로 분 단위로 비례시키지 않고 실제 일정이 있는 시각끼리만 고정 간격으로 둬서
// 빈 시간대가 공간을 차지하지 않게 한다. 겹치는 일정은 카드가 뒤로 살짝 밀려 겹쳐 보인다.
export default function MobileDayAgenda({ selectedDate, refreshKey, onScheduleChange }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [selectedTimetableGroup, setSelectedTimetableGroup] = useState<Timetable[] | null>(null);
  const [timetableModalMode, setTimetableModalMode] = useState<'view' | 'edit'>('view');

  const dateStr = toDateStr(selectedDate);

  useEffect(() => {
    getSchedules(dateStr, dateStr).then(setSchedules).catch(console.error);
  }, [dateStr, refreshKey]);

  useEffect(() => {
    getTimetables().then(setTimetables).catch(console.error);
  }, [refreshKey]);

  const alldayItems = schedules.filter(s =>
    (s.type === 'ALLDAY' || s.type === 'PERIOD') &&
    s.startDate <= dateStr && (s.endDate ?? s.startDate) >= dateStr
  );

  const items: TimelineItem[] = [];

  for (const s of schedules) {
    if (s.type === 'TIMED' && s.startTime) {
      const [sh, sm] = s.startTime.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = s.endTime
        ? (() => { const [eh, em] = s.endTime!.split(':').map(Number); return eh * 60 + em; })()
        : startMin;
      items.push({
        key: `s-${s.id}`,
        title: s.title,
        color: s.color || '#7c8cf8',
        startMin,
        endMin: Math.max(endMin, startMin),
        isTimetable: false,
        onClick: () => { setSelectedSchedule(s); setModalMode('view'); },
      });
    } else if (s.type === 'MOMENT' && s.startTime) {
      const [sh, sm] = s.startTime.split(':').map(Number);
      const startMin = sh * 60 + sm;
      items.push({
        key: `s-${s.id}`,
        title: s.title,
        color: s.color || '#7c8cf8',
        startMin,
        endMin: startMin,
        isTimetable: false,
        onClick: () => { setSelectedSchedule(s); setModalMode('view'); },
      });
    }
  }

  for (const t of timetables.filter(t => t.dayOfWeek === selectedDate.getDay())) {
    const [sh, sm] = t.startTime.slice(0, 5).split(':').map(Number);
    const [eh, em] = t.endTime.slice(0, 5).split(':').map(Number);
    items.push({
      key: `t-${t.id}`,
      title: t.title,
      color: t.color,
      startMin: sh * 60 + sm,
      endMin: eh * 60 + em,
      isTimetable: true,
      onClick: () => {
        const groupKey = t.groupId ?? t.id;
        setSelectedTimetableGroup(timetables.filter(x => (x.groupId ?? x.id) === groupKey));
        setTimetableModalMode('view');
      },
    });
  }

  const scheduleItems = items.filter(i => !i.isTimetable);
  const timetableItems = items.filter(i => i.isTimetable);
  const { times, indexOf, height } = buildTimeIndex(items);
  const positionedSchedules = layoutLanes(toIndexed(scheduleItems, indexOf));
  const positionedTimetables = toIndexed(timetableItems, indexOf);

  // 선택한 날짜가 오늘이면, PC 주간시간표처럼 지금 시각 표시선을 띄움
  const now = new Date();
  const isToday = selectedDate.toDateString() === now.toDateString();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowY = yOfMinute(nowMin, times);

  return (
    <div className={styles.container}>
      {alldayItems.length > 0 && (
        <div className={styles.alldayRow}>
          {alldayItems.map(s => (
            <div
              key={s.id}
              className={styles.alldayBadge}
              style={{ backgroundColor: s.color || '#7c8cf8', color: isLightColor(s.color || '#7c8cf8') ? 'var(--gray1)' : 'var(--white)' }}
              onClick={() => { setSelectedSchedule(s); setModalMode('view'); }}
            >
              {s.title}
            </div>
          ))}
        </div>
      )}

      <div className={styles.timeline} style={{ height }}>
          {/* 각 시각의 가로 눈금선 - 배경에 옅게 깔리고, 일정/시간표 카드보다 뒤에 있음(z-index 없음) */}
          {times.map((t, i) => (
            <div key={`line-${t}`} className={styles.hourLine} style={{ top: PAD + i * GAP }} />
          ))}
          <div className={styles.labels}>
            {times.map((t, i) => (
              <span key={t} className={styles.timeLabel} style={{ top: PAD + i * GAP }}>
                {formatMin(t)}
              </span>
            ))}
          </div>
          <div className={styles.track}>
            {/* 시간표(반복 일정) - PC 주간시간표처럼 전체 너비 배경으로 깔고, 일정보다 뒤에(z-index 낮게) */}
            {positionedTimetables.map(item => {
              const top = PAD + item.startIdx * GAP;
              const rawHeight = (item.endIdx - item.startIdx) * GAP;
              return (
                <div
                  key={item.key}
                  onClick={item.onClick}
                  className={[styles.cell, styles.timetableCell].join(' ')}
                  style={{
                    top: top + 2,
                    height: Math.max(rawHeight - 4, MIN_CELL_HEIGHT),
                    left: 0,
                    width: '100%',
                    backgroundColor: hexToRgba(item.color, 0.25),
                    borderColor: item.color,
                    zIndex: 1,
                  }}
                >
                  <div className={styles.cellTitle}>{item.title}</div>
                  <div className={styles.cellRange}>
                    {formatMin(item.startMin)}
                    {item.endMin !== item.startMin && ` – ${formatMin(item.endMin)}`}
                  </div>
                </div>
              );
            })}
            {/* 일정 - 시간표보다 안쪽(좌우 여백)에, 그 위(z-index 높게) */}
            {positionedSchedules.map(item => {
              const top = PAD + item.startIdx * GAP;
              const rawHeight = (item.endIdx - item.startIdx) * GAP;
              return (
                <div
                  key={item.key}
                  onClick={item.onClick}
                  className={styles.cell}
                  style={{
                    top: top + 2,
                    height: Math.max(rawHeight - 4, MIN_CELL_HEIGHT),
                    left: SCHEDULE_INSET_LEFT + item.lane * OFFSET,
                    width: `calc(100% - ${SCHEDULE_INSET_LEFT + SCHEDULE_INSET_RIGHT + item.maxLane * OFFSET}px)`,
                    backgroundColor: item.color,
                    color: isLightColor(item.color) ? 'var(--gray1)' : 'var(--white)',
                    zIndex: 10 + item.lane,
                  }}
                >
                  <div className={styles.cellTitle}>{item.title}</div>
                  <div className={styles.cellRange}>
                    {formatMin(item.startMin)}
                    {item.endMin !== item.startMin && ` – ${formatMin(item.endMin)}`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 지금 시각 표시선 - PC처럼 브랜드 컬러 선, 시각은 선 중앙이 아니라 왼쪽에 표시 */}
          {isToday && (
            <>
              <div className={styles.nowLine} style={{ top: nowY }} />
              <div className={styles.nowLabel} style={{ top: nowY }}>{formatMin(nowMin)}</div>
            </>
          )}
      </div>

      {selectedSchedule && modalMode === 'view' && (
        <ScheduleDetailModal
          schedule={selectedSchedule}
          onClose={() => setSelectedSchedule(null)}
          onEdit={() => setModalMode('edit')}
          onChanged={() => onScheduleChange()}
        />
      )}
      {selectedSchedule && modalMode === 'edit' && (
        <ScheduleEditModal
          schedule={selectedSchedule}
          onCancel={() => setModalMode('view')}
          onSaved={() => { onScheduleChange(); setSelectedSchedule(null); }}
          onDeleted={() => { onScheduleChange(); setSelectedSchedule(null); }}
        />
      )}
      {selectedTimetableGroup && timetableModalMode === 'view' && (
        <TimetableDetailModal
          timetables={selectedTimetableGroup}
          onClose={() => setSelectedTimetableGroup(null)}
          onEdit={() => setTimetableModalMode('edit')}
          onChanged={() => onScheduleChange()}
        />
      )}
      {selectedTimetableGroup && timetableModalMode === 'edit' && (
        <TimetableEditModal
          timetables={selectedTimetableGroup}
          onCancel={() => setTimetableModalMode('view')}
          onSaved={() => { onScheduleChange(); setSelectedTimetableGroup(null); }}
          onDeleted={() => { onScheduleChange(); setSelectedTimetableGroup(null); }}
        />
      )}
    </div>
  );
}
