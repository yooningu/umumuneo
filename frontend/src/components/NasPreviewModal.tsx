import { useState, useEffect } from 'react';
import { getPreviewBlobUrl } from '../api/file';
import type { FileItem } from '../types';
import styles from './NasPreviewModal.module.css';

interface Props {
  file: FileItem;
  onClose: () => void;
}

// 그리드에서 파일을 더블클릭하면 뜨는 큰 미리보기 (이미지/영상/PDF)
export default function NasPreviewModal({ file, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revokeUrl: string | null = null;
    getPreviewBlobUrl(file.id)
      .then(u => {
        revokeUrl = u;
        setUrl(u);
      })
      .catch(console.error);
    return () => {
      if (revokeUrl) window.URL.revokeObjectURL(revokeUrl);
    };
  }, [file.id]);

  const mime = file.mimeType ?? '';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>{file.name}</span>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div className={styles.body}>
          {!url ? (
            <div className={styles.loading}>불러오는 중...</div>
          ) : mime.startsWith('image/') ? (
            <img src={url} alt={file.name} className={styles.previewImg} />
          ) : mime.startsWith('video/') ? (
            <video src={url} controls autoPlay className={styles.previewVideo} />
          ) : mime === 'application/pdf' ? (
            <embed src={url} type="application/pdf" className={styles.previewPdf} />
          ) : (
            <div className={styles.loading}>미리보기를 지원하지 않는 파일이에요.</div>
          )}
        </div>
      </div>
    </div>
  );
}
