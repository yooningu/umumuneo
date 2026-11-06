import styles from './HomeMobileToggle.module.css';

export type HomeMobileView = 'schedule' | 'event';
export type HomeEventMode = 'list' | 'memo';

interface Props {
  view: HomeMobileView;
  eventMode: HomeEventMode;
  onViewChange: (view: HomeMobileView) => void;
  onEventModeChange: (mode: HomeEventMode) => void;
}

// 모바일 홈의 메인 토글: 왼쪽 "스케줄" / 오른쪽 "일정". "일정" 쪽을 고르면 그 버튼 자리가
// 다시 "일정 | 메모" 둘로 나뉜 작은 토글로 바뀜. 뒤에 깔린 색칠된 thumb이 PC(ScheduleHeader)의
// 스케줄러/캘린더 토글처럼 왼쪽<->오른쪽으로 슬라이드되고, 버튼들은 그 위에서 글자색만 바뀜
export default function HomeMobileToggle({ view, eventMode, onViewChange, onEventModeChange }: Props) {
  return (
    <div className={styles.track}>
      <div className={`${styles.thumb} ${view === 'event' ? styles.thumbRight : ''}`.trim()} />

      <button
        type="button"
        className={`${styles.scheduleBtn} ${view === 'schedule' ? styles.scheduleBtnActive : ''}`.trim()}
        onClick={() => onViewChange('schedule')}
      >
        스케줄
      </button>

      {view === 'schedule' ? (
        <button
          type="button"
          className={styles.eventBtnCollapsed}
          onClick={() => onViewChange('event')}
        >
          일정
        </button>
      ) : (
        <div className={styles.eventSplit}>
          <div className={`${styles.eventSplitThumb} ${eventMode === 'memo' ? styles.eventSplitThumbRight : ''}`.trim()} />
          <button
            type="button"
            className={`${styles.eventSplitBtn} ${eventMode === 'list' ? styles.eventSplitBtnActive : ''}`.trim()}
            onClick={() => onEventModeChange('list')}
          >
            일정
          </button>
          <button
            type="button"
            className={`${styles.eventSplitBtn} ${eventMode === 'memo' ? styles.eventSplitBtnActive : ''}`.trim()}
            onClick={() => onEventModeChange('memo')}
          >
            메모
          </button>
        </div>
      )}
    </div>
  );
}
