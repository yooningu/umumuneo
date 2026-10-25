import { useState, useEffect } from 'react';
import { getSchedules } from '../../api/schedule';
import type { Schedule } from '../../types';
import { toDateStr } from '../../utils/date';
import ScheduleDetailModal from './ScheduleDetailModal';
import ScheduleEditModal from './ScheduleEditModal';
import styles from './DaySchedulePanel.module.css';

interface Props {
  date: Date;
  refreshKey?: number;
  onScheduleChange?: () => void;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateLabel(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${DAY_LABELS[date.getDay()]})`;
}

// 특정 하루를 콕 집어서 그 날의 일정만 보여주는 패널 (캘린더에서 날짜 클릭했을 때 사용).
// "다가오는 일정" 전체를 보여주는 ScheduleList와는 달리 딱 하루치만 보여줌.
export default function DaySchedulePanel({ date, refreshKey, onScheduleChange }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');

  const dateStr = toDateStr(date);

  useEffect(() => {
    getSchedules(dateStr, dateStr)
      .then(setSchedules)
      .catch(console.error);
  }, [dateStr, refreshKey]);

  const sorted = [...schedules].sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));

  return (
    <div className={styles.container}>
      <div className={styles.dateHeader}>{formatDateLabel(date)}</div>

      <div className={styles.list}>
        {sorted.length === 0 ? (
          <div className={styles.empty}>이 날의 일정이 없습니다</div>
        ) : (
          sorted.map(s => (
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
          ))
        )}
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
