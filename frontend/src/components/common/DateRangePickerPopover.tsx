import { useState, useRef, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';
import { toDateStr, parseDateStr, buildMonthCells } from '../../utils/date';
import styles from './DateRangePickerPopover.module.css';

interface Props {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  onSelect: (startDate: string, endDate: string) => void;
  onClose: () => void;
}

// 앱 다른 달력들(DatePickerPopover, MonthCalendar, WeeklyCalendar)이랑 맞춰서 월요일 시작
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

// 기간 일정의 시작~종료 날짜를 두 달치 달력에서 직접 클릭해서 고르는 팝오버 (shadcn Range Picker 참고).
// 첫 클릭 = 시작일, 두 번째 클릭 = 종료일(시작일보다 빠르면 서로 바뀜) - 그 사이엔 마우스를 올린 날짜까지
// 미리보기로 범위가 칠해짐. 기존 DatePickerPopover(단일 날짜용)랑 같은 스타일 컨벤션을 따름.
export default function DateRangePickerPopover({ startDate, endDate, onSelect, onClose }: Props) {
  const initial = parseDateStr(startDate || toDateStr(new Date()));
  const [viewDate, setViewDate] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const [pickingStart, setPickingStart] = useState<string>(startDate);
  const [pickingEnd, setPickingEnd] = useState<string>(endDate);
  const [selectingEnd, setSelectingEnd] = useState(false); // 시작일을 고른 뒤 종료일을 고르는 중인지
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handleOutside), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [onClose]);

  const prev = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const next = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  // 미리보기 포함한 "지금 화면에 보여줄" 범위 - 종료일 고르는 중이면 호버 중인 날짜까지 임시로 보여줌
  const previewStart = pickingStart;
  const previewEnd = selectingEnd && hoverDate ? hoverDate : (selectingEnd ? pickingStart : pickingEnd);
  const rangeStart = previewStart <= previewEnd ? previewStart : previewEnd;
  const rangeEnd = previewStart <= previewEnd ? previewEnd : previewStart;

  const handleDayClick = (dateStr: string) => {
    if (!selectingEnd) {
      setPickingStart(dateStr);
      setPickingEnd(dateStr);
      setSelectingEnd(true);
      return;
    }
    const finalStart = dateStr < pickingStart ? dateStr : pickingStart;
    const finalEnd = dateStr < pickingStart ? pickingStart : dateStr;
    setPickingStart(finalStart);
    setPickingEnd(finalEnd);
    setSelectingEnd(false);
    onSelect(finalStart, finalEnd);
    onClose();
  };

  const renderMonth = (year: number, month: number, side: 'left' | 'right') => {
    const cells = buildMonthCells(year, month);
    const today = toDateStr(new Date());
    return (
      <div className={styles.month}>
        <div className={styles.monthHeader}>
          {side === 'left' ? (
            <button type="button" className={styles.navBtn} onClick={prev} aria-label="이전 달"><FaChevronLeft /></button>
          ) : <span className={styles.navBtnSpacer} />}
          <span className={styles.monthTitle}>{year}년 {month + 1}월</span>
          {side === 'right' ? (
            <button type="button" className={styles.navBtn} onClick={next} aria-label="다음 달"><FaChevronRight /></button>
          ) : <span className={styles.navBtnSpacer} />}
        </div>
        <div className={styles.weekdayRow}>
          {DAY_LABELS.map((d, i) => (
            <div key={d} className={`${styles.weekdayCell} ${i === 5 ? styles.saturday : ''} ${i === 6 ? styles.sunday : ''}`.trim()}>
              {d}
            </div>
          ))}
        </div>
        <div className={styles.daysGrid}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const dateStr = toDateStr(new Date(year, month, day));
            const dow = new Date(year, month, day).getDay();
            const isStart = dateStr === rangeStart;
            const isEnd = dateStr === rangeEnd;
            const inRange = dateStr > rangeStart && dateStr < rangeEnd;
            const className = [
              styles.dayCell,
              dow === 0 ? styles.sunday : '',
              dow === 6 ? styles.saturday : '',
              dateStr === today ? styles.today : '',
              inRange ? styles.inRange : '',
              isStart ? styles.rangeStart : '',
              isEnd ? styles.rangeEnd : '',
              (isStart || isEnd) ? styles.selected : '',
            ].join(' ').trim();
            return (
              <button
                key={i}
                type="button"
                className={className}
                onMouseEnter={() => setHoverDate(dateStr)}
                onClick={() => handleDayClick(dateStr)}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const rightDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);

  return (
    <div className={styles.popover} ref={ref} onClick={e => e.stopPropagation()} onMouseLeave={() => setHoverDate(null)}>
      <div className={styles.months}>
        {renderMonth(viewDate.getFullYear(), viewDate.getMonth(), 'left')}
        {renderMonth(rightDate.getFullYear(), rightDate.getMonth(), 'right')}
      </div>
    </div>
  );
}
