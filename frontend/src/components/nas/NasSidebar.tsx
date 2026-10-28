import { useState, useEffect } from 'react';
import { getFiles, downloadFile } from '../../api/file';
import type { FileItem } from '../../types';
import styles from './NasSidebar.module.css';

type FileSource = 'UPLOAD' | 'CHATBOT' | 'EMAIL';

// null(전체)은 분류 필터를 끄고 평소처럼 전부 보여주는 상태
const CATEGORIES: { source: FileSource | null; label: string; icon: string }[] = [
  { source: null, label: '전체', icon: '🗂️' },
  { source: 'UPLOAD', label: '업로드', icon: '📥' },
  { source: 'EMAIL', label: '이메일', icon: '📧' },
  { source: 'CHATBOT', label: '챗봇', icon: '🤖' },
];

interface Props {
  refreshKey: number;
  onOpenFolder: (id: string, name: string) => void;
  sourceFilter: FileSource | null;
  onSelectSource: (source: FileSource | null) => void;
}

// 저장용량 쪽은 백엔드에 별도 쿼터 개념이 없어서 표시용으로 최상위 폴더 파일 크기 합만 대략 계산함
// (하위 폴더까지 재귀로 합치려면 백엔드에 집계용 API가 따로 필요함 - 지금은 없어서 근사치)
const DISPLAY_LIMIT_BYTES = 100 * 1024 * 1024 * 1024;

// 1GB 미만이면 MB 단위로 보여줘서, 사용량이 적을 때 "0.0GB"처럼 안 보이게 함
function formatUsed(bytes: number): string {
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  }
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}GB`;
}

export default function NasSidebar({ refreshKey, onOpenFolder, sourceFilter, onSelectSource }: Props) {
  const [favorites, setFavorites] = useState<FileItem[]>([]);
  const [usedBytes, setUsedBytes] = useState(0);

  useEffect(() => {
    getFiles({ isFavorite: true }).then(setFavorites).catch(console.error);
    getFiles().then(files => {
      setUsedBytes(files.reduce((sum, f) => sum + (f.sizeBytes ?? 0), 0));
    }).catch(console.error);
  }, [refreshKey]);

  const percent = Math.min(100, (usedBytes / DISPLAY_LIMIT_BYTES) * 100);

  const handleFavoriteClick = (f: FileItem) => {
    if (f.isDirectory) onOpenFolder(f.id, f.name);
    else downloadFile(f.id, f.name).catch(console.error);
  };

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>즐겨찾기</div>
        {favorites.length === 0 ? (
          <div className={styles.empty}>즐겨찾기한 파일이 없습니다</div>
        ) : (
          favorites.map(f => (
            <div key={f.id} className={styles.favItem} onClick={() => handleFavoriteClick(f)} title={f.name}>
              {f.isDirectory ? '📁' : '📄'} {f.name}
            </div>
          ))
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>분류</div>
        {CATEGORIES.map(c => (
          <div
            key={c.source ?? 'ALL'}
            className={`${styles.favItem} ${sourceFilter === c.source ? styles.favItemActive : ''}`.trim()}
            onClick={() => onSelectSource(c.source)}
          >
            {c.icon} {c.label}
          </div>
        ))}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>저장용량</div>
        <div className={styles.storageRow}>
          <span>사용중</span>
          <span>{formatUsed(usedBytes)} / {DISPLAY_LIMIT_BYTES / 1024 / 1024 / 1024}GB</span>
        </div>
        <div className={styles.storageBarTrack}>
          <div className={styles.storageBarFill} style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}
