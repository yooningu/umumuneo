import { useState, useEffect } from 'react';
import { IoClose } from 'react-icons/io5';
import { FaChevronLeft } from 'react-icons/fa6';
import { getFiles } from '../../api/file';
import type { FileItem } from '../../types';
import NasThumbnail from '../nas/NasThumbnail';
import styles from './NasFilePickerModal.module.css';

interface Props {
  onSelect: (file: FileItem) => void;
  onClose: () => void;
}

function fileIcon(f: FileItem): string {
  if (f.isDirectory) return '📁';
  const mime = f.mimeType ?? '';
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.startsWith('video/')) return '🎬';
  if (mime === 'application/pdf') return '📕';
  return '📄';
}

// 챗봇 첨부에서 "NAS에서 추가"를 눌렀을 때 뜨는 간단한 파일 선택 모달.
// 폴더는 더블클릭 없이 한 번 클릭으로 들어가고(안에 선택할 다른 동작이 없어서), 파일을 클릭하면 바로 선택됨.
export default function NasFilePickerModal({ onSelect, onClose }: Props) {
  const [stack, setStack] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'NAS' }]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const current = stack[stack.length - 1];

  useEffect(() => {
    getFiles({ parentId: current.id ?? undefined }).then(setFiles).catch(console.error);
  }, [current.id]);

  const openFolder = (f: FileItem) => setStack(prev => [...prev, { id: f.id, name: f.name }]);
  const goBack = () => setStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {stack.length > 1 && (
              <button className={styles.backBtn} onClick={goBack} title="뒤로"><FaChevronLeft /></button>
            )}
            <span className={styles.title}>{current.name}</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><IoClose /></button>
        </div>
        <div className={styles.grid}>
          {files.length === 0 ? (
            <div className={styles.empty}>파일이 없습니다</div>
          ) : (
            files.map(f => (
              <div
                key={f.id}
                className={styles.tile}
                onClick={() => (f.isDirectory ? openFolder(f) : onSelect(f))}
              >
                <div className={styles.tileIcon}>
                  <NasThumbnail file={f} fallback={fileIcon(f)} />
                </div>
                <div className={styles.tileName} title={f.name}>{f.name}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
