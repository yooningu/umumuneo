import { useState, type ReactNode } from 'react';
import { CiMemoPad } from 'react-icons/ci';
import { AiOutlineSchedule } from 'react-icons/ai';
import { FaBus } from 'react-icons/fa6';
import ScheduleList from '../schedule/ScheduleList';
import MemoWidget from './MemoWidget';
import BusWidget from './BusWidget';
import styles from './EtcPanel.module.css';

type PanelMode = 'schedule' | 'memo' | 'bus';

const MODE_OPTIONS: { value: PanelMode; label: string; icon: ReactNode }[] = [
  { value: 'schedule', label: '일정', icon: <AiOutlineSchedule /> },
  { value: 'memo', label: '메모장', icon: <CiMemoPad /> },
  { value: 'bus', label: '버스', icon: <FaBus /> },
];

interface Props {
  selectedDate: Date;
  refreshKey: number;
  onScheduleChange: () => void;
}

// 홈 화면 미니캘린더 옆 "기타" 패널: 일정 목록 / 메모장 / 버스를 상단 토글로 전환해서 보여준다
export default function EtcPanel({ selectedDate, refreshKey, onScheduleChange }: Props) {
  const [mode, setMode] = useState<PanelMode>('schedule');
  const activeIndex = MODE_OPTIONS.findIndex(o => o.value === mode);

  return (
    <div className={styles.container}>
      <div className={styles.toggleRow}>
        <div className={styles.viewToggle}>
          <div className={styles.toggleThumb} style={{ transform: `translateX(${activeIndex * 100}%)` }} />
          {MODE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`${styles.toggleBtn} ${mode === opt.value ? styles.toggleBtnActive : ''}`.trim()}
              onClick={() => setMode(opt.value)}
            >
              <span className={styles.btnText}>{opt.label}</span>
              <span className={styles.btnIcon}>{opt.icon}</span>
            </button>
          ))}
        </div>
      </div>
      <div className={styles.body}>
        {mode === 'schedule' && (
          <ScheduleList selectedDate={selectedDate} refreshKey={refreshKey} onScheduleChange={onScheduleChange} />
        )}
        {mode === 'memo' && <MemoWidget />}
        {mode === 'bus' && <BusWidget />}
      </div>
    </div>
  );
}
