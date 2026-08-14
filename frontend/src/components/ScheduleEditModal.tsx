import { useState } from 'react';
import type { Schedule, ScheduleType } from '../types';
import { updateSchedule, deleteSchedule } from '../api/schedule';
import styles from './ScheduleModal.module.css';

interface Props {
  schedule: Schedule;
  onCancel: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

const TYPE_OPTIONS: { type: ScheduleType; label: string }[] = [
  { type: 'TIMED', label: '시간 일정' },
  { type: 'MOMENT', label: '시각 일정' },
  { type: 'PERIOD', label: '기간 일정' },
  { type: 'ALLDAY', label: '종일 일정' },
];

// 타입별로 어떤 날짜/시간 입력을 보여줄지
function showEndDate(type: ScheduleType) { return type === 'PERIOD'; }
function showStartTime(type: ScheduleType) { return type === 'TIMED' || type === 'MOMENT'; }
function showEndTime(type: ScheduleType) { return type === 'TIMED'; }

export default function ScheduleEditModal({ schedule, onCancel, onSaved, onDeleted }: Props) {
  const [type, setType] = useState<ScheduleType>(schedule.type);
  const [title, setTitle] = useState(schedule.title);
  const [description, setDescription] = useState(schedule.description ?? '');
  const [startDate, setStartDate] = useState(schedule.startDate);
  const [endDate, setEndDate] = useState(schedule.endDate ?? schedule.startDate);
  const [startTime, setStartTime] = useState(schedule.startTime ? schedule.startTime.slice(0, 5) : '');
  const [endTime, setEndTime] = useState(schedule.endTime ? schedule.endTime.slice(0, 5) : '');
  const [notifOn, setNotifOn] = useState(!!schedule.notification);
  const [offsetMin, setOffsetMin] = useState(schedule.notification?.offsetMin ?? 5);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toggleNotif = () => setNotifOn(v => !v);

  const handleSave = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await updateSchedule(schedule.id, {
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        startDate,
        endDate: showEndDate(type) ? endDate : undefined,
        startTime: showStartTime(type) && startTime ? `${startTime}:00` : undefined,
        endTime: showEndTime(type) && endTime ? `${endTime}:00` : undefined,
        notifOffsetMin: notifOn ? offsetMin : undefined,
      });
      onSaved();
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    if (!window.confirm('이 일정을 삭제할까요?')) return;
    setDeleting(true);
    try {
      await deleteSchedule(schedule.id);
      onDeleted();
    } catch (e) {
      console.error(e);
      setDeleting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>일정 수정</div>
          <button className={styles.closeBtn} onClick={onCancel}>×</button>
        </div>

        <div className={styles.formGroup}>
          <span className={styles.label}>제목</span>
          <input className={styles.input} value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div className={styles.typeRow}>
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt.type}
              className={`${styles.typeBtn} ${type === opt.type ? styles.typeBtnActive : ''}`}
              onClick={() => setType(opt.type)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className={styles.formGroup}>
          <span className={styles.label}>날짜</span>
          <div className={styles.row2}>
            <input type="date" className={styles.input} value={startDate} onChange={e => setStartDate(e.target.value)} />
            {showEndDate(type) && (
              <input type="date" className={styles.input} value={endDate} onChange={e => setEndDate(e.target.value)} />
            )}
          </div>
        </div>

        {showStartTime(type) && (
          <div className={styles.formGroup}>
            <span className={styles.label}>시간</span>
            <div className={styles.row2}>
              <input type="time" step={300} className={styles.input} value={startTime} onChange={e => setStartTime(e.target.value)} />
              {showEndTime(type) && (
                <input type="time" step={300} className={styles.input} value={endTime} onChange={e => setEndTime(e.target.value)} />
              )}
            </div>
          </div>
        )}

        <div className={styles.formGroup}>
          <span className={styles.label}>설명</span>
          <textarea className={styles.textarea} value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <div className={styles.notifRow}>
          <span className={styles.label}>카카오톡 알림</span>
          <button className={`${styles.toggle} ${notifOn ? styles.toggleOn : ''}`} onClick={toggleNotif}>
            <span className={`${styles.toggleKnob} ${notifOn ? styles.toggleOnKnob : ''}`} />
          </button>
        </div>

        {notifOn && (
          <div className={styles.formGroup}>
            <span className={styles.label}>몇 분 전에 알림을 보낼까요</span>
            <input
              type="number"
              min={0}
              className={`${styles.input} ${styles.offsetInput}`}
              value={offsetMin}
              onChange={e => setOffsetMin(Number(e.target.value))}
            />
          </div>
        )}

        <div className={styles.footer}>
          <button className={`${styles.footerBtn} ${styles.deleteBtn}`} onClick={handleDelete} disabled={deleting}>삭제</button>
          <div className={styles.footerBtnDivider} />
          <button className={styles.footerBtn} onClick={onCancel}>취소</button>
          <div className={styles.footerBtnDivider} />
          <button className={`${styles.footerBtn} ${styles.primaryBtn}`} onClick={handleSave} disabled={saving}>저장</button>
        </div>
      </div>
    </div>
  );
}
