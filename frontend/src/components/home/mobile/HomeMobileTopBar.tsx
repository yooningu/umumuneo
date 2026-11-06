import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoSettingsOutline } from 'react-icons/io5';
import DatePickerPopover from '../../common/DatePickerPopover';
import styles from './HomeMobileTopBar.module.css';

interface Props {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

// 모바일 홈 화면 최상단 바 - 왼쪽: 년/월(누르면 날짜 선택 팝오버), 오른쪽: 설정 바로가기.
// 설정은 하단 탭바(Sidebar)에서는 빠지고 여기로 옮겨옴
export default function HomeMobileTopBar({ selectedDate, onDateSelect }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className={styles.topBar}>
      <span className={styles.titleWrap}>
        <button className={styles.dateButton} onClick={() => setPickerOpen(v => !v)}>
          {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월
        </button>
        {pickerOpen && (
          <DatePickerPopover
            value={selectedDate}
            onSelect={onDateSelect}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </span>
      <button className={styles.settingsButton} onClick={() => navigate('/settings')} aria-label="설정">
        <IoSettingsOutline />
      </button>
    </div>
  );
}
