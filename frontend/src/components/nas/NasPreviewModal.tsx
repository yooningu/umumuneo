import { useState, useEffect } from 'react';
import { IoClose, IoFolderOutline, IoDocumentOutline } from "react-icons/io5";
import { getPreviewBlobUrl, getArchiveEntries, getTextContent, updateTextContent, downloadFile, deleteFile } from '../../api/file';
import type { ArchiveEntry, FileItem } from '../../types';
import styles from './NasPreviewModal.module.css';

interface Props {
  file: FileItem;
  onClose: () => void;
  onDeleted: () => void;
  onSaved?: () => void;
}

const SOURCE_LABEL: Record<string, string> = {
  UPLOAD: '업로드',
  EMAIL: '이메일',
  CHATBOT: '챗봇',
};

const ARCHIVE_EXTENSIONS = ['zip', 'rar', '7z', 'tar', 'gz'];

// 미리보기를 지원하지 않는 파일일 때 그리드 타일과 똑같은 기본 아이콘을 보여줌
function fileIcon(f: FileItem): string {
  const mime = f.mimeType ?? '';
  const ext = (f.extension ?? '').toLowerCase();
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.startsWith('video/')) return '🎬';
  if (mime === 'application/pdf' || ext === 'pdf') return '📕';
  if (ARCHIVE_EXTENSIONS.includes(ext)) return '🗜️';
  return '📄';
}

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
  const [archiveEntries, setArchiveEntries] = useState<ArchiveEntry[] | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [originalText, setOriginalText] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);
  const [savingText, setSavingText] = useState(false);

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
    setOriginalText(null);
    setTextError(null);
    getTextContent(file.id)
      .then(c => { setTextContent(c); setOriginalText(c); })
      .catch(() => setTextError('내용을 불러올 수 없어요.'));
  }, [file.id, isTxt]);

  const mime = file.mimeType ?? '';
  const textDirty = textContent !== null && textContent !== originalText;

  const handleDownload = () => {
    downloadFile(file.id, file.name).catch(console.error);
  };

  const handleSaveText = async () => {
    if (textContent === null || !textDirty) return;
    setSavingText(true);
    try {
      await updateTextContent(file.id, textContent);
      setOriginalText(textContent);
      onSaved?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingText(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`"${file.name}"을 삭제할까요?`)) return;
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
              <textarea
                className={styles.textEditor}
                value={textContent}
                onChange={e => setTextContent(e.target.value)}
                spellCheck={false}
              />
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
            <span className={styles.fallbackIcon}>{fileIcon(file)}</span>
          ) : !url ? (
            <div className={styles.loading}>불러오는 중...</div>
          ) : mime.startsWith('image/') ? (
            <img src={url} alt={file.name} className={styles.previewImg} />
          ) : mime.startsWith('video/') ? (
            <video src={url} controls autoPlay className={styles.previewVideo} />
          ) : mime === 'application/pdf' ? (
            <embed src={url} type="application/pdf" className={styles.previewPdf} />
          ) : (
            <span className={styles.fallbackIcon}>{fileIcon(file)}</span>
          )}
        </div>
        <div className={styles.details}>
          <div className={styles.detailRow}><span className={styles.detailLabel}>크기</span><span>{formatSize(file.sizeBytes)}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>종류</span><span>{file.extension?.toUpperCase() || file.mimeType || '-'}</span></div>
          {file.source && (
            <div className={styles.detailRow}><span className={styles.detailLabel}>출처</span><span>{SOURCE_LABEL[file.source] ?? file.source}</span></div>
          )}
          <div className={styles.detailRow}><span className={styles.detailLabel}>수정일</span><span>{file.updatedAt.slice(0, 16).replace('T', ' ')}</span></div>
        </div>
        <div className={styles.footer}>
          <button className={styles.deleteBtn} onClick={handleDelete} disabled={deleting}>삭제</button>
          {isTxt ? (
            <>
              <button className={styles.secondaryBtn} onClick={handleDownload}>다운로드</button>
              <button className={styles.saveBtn} onClick={handleSaveText} disabled={!textDirty || savingText}>수정 저장</button>
            </>
          ) : (
            <button className={styles.saveBtn} onClick={handleDownload}>다운로드</button>
          )}
        </div>
      </div>
    </div>
  );
}
