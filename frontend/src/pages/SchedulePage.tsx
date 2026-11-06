import { useState } from 'react';
import WeeklyCalendar, { getCenteredDates } from '../components/schedule/WeeklyCalendar';
import MonthCalendar from '../components/schedule/MonthCalendar';
import ScheduleList from '../components/schedule/ScheduleList';
import DaySchedulePanel from '../components/schedule/DaySchedulePanel';
import ScheduleHeader, { type ScheduleViewMode } from '../components/schedule/ScheduleHeader';
import AddScheduleModal from '../components/schedule/AddScheduleModal';
import MobileSchedulePanel from '../components/home/mobile/MobileSchedulePanel';
import useMediaQuery from '../hooks/useMediaQuery';
import { FaXmark } from 'react-icons/fa6';
import { toDateStr } from '../utils/date';
import styles from './SchedulePage.module.css';

// 이 너비 밑으로는 주간 스케줄러 대신 홈 화면에서 쓰는 하루짜리 스케줄러를 쓰고,
// 일정 목록도 항상 보이는 사이드 패널 대신 아이콘으로 여닫는 서랍으로 바뀜
const NARROW_BREAKPOINT = '(max-width: 450px)';

// WeeklyCalendar는 폭에 따라 7/5/3일만 보여주는 반응형이라(달력 주 단위 고정이 아님),
// 헤더의 기간 라벨/이전·다음 이동 폭도 지금 실제로 보여주는 일수(visibleCount)에 맞춰야 함
function formatWeekRangeLabel(date: Date, visibleCount: number): string {
  const dates = getCenteredDates(date, visibleCount);
  const first = dates[0];
  const last = dates[dates.length - 1];
  return `${first.getMonth() + 1}월 ${first.getDate()}일 - ${last.getMonth() + 1}월 ${last.getDate()}일`;
}

function formatMonthLabel(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

// 일정 페이지: 위쪽은 "스케줄러"(주간 시간표)/"캘린더"(월간 달력) 두 보기를 버튼으로 전환하고,
// 오른쪽은 평소엔 다가오는 일정 목록을, 캘린더에서 날짜를 콕 찍으면 그 날짜 전용 패널로 바뀐다.
export default function SchedulePage() {
  const [viewMode, setViewMode] = useState<ScheduleViewMode>('scheduler');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const [dayPanelOpen, setDayPanelOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(7);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalDate, setAddModalDate] = useState<string | null>(null); // 우클릭으로 특정 셀에서 추가하면 그 날짜, 아니면 selectedDate를 씀
  const [listDrawerOpen, setListDrawerOpen] = useState(false);
  const isNarrow = useMediaQuery(NARROW_BREAKPOINT);

  const bump = () => setRefreshKey(k => k + 1);

  const handleViewModeChange = (mode: ScheduleViewMode) => {
    setViewMode(mode);
    setDayPanelOpen(false);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    if (viewMode === 'calendar') setDayPanelOpen(true);
  };

  const handlePrev = () => {
    const d = new Date(selectedDate);
    if (viewMode === 'scheduler') d.setDate(d.getDate() - visibleCount);
    else d.setMonth(d.getMonth() - 1);
    setSelectedDate(d);
  };

  const handleNext = () => {
    const d = new Date(selectedDate);
    if (viewMode === 'scheduler') d.setDate(d.getDate() + visibleCount);
    else d.setMonth(d.getMonth() + 1);
    setSelectedDate(d);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleAdd = (dateStr?: string) => {
    setAddModalDate(dateStr ?? null);
    setAddModalOpen(true);
  };

  const rangeLabel = viewMode === 'scheduler'
    ? formatWeekRangeLabel(selectedDate, visibleCount)
    : formatMonthLabel(selectedDate);

  const sideContent = dayPanelOpen ? (
    <DaySchedulePanel date={selectedDate} refreshKey={refreshKey} onScheduleChange={bump} />
  ) : (
    <ScheduleList selectedDate={selectedDate} refreshKey={refreshKey} onScheduleChange={bump} />
  );

  return (
    <div className={styles.container}>
      <ScheduleHeader
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        rangeLabel={rangeLabel}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onAdd={() => handleAdd()}
        onToggleList={isNarrow ? () => setListDrawerOpen(true) : undefined}
      />

      <div className={styles.body}>
        <div className={styles.mainPane}>
          {viewMode === 'scheduler' ? (
            isNarrow ? (
              <MobileSchedulePanel
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                refreshKey={refreshKey}
                onScheduleChange={bump}
              />
            ) : (
              <WeeklyCalendar
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                refreshKey={refreshKey}
                onScheduleChange={bump}
                onVisibleCountChange={setVisibleCount}
                onRequestAddSchedule={handleAdd}
              />
            )
          ) : (
            <MonthCalendar
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              refreshKey={refreshKey}
            />
          )}
        </div>

        {!isNarrow && (
          <div className={styles.sidePane}>
            {sideContent}
          </div>
        )}
      </div>

      {/* 좁은 화면 - 일정 목록은 평소엔 숨겨두고, 헤더의 아이콘을 누르면 오른쪽에서 서랍으로 띄움 */}
      {isNarrow && listDrawerOpen && (
        <div className={styles.drawerOverlay} onClick={() => setListDrawerOpen(false)}>
          <div className={styles.drawerPanel} onClick={e => e.stopPropagation()}>
            <button type="button" className={styles.drawerClose} onClick={() => setListDrawerOpen(false)} aria-label="닫기">
              <FaXmark />
            </button>
            {sideContent}
          </div>
        </div>
      )}

      {addModalOpen && (
        <AddScheduleModal
          defaultDate={addModalDate ?? toDateStr(selectedDate)}
          onCancel={() => setAddModalOpen(false)}
          onSaved={() => { bump(); setAddModalOpen(false); }}
        />
      )}
    </div>
  );
}
