import { useState } from 'react';
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { BsReverseLayoutSidebarInsetReverse } from "react-icons/bs";
import { FaPlus, FaCalendarMinus } from "react-icons/fa";
import Timetable from '../../assets/icon/Timetable.svg?react';
import DatePickerPopover from '../common/DatePickerPopover';
import useMediaQuery from '../../hooks/useMediaQuery';
import styles from './ScheduleHeader.module.css';

// 이 너비 밑으로는(=2줄로 쪼개지는 기준, ScheduleHeader.module.css와 동일) "오늘" 버튼이
// 날짜 이동 묶음 대신 +버튼 옆(오른쪽 그룹)으로 옮겨감. CSS만으로는 서로 다른 부모
// (day-nav ↔ right)로 옮길 수 없어서 여기서 직접 분기함
const NARROW_HEADER = '(max-width: 645px)';

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
  // 좁은 화면이라 일정 목록이 서랍으로 숨겨져 있을 때만 상위에서 넘겨줌 - 있을 때만 아이콘이 보임
  onToggleList?: () => void;
}

// 일정 페이지 상단 바: 제목 + 기간 이동(prev/next/오늘) + 스케줄러/캘린더 보기 전환 + 스케줄(일정/시간표) 추가 버튼
export default function ScheduleHeader({
  viewMode, onViewModeChange, rangeLabel, selectedDate, onDateSelect, onPrev, onNext, onToday, onAdd, onToggleList,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isNarrow = useMediaQuery(NARROW_HEADER);
  return (
    <div className={styles.header}>
      <div className={styles.viewToggle}>
        <div className={`${styles.toggleThumb} ${viewMode === 'calendar' ? styles.toggleThumbRight : ''}`.trim()} />
        <button
          className={`${styles.toggleBtn} ${viewMode === 'scheduler' ? styles.toggleBtnActive : ''}`.trim()}
          onClick={() => onViewModeChange('scheduler')}
        >
          <Timetable className={styles.toggleIcon} />
          <span className={styles.toggleBtnText}>스케줄러</span>
        </button>
        <button
          className={`${styles.toggleBtn} ${viewMode === 'calendar' ? styles.toggleBtnActive : ''}`.trim()}
          onClick={() => onViewModeChange('calendar')}
        >
          <FaCalendarMinus className={styles.toggleIcon} />
          <span className={styles.toggleBtnText}>캘린더</span>
        </button>
      </div>

      {/* 화면이 좁아지면 이 묶음(날짜 이동)이 둘째 줄로 통째로 내려감 (ScheduleHeader.module.css) */}
      <div className={styles.dateNav}>
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
        {!isNarrow && <button className={styles.todayBtn} onClick={onToday}>오늘</button>}
      </div>

      <div className={styles.right}>
        {/* 오른쪽 끝부터: 목록 서랍 아이콘, 그 왼쪽에 +, 그 왼쪽에 오늘(좁을 때만 여기로 옮겨옴) */}
        {isNarrow && <button className={styles.todayBtn} onClick={onToday}>오늘</button>}
        <button className={styles.addBtn} onClick={onAdd} aria-label="스케줄 추가" title="스케줄 추가">
          <FaPlus />
        </button>
        {onToggleList && (
          <button className={styles.listToggleBtn} onClick={onToggleList} aria-label="일정 목록 열기">
            <BsReverseLayoutSidebarInsetReverse />
          </button>
        )}
      </div>
    </div>
  );
}
