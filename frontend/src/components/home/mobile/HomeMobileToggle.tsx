import styles from './HomeMobileToggle.module.css';

export type HomeMobileView = 'schedule' | 'event';
export type HomeEventMode = 'list' | 'memo';

interface Props {
  view: HomeMobileView;
  eventMode: HomeEventMode;
  onViewChange: (view: HomeMobileView) => void;
  onEventModeChange: (mode: HomeEventMode) => void;
}

// 모바일 홈의 메인 토글: 스케줄 / 일정 / 메모 셋이 한 줄에 나란히 평평하게 놓임.
// 뒤에 깔린 색칠된 thumb이 PC(ScheduleHeader)의 스케줄러/캘린더 토글처럼 활성화된
// 위치로 슬라이드되고, 버튼들은 그 위에서 글자색만 바뀜
export default function HomeMobileToggle({ view, eventMode, onViewChange, onEventModeChange }: Props) {
  const activeIndex = view === 'schedule' ? 0 : eventMode === 'list' ? 1 : 2;

  return (
    <div className={styles.track}>
      <div
        className={styles.thumb}
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />

      <button
        type="button"
        className={`${styles.toggleBtn} ${view === 'schedule' ? styles.toggleBtnActive : ''}`.trim()}
        onClick={() => onViewChange('schedule')}
      >
        스케줄
      </button>
      <button
        type="button"
        className={`${styles.toggleBtn} ${view === 'event' && eventMode === 'list' ? styles.toggleBtnActive : ''}`.trim()}
        onClick={() => { onViewChange('event'); onEventModeChange('list'); }}
      >
        일정
      </button>
      <button
        type="button"
        className={`${styles.toggleBtn} ${view === 'event' && eventMode === 'memo' ? styles.toggleBtnActive : ''}`.trim()}
        onClick={() => { onViewChange('event'); onEventModeChange('memo'); }}
      >
        메모
      </button>
    </div>
  );
}
