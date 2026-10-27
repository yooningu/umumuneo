import { useState } from 'react';
import { IoClose } from "react-icons/io5";
import type { Timetable } from '../../types';
import { deleteTimetableGroup } from '../../api/timetable';
import styles from './ScheduleModal.module.css';

interface Props {
  timetables: Timetable[]; // 같은 묶음(요일만 다름, 나머지는 동일)
  onClose: () => void;
  onEdit: () => void;
  onChanged: () => void;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']; // 백엔드 dayOfWeek: 0(일)~6(토)

export default function TimetableDetailModal({ timetables, onClose, onEdit, onChanged }: Props) {
  const [deleting, setDeleting] = useState(false);
  const first = timetables[0];
  const dayLabel = [...timetables]
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map(t => DAY_LABELS[t.dayOfWeek])
    .join(', ');

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteTimetableGroup(first.groupId ?? first.id);
      onChanged();
      onClose();
    } catch (e) {
      console.error(e);
      setDeleting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <span className={styles.dot} style={{ backgroundColor: first.color }} />
            {first.title}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <IoClose />
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.body}>
          <div className={styles.infoRow}>
            <span className={`${styles.dot} ${styles.dotSmall}`} style={{ backgroundColor: 'var(--gray2)' }} />
            시간표
          </div>
          <div className={styles.infoRow}>
            <span className={`${styles.dot} ${styles.dotSmall}`} style={{ backgroundColor: 'var(--gray2)' }} />
            매주 {dayLabel}요일
          </div>
          <div className={styles.infoRow}>
            <span className={`${styles.dot} ${styles.dotSmall}`} style={{ backgroundColor: 'var(--gray2)' }} />
            {first.startTime.slice(0, 5)} ~ {first.endTime.slice(0, 5)}
          </div>
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
