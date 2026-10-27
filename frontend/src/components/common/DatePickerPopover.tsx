import { useState, useRef, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';
import styles from './DatePickerPopover.module.css';

interface Props {
  value: Date; // 처음 열렸을 때 보여줄 기준 날짜(그 달이 보임)
  onSelect: (date: Date) => void;
  onClose: () => void;
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

// 날짜/제목 글자를 클릭하면 뜨는 작은 달력 팝오버 - 날짜 하나를 골라서 그 날짜(or 그 달)로 바로 이동할 때 씀
export default function DatePickerPopover({ value, onSelect, onClose }: Props) {
  const [viewDate, setViewDate] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    // 여는 클릭과 같은 틱에 바로 닫히지 않도록 다음 틱부터 감지
    const timer = setTimeout(() => document.addEventListener('mousedown', handleOutside), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [onClose]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div className={styles.popover} ref={ref} onClick={e => e.stopPropagation()}>
      <div className={styles.header}>
        <button className={styles.navBtn} onClick={prevMonth} aria-label="이전 달"><FaChevronLeft /></button>
        <span className={styles.title}>{year}년 {month + 1}월</span>
        <button className={styles.navBtn} onClick={nextMonth} aria-label="다음 달"><FaChevronRight /></button>
      </div>

      <div className={styles.weekdayRow}>
        {DAY_LABELS.map((d, i) => (
          <div
            key={d}
            className={[
              styles.weekdayCell,
              i === 5 ? styles.saturday : '',
              i === 6 ? styles.sunday : '',
            ].join(' ').trim()}
          >
            {d}
          </div>
        ))}
      </div>

      <div className={styles.daysGrid}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const date = new Date(year, month, day);
          const isToday = date.toDateString() === today.toDateString();
          const dow = date.getDay();
          return (
            <button
              key={i}
              className={[
                styles.dayCell,
                dow === 6 ? styles.saturday : '',
                dow === 0 ? styles.sunday : '',
                isToday ? styles.today : '',
              ].join(' ').trim()}
              onClick={() => { onSelect(date); onClose(); }}
            >
              {day}
            </button>
          );
        })}
      </div>

      <button
        className={styles.todayLink}
        onClick={() => { onSelect(today); onClose(); }}
      >
        오늘로 이동
      </button>
    </div>
  );
}
