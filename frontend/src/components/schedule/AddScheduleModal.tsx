import { useState } from 'react';
import type { ScheduleType, RepeatRule } from '../../types';
import { createSchedule } from '../../api/schedule';
import { createTimetable } from '../../api/timetable';
import { toDateStr } from '../../utils/date';
import styles from './ScheduleModal.module.css';

interface Props {
  defaultDate?: string; // 일정 모드일 때 기본으로 채울 날짜 (YYYY-MM-DD)
  onCancel: () => void;
  onSaved: () => void;
}

type Mode = 'schedule' | 'timetable';

const TYPE_OPTIONS: { type: ScheduleType; label: string }[] = [
  { type: 'TIMED', label: '시간 일정' },
  { type: 'MOMENT', label: '시각 일정' },
  { type: 'PERIOD', label: '기간 일정' },
  { type: 'ALLDAY', label: '종일 일정' },
];

const REPEAT_OPTIONS: { value: RepeatRule | null; label: string }[] = [
  { value: null, label: '안 함' },
  { value: 'BIWEEKLY', label: '격주' },
  { value: 'MONTHLY', label: '매월' },
  { value: 'YEARLY', label: '매년' },
];

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']; // 백엔드 dayOfWeek: 0(일)~6(토)

// 시간표 전용 색상 8가지 - 일정(Schedule)은 서버가 자동으로 배정하는 색을 쓰고,
// 시간표는 이 중에서 직접 고르게 해서 서로 다른 색 체계를 쓰게 함
export const TIMETABLE_COLORS = [
  '#53D8D1', '#5EE0CB', '#5FC6D0', '#9FECF5',
  '#FDB487', '#FDBA63', '#FDDBAE', '#FFEAA0',
];

// 타입별로 어떤 날짜/시간 입력을 보여줄지 (일정 모드)
function showEndDate(type: ScheduleType) { return type === 'PERIOD'; }
function showStartTime(type: ScheduleType) { return type === 'TIMED' || type === 'MOMENT'; }
function showEndTime(type: ScheduleType) { return type === 'TIMED'; }

// "일정 추가"와 "시간표 추가"를 하나로 합친 모달. 헤더의 토글로 일정/시간표를 전환한다.
// (수정은 각자 ScheduleEditModal/TimetableEditModal에서 따로 하고, 여긴 새로 추가할 때만 씀)
export default function AddScheduleModal({ defaultDate, onCancel, onSaved }: Props) {
  const [mode, setMode] = useState<Mode>('schedule');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  // 일정 모드 전용 상태
  const [type, setType] = useState<ScheduleType>('ALLDAY');
  const [description, setDescription] = useState('');
  const todayStr = defaultDate ?? toDateStr(new Date());
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [repeatRule, setRepeatRule] = useState<RepeatRule | null>(null);
  const [notifOn, setNotifOn] = useState(false);
  const [offsetMin, setOffsetMin] = useState(5);

  // 시간표 모드 전용 상태
  const [selectedDays, setSelectedDays] = useState<number[]>([new Date().getDay()]);
  const [color, setColor] = useState(TIMETABLE_COLORS[0]);

  // 일정/시간표 공통으로 쓰는 시간 입력
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const toggleNotif = () => setNotifOn(v => !v);
  const toggleDay = (day: number) => {
    setSelectedDays(prev => (
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    ));
  };

  const handleSave = async () => {
    if (!title.trim() || saving) return;
    if (mode === 'timetable' && (!startTime || !endTime || selectedDays.length === 0)) return;
    setSaving(true);
    try {
      if (mode === 'schedule') {
        await createSchedule({
          type,
          title: title.trim(),
          description: description.trim() || undefined,
          startDate,
          endDate: showEndDate(type) ? endDate : undefined,
          startTime: showStartTime(type) && startTime ? `${startTime}:00` : undefined,
          endTime: showEndTime(type) && endTime ? `${endTime}:00` : undefined,
          notifOffsetMin: notifOn ? offsetMin : undefined,
          repeatRule: repeatRule ?? undefined,
        });
      } else {
        // 요일마다 시간표를 하나씩 만든다 (백엔드 한 행당 요일 하나)
        await Promise.all(selectedDays.map(dayOfWeek => createTimetable({
          title: title.trim(),
          color,
          dayOfWeek,
          startTime: `${startTime}:00`,
          endTime: `${endTime}:00`,
        })));
      }
      onSaved();
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={`${styles.card} ${styles.cardEdit}`} onClick={e => e.stopPropagation()}>
        <div className={`${styles.header} ${styles.headerEdit}`}>
          <div className={styles.modeToggle}>
            <button
              className={`${styles.modeToggleBtn} ${mode === 'schedule' ? styles.modeToggleBtnActive : ''}`}
              onClick={() => setMode('schedule')}
            >
              일정
            </button>
            <button
              className={`${styles.modeToggleBtn} ${mode === 'timetable' ? styles.modeToggleBtnActive : ''}`}
              onClick={() => setMode('timetable')}
            >
              시간표
            </button>
          </div>
        </div>

        <div className={styles.formGroup}>
          <span className={styles.label}>제목</span>
          <input className={styles.input} value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        {mode === 'schedule' ? (
          <>
            <div className={styles.formGroup}>
              <span className={styles.label}>유형</span>
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
              <span className={styles.label}>반복</span>
              <div className={styles.typeRow}>
                {REPEAT_OPTIONS.map(opt => (
                  <button
                    key={opt.label}
                    className={`${styles.typeBtn} ${repeatRule === opt.value ? styles.typeBtnActive : ''}`}
                    onClick={() => setRepeatRule(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

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
          </>
        ) : (
          <>
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
          </>
        )}

        <div className={styles.editFooter}>
          <div className={styles.footerRight}>
            <button className={styles.pillBtn} onClick={onCancel}>취소</button>
            <button className={`${styles.pillBtn} ${styles.pillBtnPrimary}`} onClick={handleSave} disabled={saving}>저장</button>
          </div>
        </div>
      </div>
    </div>
  );
}
