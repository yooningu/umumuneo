import { useState } from 'react';
import ScheduleList from '../schedule/ScheduleList';
import MemoWidget from './MemoWidget';
import styles from './EtcPanel.module.css';

type PanelMode = 'schedule' | 'memo';

interface Props {
  selectedDate: Date;
  refreshKey: number;
  onScheduleChange: () => void;
}

// 홈 화면 미니캘린더 옆 "기타" 패널: 일정 목록 / 메모장을 상단 토글로 전환해서 보여준다
export default function EtcPanel({ selectedDate, refreshKey, onScheduleChange }: Props) {
  const [mode, setMode] = useState<PanelMode>('schedule');

  return (
    <div className={styles.container}>
      <div className={styles.toggleRow}>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.toggleBtn} ${mode === 'schedule' ? styles.toggleBtnActive : ''}`.trim()}
            onClick={() => setMode('schedule')}
          >
            일정
          </button>
          <button
            className={`${styles.toggleBtn} ${mode === 'memo' ? styles.toggleBtnActive : ''}`.trim()}
            onClick={() => setMode('memo')}
          >
            메모장
          </button>
        </div>
      </div>
      <div className={styles.body}>
        {mode === 'schedule' ? (
          <ScheduleList selectedDate={selectedDate} refreshKey={refreshKey} onScheduleChange={onScheduleChange} />
        ) : (
          <MemoWidget />
        )}
      </div>
    </div>
  );
}
