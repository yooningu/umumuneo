import { useState } from 'react';
import WeeklyCalendar, { getCenteredDates } from '../components/schedule/WeeklyCalendar';
import MonthCalendar from '../components/schedule/MonthCalendar';
import ScheduleList from '../components/schedule/ScheduleList';
import DaySchedulePanel from '../components/schedule/DaySchedulePanel';
import ScheduleHeader, { type ScheduleViewMode } from '../components/schedule/ScheduleHeader';
import AddScheduleModal from '../components/schedule/AddScheduleModal';
import { toDateStr } from '../utils/date';
import styles from './SchedulePage.module.css';

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

  const handleAdd = () => {
    setAddModalOpen(true);
  };

  const rangeLabel = viewMode === 'scheduler'
    ? formatWeekRangeLabel(selectedDate, visibleCount)
    : formatMonthLabel(selectedDate);

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
        onAdd={handleAdd}
      />

      <div className={styles.body}>
        <div className={styles.mainPane}>
          {viewMode === 'scheduler' ? (
            <WeeklyCalendar
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              refreshKey={refreshKey}
              onScheduleChange={bump}
              onVisibleCountChange={setVisibleCount}
            />
          ) : (
            <MonthCalendar
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              refreshKey={refreshKey}
            />
          )}
        </div>

        <div className={styles.sidePane}>
          {dayPanelOpen ? (
            <DaySchedulePanel date={selectedDate} refreshKey={refreshKey} onScheduleChange={bump} />
          ) : (
            <ScheduleList selectedDate={selectedDate} refreshKey={refreshKey} onScheduleChange={bump} />
          )}
        </div>
      </div>

      {addModalOpen && (
        <AddScheduleModal
          defaultDate={toDateStr(selectedDate)}
          onCancel={() => setAddModalOpen(false)}
          onSaved={() => { bump(); setAddModalOpen(false); }}
        />
      )}
    </div>
  );
}
