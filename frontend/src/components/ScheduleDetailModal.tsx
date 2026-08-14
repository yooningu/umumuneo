import { useState } from 'react';
import type { Schedule } from '../types';
import { deleteSchedule } from '../api/schedule';
import styles from './ScheduleModal.module.css';

interface Props {
  schedule: Schedule;
  onClose: () => void;
  onEdit: () => void;
  onChanged: () => void;
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

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
    if (!window.confirm('이 일정을 삭제할까요?')) return;
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
            <CloseIcon />
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.body}>
          <div className={styles.infoRow}>
            <span className={styles.dot} style={{ backgroundColor: schedule.color || '#7c8cf8' }} />
            {formatDateRow(schedule)}
          </div>
          {timeRow && (
            <div className={styles.infoRow}>
              <span className={styles.dot} style={{ backgroundColor: schedule.color || '#7c8cf8' }} />
              {timeRow}
            </div>
          )}
          {schedule.description && (
            <div className={styles.infoRow}>{schedule.description}</div>
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
