import MobileCalendarGrid from './MobileCalendarGrid';
import MobileDayAgenda from './MobileDayAgenda';
import styles from './MobileSchedulePanel.module.css';

interface Props {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  refreshKey: number;
  onScheduleChange: () => void;
  onRequestAddSchedule?: (dateStr: string) => void;
}

const MIN_PEEK = 72; // 달력을 완전히 펼쳐도 그 아래 하루 일정이 이만큼은 보이게 남겨둠

// 모바일 홈의 "스케줄" 토글 안쪽 - 위쪽엔 주/월 달력(MobileCalendarGrid, 자체 손잡이로 펼침·접힘과
// 좌우 스와이프를 전부 담당), 아래엔 선택한 날짜의 하루 일정(MobileDayAgenda)
export default function MobileSchedulePanel({ selectedDate, onDateSelect, refreshKey, onScheduleChange, onRequestAddSchedule }: Props) {
  return (
    <div className={styles.panel}>
      <div className={styles.topArea}>
        <MobileCalendarGrid selectedDate={selectedDate} onDateSelect={onDateSelect} refreshKey={refreshKey} />
      </div>

      <div className={styles.dayTimeline} style={{ minHeight: MIN_PEEK }}>
        <MobileDayAgenda
          selectedDate={selectedDate}
          refreshKey={refreshKey}
          onScheduleChange={onScheduleChange}
          onRequestAddSchedule={onRequestAddSchedule}
        />
      </div>
    </div>
  );
}
