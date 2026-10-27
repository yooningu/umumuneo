import { useState } from 'react';
import { IoClose } from "react-icons/io5";
import type { Schedule, ScheduleType } from '../../types';
import { deleteSchedule } from '../../api/schedule';
import styles from './ScheduleModal.module.css';

interface Props {
  schedule: Schedule;
  onClose: () => void;
  onEdit: () => void;
  onChanged: () => void;
}

const TYPE_LABELS: Record<ScheduleType, string> = {
  TIMED: '시간 일정',
  MOMENT: '시각 일정',
  PERIOD: '기간 일정',
  ALLDAY: '종일 일정',
};

function formatDateRow(s: Schedule): string {
  if (s.type === 'PERIOD') return `${s.startDate} ~ ${s.endDate ?? s.startDate}`;
  return s.startDate;
}

function formatTimeRow(s: Schedule): string | null {
  if (s.type === 'TIMED' && s.startTime) {
    return `${s.startTime.slice(0, 5)} ~ ${s.endTime ? s.endTime.slice(0, 5) : ''}`;
  }
  if (s.type === 'MOMENT' && s.startTime) {
    return s.startTime.slice(0, 5);
  }
  return null;
}

export default function ScheduleDetailModal({ schedule, onClose, onEdit, onChanged }: Props) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteSchedule(schedule.id);
      onChanged();
      onClose();
    } catch (e) {
      console.error(e);
      setDeleting(false);
    }
  };

  const timeRow = formatTimeRow(schedule);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <span className={styles.dot} style={{ backgroundColor: schedule.color || '#7c8cf8' }} />
            {schedule.title}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <IoClose />
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.body}>
          <div className={styles.infoRow}>
            <span className={`${styles.dot} ${styles.dotSmall}`} style={{ backgroundColor: 'var(--gray2)' }} />
            {TYPE_LABELS[schedule.type]}
          </div>
          <div className={styles.infoRow}>
            <span className={`${styles.dot} ${styles.dotSmall}`} style={{ backgroundColor: 'var(--gray2)' }} />
            {formatDateRow(schedule)}
          </div>
          {timeRow && (
            <div className={styles.infoRow}>
              <span className={`${styles.dot} ${styles.dotSmall}`} style={{ backgroundColor: 'var(--gray2)' }} />
              {timeRow}
            </div>
          )}
          {schedule.description && (
            <div className={styles.infoRow}>
              <span className={`${styles.dot} ${styles.dotSmall}`} style={{ backgroundColor: 'var(--gray2)' }} />
              {schedule.description}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.footerBtn} onClick={onEdit}>수정</button>
          <div className={styles.footerBtnDivider} />
          <button className={`${styles.footerBtn} ${styles.deleteBtn}`} onClick={handleDelete} disabled={deleting}>삭제</button>
        </div>
      </div>
    </div>
  );
}
