import { useState } from 'react';
import { IoClose } from "react-icons/io5";
import type { Timetable } from '../../types';
import { updateTimetable, deleteTimetable } from '../../api/timetable';
import { TIMETABLE_COLORS } from './AddScheduleModal';
import styles from './ScheduleModal.module.css';

interface Props {
  timetable: Timetable;
  onCancel: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']; // 백엔드 dayOfWeek: 0(일)~6(토)

export default function TimetableEditModal({ timetable, onCancel, onSaved, onDeleted }: Props) {
  const [title, setTitle] = useState(timetable.title);
  const [color, setColor] = useState(timetable.color);
  const [dayOfWeek, setDayOfWeek] = useState(timetable.dayOfWeek);
  const [startTime, setStartTime] = useState(timetable.startTime.slice(0, 5));
  const [endTime, setEndTime] = useState(timetable.endTime.slice(0, 5));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !startTime || !endTime || saving) return;
    setSaving(true);
    try {
      await updateTimetable(timetable.id, {
        title: title.trim(),
        color,
        dayOfWeek,
        startTime: `${startTime}:00`,
        endTime: `${endTime}:00`,
      });
      onSaved();
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteTimetable(timetable.id);
      onDeleted();
    } catch (e) {
      console.error(e);
      setDeleting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={`${styles.card} ${styles.cardEdit}`} onClick={e => e.stopPropagation()}>
        <div className={`${styles.header} ${styles.headerEdit}`}>
          <div className={styles.headerTitle}>시간표 수정</div>
          <button className={styles.closeBtn} onClick={onCancel}><IoClose /></button>
        </div>

        <div className={styles.formGroup}>
          <span className={styles.label}>제목</span>
          <input className={styles.input} value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div className={styles.formGroup}>
          <span className={styles.label}>요일</span>
          <div className={styles.typeRow}>
            {DAY_LABELS.map((label, i) => (
              <button
                key={label}
                className={`${styles.typeBtn} ${dayOfWeek === i ? styles.typeBtnActive : ''}`}
                onClick={() => setDayOfWeek(i)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.formGroup}>
          <span className={styles.label}>시간</span>
          <div className={styles.row2}>
            <input type="time" step={300} className={styles.input} value={startTime} onChange={e => setStartTime(e.target.value)} />
            <input type="time" step={300} className={styles.input} value={endTime} onChange={e => setEndTime(e.target.value)} />
          </div>
        </div>

        <div className={styles.formGroup}>
          <span className={styles.label}>색상</span>
          <div className={styles.colorRow}>
            {TIMETABLE_COLORS.map(c => (
              <button
                key={c}
                className={`${styles.colorSwatch} ${color === c ? styles.colorSwatchActive : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        <div className={styles.editFooter}>
          <button className={`${styles.pillBtn} ${styles.pillBtnDelete}`} onClick={handleDelete} disabled={deleting}>삭제</button>
          <div className={styles.footerRight}>
            <button className={styles.pillBtn} onClick={onCancel}>취소</button>
            <button className={`${styles.pillBtn} ${styles.pillBtnPrimary}`} onClick={handleSave} disabled={saving}>저장</button>
          </div>
        </div>
      </div>
    </div>
  );
}
