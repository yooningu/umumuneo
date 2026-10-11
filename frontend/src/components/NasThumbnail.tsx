import { useState, useEffect, useRef } from 'react';
import { getPreviewBlobUrl } from '../api/file';
import type { FileItem } from '../types';
import styles from './NasThumbnail.module.css';

interface Props {
  file: FileItem;
  fallback: string; // 미리보기가 안 되거나 아직 로딩 중일 때 보여줄 이모지 아이콘
}

// 그리드 타일 안에서 이미지/영상/PDF는 실제 내용을 축소해서 보여주고, 그 외는 이모지 아이콘 그대로.
// 백엔드에 썸네일 생성 기능이 없어서 원본 파일을 그대로 받아와 CSS로 줄이는 방식 (PDF는 embed를 축소).
export default function NasThumbnail({ file, fallback }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!file.previewable) return;
    let cancelled = false;
    getPreviewBlobUrl(file.id)
      .then(u => {
        if (cancelled) {
          window.URL.revokeObjectURL(u);
          return;
        }
        urlRef.current = u;
        setUrl(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (urlRef.current) {
        window.URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [file.id, file.previewable]);

  if (!file.previewable || !url) {
    return <span className={styles.fallbackIcon}>{fallback}</span>;
  }

  const mime = file.mimeType ?? '';

  if (mime.startsWith('image/')) {
    return <img src={url} alt={file.name} className={styles.thumbImg} />;
  }
  if (mime.startsWith('video/')) {
    return <video src={url} muted preload="metadata" className={styles.thumbVideo} />;
  }
  if (mime === 'application/pdf') {
    return (
      <div className={styles.thumbPdfClip}>
        <embed src={url} type="application/pdf" className={styles.thumbPdfEmbed} />
      </div>
    );
  }
  return <span className={styles.fallbackIcon}>{fallback}</span>;
}
