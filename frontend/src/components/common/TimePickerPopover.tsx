import { useEffect, useRef } from 'react';
import styles from './TimePickerPopover.module.css';

interface Props {
  value: string; // "HH:MM" (비어있으면 00:00부터 시작)
  onSelect: (time: string) => void;
  onClose: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')); // 5분 단위

// 시간 입력창을 클릭하면 뜨는 시/분 선택 팝오버 (네이티브 time input 대체용)
export default function TimePickerPopover({ value, onSelect, onClose }: Props) {
  const [hour, minute] = (value || '00:00').split(':');
  const ref = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);

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

  // 열렸을 때 현재 선택된 시/분이 보이는 위치로 스크롤
  useEffect(() => {
    hourListRef.current?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'center' });
    minuteListRef.current?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'center' });
  }, []);

  const pick = (h: string, m: string) => onSelect(`${h}:${m}`);

  return (
    <div className={styles.popover} ref={ref} onClick={e => e.stopPropagation()}>
      <div className={styles.columns}>
        <div className={styles.column} ref={hourListRef}>
          {HOURS.map(h => (
            <button
              key={h}
              type="button"
              data-active={h === hour}
              className={`${styles.item} ${h === hour ? styles.itemActive : ''}`}
              onClick={() => pick(h, minute)}
            >
              {h}
            </button>
          ))}
        </div>
        <div className={styles.column} ref={minuteListRef}>
          {MINUTES.map(m => (
            <button
              key={m}
              type="button"
              data-active={m === minute}
              className={`${styles.item} ${m === minute ? styles.itemActive : ''}`}
              onClick={() => pick(hour, m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <button type="button" className={styles.doneBtn} onClick={onClose}>완료</button>
    </div>
  );
}
