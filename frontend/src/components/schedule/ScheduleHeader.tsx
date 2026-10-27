import { useState } from 'react';
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import DatePickerPopover from '../common/DatePickerPopover';
import styles from './ScheduleHeader.module.css';

export type ScheduleViewMode = 'scheduler' | 'calendar';

interface Props {
  viewMode: ScheduleViewMode;
  onViewModeChange: (mode: ScheduleViewMode) => void;
  rangeLabel: string;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onAdd: () => void;
}

// 일정 페이지 상단 바: 제목 + 기간 이동(prev/next/오늘) + 스케줄러/캘린더 보기 전환 + 스케줄(일정/시간표) 추가 버튼
export default function ScheduleHeader({
  viewMode, onViewModeChange, rangeLabel, selectedDate, onDateSelect, onPrev, onNext, onToday, onAdd,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div className={styles.header}>
      <div className={styles.left}>
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
        <div className={styles.navGroup}>
          <button className={styles.navCircle} onClick={onPrev} aria-label="이전"><FaChevronLeft /></button>
          <span className={styles.rangeLabelWrap}>
            <button className={styles.rangeLabel} onClick={() => setPickerOpen(v => !v)}>
              {rangeLabel}
            </button>
            {pickerOpen && (
              <DatePickerPopover
                value={selectedDate}
                onSelect={onDateSelect}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </span>
          <button className={styles.navCircle} onClick={onNext} aria-label="다음"><FaChevronRight /></button>
        </div>
        <button className={styles.todayBtn} onClick={onToday}>오늘</button>
      </div>

      <button className={styles.addBtn} onClick={onAdd}>스케줄 추가</button>
    </div>
  );
}
