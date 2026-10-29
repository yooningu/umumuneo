import { useState } from 'react';
import WeeklyCalendar from '../components/schedule/WeeklyCalendar';
import MiniCalendar from '../components/home/MiniCalendar';
import EtcPanel from '../components/home/EtcPanel';
import ChatWidget from '../components/home/ChatWidget';
import styles from './HomePage.module.css';

export default function HomePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className={styles.container}>
      {/* 왼쪽: 주간 캘린더 */}
      <div className={styles.calendarPane}>
        <WeeklyCalendar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          refreshKey={refreshKey}
          onScheduleChange={() => setRefreshKey(k => k + 1)}
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
              onScheduleChange={() => setRefreshKey(k => k + 1)}
            />
          </div>
        </div>

        {/* 챗봇 */}
        <div className={styles.chatPane}>
          <ChatWidget onScheduleChange={() => setRefreshKey(k => k + 1)} />
        </div>
      </div>
    </div>
  );
}
