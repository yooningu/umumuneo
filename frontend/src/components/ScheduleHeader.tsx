import styles from './ScheduleHeader.module.css';

export type ScheduleViewMode = 'scheduler' | 'calendar';

interface Props {
  viewMode: ScheduleViewMode;
  onViewModeChange: (mode: ScheduleViewMode) => void;
  rangeLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onAdd: () => void;
}

// 일정 페이지 상단 바: 제목 + 기간 이동(prev/next/오늘) + 스케줄러/캘린더 보기 전환 + 일정 추가 버튼
export default function ScheduleHeader({
  viewMode, onViewModeChange, rangeLabel, onPrev, onNext, onToday, onAdd,
}: Props) {
  return (
    <div className={styles.header}>
      <div className={styles.left}>
        <span className={styles.title}>스케줄캘린더</span>
        <button className={styles.navCircle} onClick={onPrev} aria-label="이전">‹</button>
        <span className={styles.rangeLabel}>{rangeLabel}</span>
        <button className={styles.navCircle} onClick={onNext} aria-label="다음">›</button>
        <button className={styles.todayBtn} onClick={onToday}>오늘</button>

        <div className={styles.viewToggle}>
          <button
            className={`${styles.toggleBtn} ${viewMode === 'scheduler' ? styles.toggleBtnActive : ''}`.trim()}
            onClick={() => onViewModeChange('scheduler')}
          >
            스케줄러
          </button>
          <button
            className={`${styles.toggleBtn} ${viewMode === 'calendar' ? styles.toggleBtnActive : ''}`.trim()}
            onClick={() => onViewModeChange('calendar')}
          >
            캘린더
          </button>
        </div>
      </div>

      <button className={styles.addBtn} onClick={onAdd}>일정 추가</button>
    </div>
  );
}
