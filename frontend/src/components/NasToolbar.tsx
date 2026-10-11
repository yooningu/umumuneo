import type { NasTypeFilter } from '../types';
import styles from './NasToolbar.module.css';

const TYPE_OPTIONS: { value: NasTypeFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'IMAGE', label: '이미지' },
  { value: 'VIDEO', label: '동영상' },
  { value: 'PDF', label: 'PDF' },
  { value: 'ARCHIVE', label: '압축' },
  { value: 'OTHER', label: '기타' },
];

interface Props {
  typeFilter: NasTypeFilter;
  onTypeFilterChange: (f: NasTypeFilter) => void;
  search: string;
  onSearchChange: (v: string) => void;
  canGoUp: boolean;
  onGoUp: () => void;
}

export default function NasToolbar({
  typeFilter, onTypeFilterChange, search, onSearchChange, canGoUp, onGoUp,
}: Props) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.left}>
        {TYPE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`${styles.typeBtn} ${typeFilter === opt.value ? styles.typeBtnActive : ''}`.trim()}
            onClick={() => onTypeFilterChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className={styles.right}>
        <button className={styles.upBtn} onClick={onGoUp} disabled={!canGoUp} title="상위 폴더로">↑</button>
        <input
          className={styles.searchInput}
          placeholder="파일 검색"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}
