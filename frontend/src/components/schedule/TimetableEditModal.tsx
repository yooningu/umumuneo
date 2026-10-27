import { useState } from 'react';
import { IoClose } from "react-icons/io5";
import type { Timetable } from '../../types';
import { updateTimetableGroup, deleteTimetableGroup } from '../../api/timetable';
import { TIMETABLE_COLORS } from './AddScheduleModal';
import TimeField from '../common/TimeField';
import styles from './ScheduleModal.module.css';

interface Props {
  timetables: Timetable[]; // 같은 묶음(요일만 다름, 나머지는 동일)
  onCancel: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']; // 백엔드 dayOfWeek: 0(일)~6(토)

export default function TimetableEditModal({ timetables, onCancel, onSaved, onDeleted }: Props) {
  const first = timetables[0];
  const groupKey = first.groupId ?? first.id;
  const [title, setTitle] = useState(first.title);
  const [color, setColor] = useState(first.color);
  const [selectedDays, setSelectedDays] = useState<number[]>(timetables.map(t => t.dayOfWeek));
  const [startTime, setStartTime] = useState(first.startTime.slice(0, 5));
  const [endTime, setEndTime] = useState(first.endTime.slice(0, 5));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toggleDay = (day: number) => {
    setSelectedDays(prev => (
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    ));
  };

  const handleSave = async () => {
    if (!title.trim() || !startTime || !endTime || selectedDays.length === 0 || saving) return;
    setSaving(true);
    try {
      await updateTimetableGroup(groupKey, {
        title: title.trim(),
        color,
        dayOfWeeks: selectedDays,
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
      await deleteTimetableGroup(groupKey);
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
                className={`${styles.typeBtn} ${selectedDays.includes(i) ? styles.typeBtnActive : ''}`}
                onClick={() => toggleDay(i)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.formGroup}>
          <span className={styles.label}>시간</span>
          <div className={styles.row2}>
            <TimeField value={startTime} onChange={setStartTime} />
            <TimeField value={endTime} onChange={setEndTime} />
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
