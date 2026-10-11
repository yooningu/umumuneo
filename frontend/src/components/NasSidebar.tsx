import { useState, useEffect } from 'react';
import { getFiles, downloadFile } from '../api/file';
import type { FileItem } from '../types';
import styles from './NasSidebar.module.css';

interface Props {
  refreshKey: number;
  onOpenFolder: (id: string, name: string) => void;
}

// 저장용량 쪽은 백엔드에 별도 쿼터 개념이 없어서 표시용으로 최상위 폴더 파일 크기 합만 대략 계산함
// (하위 폴더까지 재귀로 합치려면 백엔드에 집계용 API가 따로 필요함 - 지금은 없어서 근사치)
const DISPLAY_LIMIT_BYTES = 100 * 1024 * 1024 * 1024;

function formatGB(bytes: number): string {
  return (bytes / 1024 / 1024 / 1024).toFixed(1);
}

export default function NasSidebar({ refreshKey, onOpenFolder }: Props) {
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
        <div className={styles.sectionTitle}>저장용량</div>
        <div className={styles.storageRow}>
          <span>사용중</span>
          <span>{formatGB(usedBytes)}GB / {DISPLAY_LIMIT_BYTES / 1024 / 1024 / 1024}GB</span>
        </div>
        <div className={styles.storageBarTrack}>
          <div className={styles.storageBarFill} style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}
