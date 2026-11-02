import { useState, useRef, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';
import { toDateStr, parseDateStr, buildMonthCells } from '../../utils/date';
import styles from './DateRangePickerPopover.module.css';

interface Props {
  value: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
  onClose: () => void;
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

// 날짜 하나만 고르는 기본 달력 (shadcn의 "Basic" 참고) - DateRangePickerPopover와 같은 스타일/CSS를 쓰되
// 한 달치만 보여주고 범위 없이 하루만 선택함
export default function DateBasicPickerPopover({ value, onSelect, onClose }: Props) {
  const initial = parseDateStr(value || toDateStr(new Date()));
  const [viewDate, setViewDate] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
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

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const cells = buildMonthCells(year, month);
  const today = toDateStr(new Date());

  return (
    <div className={styles.popover} ref={ref} onClick={e => e.stopPropagation()}>
      <div className={styles.months}>
        <div className={styles.month}>
          <div className={styles.monthHeader}>
            <button type="button" className={styles.navBtn} onClick={prev} aria-label="이전 달"><FaChevronLeft /></button>
            <span className={styles.monthTitle}>{year}년 {month + 1}월</span>
            <button type="button" className={styles.navBtn} onClick={next} aria-label="다음 달"><FaChevronRight /></button>
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
              const isSelected = dateStr === value;
              const className = [
                styles.dayCell,
                dow === 0 ? styles.sunday : '',
                dow === 6 ? styles.saturday : '',
                dateStr === today ? styles.today : '',
                isSelected ? styles.selected : '',
              ].join(' ').trim();
              return (
                <button
                  key={i}
                  type="button"
                  className={className}
                  onClick={() => { onSelect(dateStr); onClose(); }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
