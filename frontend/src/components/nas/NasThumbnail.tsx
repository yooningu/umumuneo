import { useState, useEffect, useRef, type ReactNode } from 'react';
import { getThumbnailBlobUrl } from '../../api/file';
import type { FileItem } from '../../types';
import styles from './NasThumbnail.module.css';

interface Props {
  file: FileItem;
  fallback: ReactNode; // 미리보기가 안 되거나 아직 로딩 중일 때 보여줄 파일 종류 아이콘
}

// 그리드 타일 안에서 이미지/영상/PDF는 서버가 미리 작게 렌더링해서 캐싱해둔 썸네일을 받아와 보여주고,
// 그 외(또는 썸네일 생성 실패)는 이모지 아이콘 그대로. 예전엔 원본 파일 전체를 그대로 받아와 CSS로
// 줄이는 방식이라 영상/PDF가 클수록 그리드를 열 때마다 느려졌었음.
export default function NasThumbnail({ file, fallback }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!file.previewable) return;
    let cancelled = false;
    getThumbnailBlobUrl(file.id)
      .then(u => {
        if (cancelled) {
          window.URL.revokeObjectURL(u);
          return;
        }
        urlRef.current = u;
        setUrl(u);
      })
      .catch(() => {}); // 썸네일 생성 실패(404) 등은 그냥 아이콘으로 대체
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

  return <img src={url} alt={file.name} className={styles.thumbImg} />;
}
