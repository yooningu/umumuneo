import { useState } from 'react';
import WeeklyCalendar from '../components/schedule/WeeklyCalendar';
import MiniCalendar from '../components/home/MiniCalendar';
import EtcPanel from '../components/home/EtcPanel';
import ChatWidget from '../components/home/ChatWidget';
import AddScheduleModal from '../components/schedule/AddScheduleModal';
import { toDateStr } from '../utils/date';
import styles from './HomePage.module.css';

export default function HomePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalDate, setAddModalDate] = useState<string | null>(null); // 우클릭으로 특정 셀에서 추가하면 그 날짜, 아니면 selectedDate를 씀

  const bump = () => setRefreshKey(k => k + 1);

  const handleAdd = (dateStr?: string) => {
    setAddModalDate(dateStr ?? null);
    setAddModalOpen(true);
  };

  return (
    <div className={styles.container}>
      {/* 왼쪽: 주간 캘린더 */}
      <div className={styles.calendarPane}>
        <WeeklyCalendar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          refreshKey={refreshKey}
          onScheduleChange={bump}
          onRequestAddSchedule={handleAdd}
        />
      </div>

      {/* 오른쪽: 미니캘린더 + 일정목록 + 챗봇 */}
      <div className={styles.sidePane}>
        {/* 미니캘린더 + 일정목록 */}
        <div className={styles.topSide}>
          <div className={styles.miniCalendar}>
            <MiniCalendar selectedDate={selectedDate} onDateSelect={setSelectedDate} refreshKey={refreshKey} />
          </div>
          <div className={styles.scheduleList}>
            <EtcPanel
              selectedDate={selectedDate}
              refreshKey={refreshKey}
              onScheduleChange={bump}
            />
          </div>
        </div>

        {/* 챗봇 */}
        <div className={styles.chatPane}>
          <ChatWidget onScheduleChange={bump} />
        </div>
      </div>

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
