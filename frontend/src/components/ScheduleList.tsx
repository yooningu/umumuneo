import { useState, useEffect } from 'react';
import { getSchedules } from '../api/schedule';
import type { Schedule } from '../types';
import { toDateStr } from '../utils/date';
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
      .then(setSchedules)
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
