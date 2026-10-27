import { useState, useEffect } from 'react';
import { getSchedules } from '../../api/schedule';
import type { Schedule } from '../../types';
import { toDateStr } from '../../utils/date';
import ScheduleDetailModal from './ScheduleDetailModal';
import ScheduleEditModal from './ScheduleEditModal';
import styles from './ScheduleList.module.css';

interface Props {
  selectedDate: Date;
  refreshKey?: number;
  onScheduleChange?: () => void;
}

interface DateGroup {
  dateStr: string;
  label: string;
  items: Schedule[];
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${m}월 ${d}일 (${DAY_LABELS[date.getDay()]})`;
}

function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${m}월 ${d}일`;
}

// 격주/매월/매년 반복 일정은 백엔드가 조회 기간(여기선 1년치) 안의 발생 횟수만큼 가상으로 펼쳐서
// 내려주는데(같은 id, 날짜만 다름), 이 목록에서는 너무 많아지지 않도록 그 중 가장 가까운(이른) 발생
// 1개만 남긴다. 반복 없는 일정은 그대로 둔다. 달력/시간표 쪽은 이 처리를 안 해서 전체 발생이 다 보임.
function dedupeRepeating(list: Schedule[]): Schedule[] {
  const nonRepeating = list.filter(s => !s.repeatRule);
  const nearestById = new Map<string, Schedule>();
  for (const s of list) {
    if (!s.repeatRule) continue;
    const existing = nearestById.get(s.id);
    if (!existing || s.startDate < existing.startDate) {
      nearestById.set(s.id, s);
    }
  }
  return [...nonRepeating, ...nearestById.values()];
}

export default function ScheduleList({ selectedDate, refreshKey, onScheduleChange }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');

  // 오늘부터 1년치를 조회 (선택한 날짜와 무관하게 항상 오늘 이후의 모든 일정을 보여줌)
  useEffect(() => {
    const today = new Date();
    const from = toDateStr(today);
    const future = new Date(today);
    future.setFullYear(future.getFullYear() + 1);
    const to = toDateStr(future);
    getSchedules(from, to)
      .then(data => {
        const deduped = dedupeRepeating(data);
        // 내용이 실제로 바뀌지 않았으면 이전 배열을 그대로 돌려줘서(참조 동일) 불필요한 재렌더링을 막음
        setSchedules(prev => (JSON.stringify(prev) === JSON.stringify(deduped) ? prev : deduped));
      })
      .catch(console.error);
  }, [refreshKey]);

  const todayStr = toDateStr(new Date());
  const selectedDateStr = toDateStr(selectedDate);

  // 날짜별로 묶기. 오늘보다 앞서 시작한 기간(PERIOD) 일정은 오늘 칸에 묶어서 보여준다.
  const groupsMap = new Map<string, Schedule[]>();
  for (const s of schedules) {
    const key = s.startDate < todayStr ? todayStr : s.startDate;
    const arr = groupsMap.get(key) ?? [];
    arr.push(s);
    groupsMap.set(key, arr);
  }
  const groups: DateGroup[] = [...groupsMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateStr, items]) => ({
      dateStr,
      label: formatDateLabel(dateStr),
      items: [...items].sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '')),
    }));

  return (
    <div className={styles.container}>
      {groups.length === 0 ? (
        <div className={styles.empty}>다가오는 일정이 없습니다</div>
      ) : (
        groups.map(group => (
          <div key={group.dateStr} className={styles.dateGroup}>
            <div className={`${styles.dateLabel} ${group.dateStr === selectedDateStr ? styles.dateLabelActive : ''}`}>
              {group.label}
            </div>
            {group.items.map(s => (
              <div
                key={s.id}
                className={styles.item}
                onClick={() => { setSelectedSchedule(s); setModalMode('view'); }}
              >
                <div className={styles.colorBar} style={{ backgroundColor: s.color || '#7c8cf8' }} />
                <div className={styles.itemBody}>
                  <div className={styles.itemTitle}>{s.title}</div>
                  {s.startTime && (
                    <div className={styles.itemTime}>
                      {s.startTime.slice(0, 5)}{s.endTime ? ` - ${s.endTime.slice(0, 5)}` : ''}
                    </div>
                  )}
                  {s.type === 'PERIOD' && s.endDate && (
                    <div className={styles.itemTime}>
                      {formatShortDate(s.startDate)} ~ {formatShortDate(s.endDate)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))
      )}

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
