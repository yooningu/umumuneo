import { useState } from 'react';
import HomeMobileTopBar from '../components/home/mobile/HomeMobileTopBar';
import HomeMobileToggle, { type HomeMobileView, type HomeEventMode } from '../components/home/mobile/HomeMobileToggle';
import MobileSchedulePanel from '../components/home/mobile/MobileSchedulePanel';
import ScheduleList from '../components/schedule/ScheduleList';
import MemoWidget from '../components/home/MemoWidget';
import styles from './HomePageMobile.module.css';

interface Props {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  refreshKey: number;
  onScheduleChange: () => void;
}

// 홈 화면 모바일 레이아웃: 상단바(년/월 + 설정) → 스케줄/일정 토글 → 그 아래 본문.
// "스케줄"에선 주간 스트립(또는 펼치면 미니 달력) + 그날 하루 타임라인을, "일정"에선 일정
// 리스트 또는 메모장을 보여줌(일정/메모는 토글 안쪽 작은 토글로 전환)
export default function HomePageMobile({ selectedDate, onDateSelect, refreshKey, onScheduleChange }: Props) {
  const [view, setView] = useState<HomeMobileView>('schedule');
  const [eventMode, setEventMode] = useState<HomeEventMode>('list');

  return (
    <div className={styles.container}>
      <HomeMobileTopBar selectedDate={selectedDate} onDateSelect={onDateSelect} />
      <HomeMobileToggle
        view={view}
        eventMode={eventMode}
        onViewChange={setView}
        onEventModeChange={setEventMode}
      />
      <div className={styles.body}>
        {view === 'schedule' ? (
          <MobileSchedulePanel
            selectedDate={selectedDate}
            onDateSelect={onDateSelect}
            refreshKey={refreshKey}
            onScheduleChange={onScheduleChange}
          />
        ) : eventMode === 'list' ? (
          <ScheduleList selectedDate={selectedDate} refreshKey={refreshKey} onScheduleChange={onScheduleChange} />
        ) : (
          <MemoWidget />
        )}
      </div>
    </div>
  );
}
