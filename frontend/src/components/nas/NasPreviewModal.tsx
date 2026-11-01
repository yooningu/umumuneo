import { useState, useEffect, useRef } from 'react';
import { IoClose, IoFolderOutline, IoDocumentOutline } from "react-icons/io5";
import { getPreviewBlobUrl, getArchiveEntries, getTextContent, updateTextContent, downloadFile, deleteFile } from '../../api/file';
import { getFileIcon } from '../../utils/fileIcon';
import ConfirmDialog from '../common/ConfirmDialog';
import type { ArchiveEntry, FileItem } from '../../types';
import styles from './NasPreviewModal.module.css';

interface Props {
  file: FileItem;
  onClose: () => void;
  onDeleted: () => void;
  onSaved?: () => void;
}

const ARCHIVE_EXTENSIONS = ['zip', 'rar', '7z', 'tar', 'gz'];
const AUTOSAVE_DELAY_MS = 1200;

type SaveState = 'idle' | 'saving' | 'saved';

function formatSize(bytes?: number): string {
  if (bytes == null) return '-';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}GB`;
}

// 그리드에서 파일을 더블클릭하면 뜨는 상세 모달 - 미리보기(가능한 경우) + 상세 정보 + 하단 저장/삭제 버튼
export default function NasPreviewModal({ file, onClose, onDeleted, onSaved }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [archiveEntries, setArchiveEntries] = useState<ArchiveEntry[] | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef('');

  const isArchive = ARCHIVE_EXTENSIONS.includes((file.extension ?? '').toLowerCase());
  const isTxt = (file.extension ?? '').toLowerCase() === 'txt';

  useEffect(() => {
    if (!file.previewable) return;
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
  }, [file.id, file.previewable]);

  useEffect(() => {
    if (!isArchive) return;
    setArchiveEntries(null);
    setArchiveError(null);
    getArchiveEntries(file.id)
      .then(setArchiveEntries)
      .catch(() => setArchiveError('이 압축 형식은 목록 보기를 지원하지 않아요.'));
  }, [file.id, isArchive]);

  useEffect(() => {
    if (!isTxt) return;
    setTextContent(null);
    setTextError(null);
    setSaveState('idle');
    getTextContent(file.id)
      .then(c => { setTextContent(c); latestContentRef.current = c; })
      .catch(() => setTextError('내용을 불러올 수 없어요.'));
  }, [file.id, isTxt]);

  // 타이핑을 멈추고 일정 시간이 지나면 자동으로 저장 (메모장과 동일한 방식) - 저장 버튼 없음
  const scheduleSave = (next: string) => {
    latestContentRef.current = next;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      saveTimerRef.current = null;
      setSaveState('saving');
      try {
        await updateTextContent(file.id, latestContentRef.current);
        setSaveState('saved');
        onSaved?.();
      } catch (e) {
        console.error(e);
        setSaveState('idle');
      }
    }, AUTOSAVE_DELAY_MS);
  };

  // 모달이 닫히는 등 컴포넌트가 사라질 때 아직 저장 안 된 변경이 남아있으면 그 전에 바로 저장
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        updateTextContent(file.id, latestContentRef.current).catch(console.error);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id]);

  const mime = file.mimeType ?? '';

  const handleDownload = () => {
    downloadFile(file.id, file.name).catch(console.error);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextContent(e.target.value);
    setSaveState('idle');
    scheduleSave(e.target.value);
  };

  const handleDelete = () => {
    setConfirmDelete(true);
  };

  const confirmDeleteFile = async () => {
    setConfirmDelete(false);
    setDeleting(true);
    try {
      await deleteFile(file.id);
      onDeleted();
    } catch (e) {
      console.error(e);
      setDeleting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>{file.name}</span>
          <button className={styles.closeBtn} onClick={onClose}><IoClose /></button>
        </div>
        <div className={styles.body}>
          {isTxt ? (
            textError ? (
              <div className={styles.loading}>{textError}</div>
            ) : textContent === null ? (
              <div className={styles.loading}>불러오는 중...</div>
            ) : (
              <div className={styles.textEditorWrap}>
                <textarea
                  className={styles.textEditor}
                  value={textContent}
                  onChange={handleTextChange}
                  spellCheck={false}
                />
                <div className={styles.textStatusRow}>
                  {saveState === 'saving' && <span>저장 중...</span>}
                  {saveState === 'saved' && <span>저장됨</span>}
                </div>
              </div>
            )
          ) : isArchive ? (
            archiveError ? (
              <div className={styles.loading}>{archiveError}</div>
            ) : !archiveEntries ? (
              <div className={styles.loading}>압축 목록을 불러오는 중...</div>
            ) : (
              <div className={styles.archiveList}>
                {archiveEntries.length === 0 ? (
                  <div className={styles.loading}>빈 압축 파일이에요.</div>
                ) : (
                  archiveEntries.map((e, i) => (
                    <div key={i} className={styles.archiveEntry}>
                      {e.directory ? <IoFolderOutline /> : <IoDocumentOutline />}
                      <span className={styles.archiveEntryName} title={e.name}>{e.name}</span>
                      {!e.directory && <span className={styles.archiveEntrySize}>{formatSize(e.sizeBytes ?? undefined)}</span>}
                    </div>
                  ))
                )}
              </div>
            )
          ) : !file.previewable ? (
            <span className={styles.fallbackIcon}>{getFileIcon(file)}</span>
          ) : !url ? (
            <div className={styles.loading}>불러오는 중...</div>
          ) : mime.startsWith('image/') ? (
            <img src={url} alt={file.name} className={styles.previewImg} />
          ) : mime.startsWith('video/') ? (
            <video src={url} controls autoPlay className={styles.previewVideo} />
          ) : mime === 'application/pdf' ? (
            <embed src={url} type="application/pdf" className={styles.previewPdf} />
          ) : (
            <span className={styles.fallbackIcon}>{getFileIcon(file)}</span>
          )}
        </div>
        <div className={styles.details}>
          <div className={styles.detailRow}><span className={styles.detailLabel}>크기</span><span>{formatSize(file.sizeBytes)}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>종류</span><span>{file.extension?.toUpperCase() || file.mimeType || '-'}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>수정일</span><span>{file.updatedAt.slice(0, 16).replace('T', ' ')}</span></div>
        </div>
        <div className={styles.footer}>
          <button className={styles.deleteBtn} onClick={handleDelete} disabled={deleting}>삭제</button>
          <button className={styles.saveBtn} onClick={handleDownload}>다운로드</button>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          message={`"${file.name}"을 삭제할까요?`}
          danger
          onConfirm={confirmDeleteFile}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
