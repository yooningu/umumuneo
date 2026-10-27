import { useState } from 'react';
import TimePickerPopover from './TimePickerPopover';
import styles from './TimeField.module.css';

interface Props {
  value: string; // "HH:MM"
  onChange: (time: string) => void;
  placeholder?: string;
}

// 네이티브 <input type="time"> 대신 쓰는 커스텀 시간 입력 - 클릭하면 TimePickerPopover가 뜸
export default function TimeField({ value, onChange, placeholder = '시간 선택' }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.trigger} onClick={() => setOpen(v => !v)}>
        {value || <span className={styles.placeholder}>{placeholder}</span>}
      </button>
      {open && (
        <TimePickerPopover
          value={value}
          onSelect={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
