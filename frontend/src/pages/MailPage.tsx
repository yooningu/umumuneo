import { useEffect, useRef, useState, type ReactNode } from 'react';
import { getMails, getMailDetail } from '../api/mail';
import { downloadFile, getPreviewBlobUrl } from '../api/file';
import Skeleton from '../components/common/Skeleton';
import type { MailItem, MailDetail, MailAttachment } from '../types';
import styles from './MailPage.module.css';

// 로딩 중에 실제 메일 항목(보낸사람/날짜 + 제목 + 미리보기) 모양으로 보여줄 스켈레톤
function MailListSkeleton() {
  return (
    <div className={styles.listItem}>
      <div className={styles.listItemTop}>
        <Skeleton width="40%" height={12} />
        <Skeleton width={50} height={12} />
      </div>
      <Skeleton width="60%" height={15} className={styles.skeletonGap} />
      <Skeleton width="85%" height={13} className={styles.skeletonGap} />
    </div>
  );
}

function formatSize(bytes: number | null): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 검색어와 겹치는 부분만 배경색을 입혀서 보여줌 (대소문자 무시, 여러 번 나와도 전부 표시)
function highlightMatch(text: string, query: string): ReactNode {
  const q = query.trim();
  if (!q) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, 'gi'));
  return parts.map((part, i) =>
    i % 2 === 1 ? <mark key={i} className={styles.highlight}>{part}</mark> : part
  );
}

// 첨부파일 하나: previewable이면 이미지를 fetch해서 인라인으로 보여주고, 아니면 다운로드 버튼만 노출
// (첨부파일은 이제 실제 NAS 파일이라 attachment.id가 곧 files 테이블의 id)
function AttachmentRow({ attachment }: { attachment: MailAttachment }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isImage = attachment.previewable && (attachment.contentType?.startsWith('image/') ?? false);

  useEffect(() => {
    if (!isImage) return;
    let objectUrl: string | null = null;
    getPreviewBlobUrl(attachment.id)
      .then(url => { objectUrl = url; setPreviewUrl(url); })
      .catch(() => setPreviewUrl(null));
    return () => { if (objectUrl) window.URL.revokeObjectURL(objectUrl); };
  }, [attachment.id, isImage]);

  return (
    <div className={styles.attachmentRow}>
      {previewUrl && (
        <img src={previewUrl} alt={attachment.filename} className={styles.attachmentImage} />
      )}
      <div className={styles.attachmentInfo}>
        <span className={styles.attachmentName}>📎 {attachment.filename}</span>
        <span className={styles.attachmentSize}>{formatSize(attachment.sizeBytes)}</span>
      </div>
      <button
        className={styles.downloadButton}
        onClick={() => downloadFile(attachment.id, attachment.filename)}
      >
        다운로드
      </button>
    </div>
  );
}

// HTML 메일 본문을 안전하게 렌더링 - sandbox iframe에 격리시켜서 스크립트는 절대 못 돌게 막고
// (allow-scripts를 안 줌) 높이 계산에만 필요한 allow-same-origin만 허용함.
// 링크는 <base target="_blank">를 넣어서 항상 새 탭으로 열리게 하고, sandbox에도
// allow-popups(-to-escape-sandbox)를 허용해야 그 새 탭 열기 자체가 브라우저에 막히지 않음
// (안 그러면 target="_blank" 링크를 눌러도 팝업 차단처럼 조용히 아무 반응이 없었음).
function HtmlMailBody({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const resize = () => {
    const iframe = iframeRef.current;
    try {
      const doc = iframe?.contentWindow?.document;
      if (iframe && doc) {
        iframe.style.height = `${doc.documentElement.scrollHeight}px`;
      }
    } catch {
      // 높이 계산 실패해도 아래 min-height로 최소한의 표시는 됨
    }
  };

  return (
    <iframe
      ref={iframeRef}
      className={styles.htmlBody}
      srcDoc={`<base target="_blank">${html}`}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      onLoad={resize}
      title="메일 본문"
    />
  );
}

export default function MailPage() {
  const [mails, setMails] = useState<MailItem[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<MailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleMails = mails.filter(m => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return m.fromAddress.toLowerCase().includes(q)
      || (m.subject ?? '').toLowerCase().includes(q)
      || m.bodyPreview.toLowerCase().includes(q);
  });

  useEffect(() => {
    getMails()
      .then(setMails)
      .catch(() => setError('메일 목록을 불러오지 못했어요.'))
      .finally(() => setLoading(false));
  }, []);

  const openMail = (id: string) => {
    setDetailLoading(true);
    setError(null);
    getMailDetail(id)
      .then(setSelected)
      .catch(() => setError('메일을 불러오지 못했어요.'))
      .finally(() => setDetailLoading(false));
  };

  return (
    <div className={styles.container}>
      <div className={styles.listPane}>
        <div className={styles.listHeader}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="메일 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.listScroll}>
          {loading && [0, 1, 2, 3, 4].map(i => <MailListSkeleton key={i} />)}
          {!loading && visibleMails.length === 0 && (
            <div className={styles.empty}>{search ? '검색 결과가 없어요.' : '받은 메일이 없어요.'}</div>
          )}
          {visibleMails.map(mail => (
            <button
              key={mail.id}
              className={`${styles.listItem} ${selected?.id === mail.id ? styles.listItemActive : ''}`.trim()}
              onClick={() => openMail(mail.id)}
            >
              <div className={styles.listItemTop}>
                <span className={styles.listItemFrom}>{highlightMatch(mail.fromAddress, search)}</span>
                <span className={styles.listItemDate}>{formatDate(mail.receivedAt)}</span>
              </div>
              <div className={styles.listItemSubject}>{highlightMatch(mail.subject || '(제목 없음)', search)}</div>
              <div className={styles.listItemPreview}>
                {highlightMatch(mail.bodyPreview, search)}
                {mail.attachmentCount > 0 && (
                  <span className={styles.attachmentBadge}> 📎{mail.attachmentCount}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.detailPane}>
        {error && <div className={styles.errorBox}>{error}</div>}
        {!error && detailLoading && <div className={styles.empty}>불러오는 중...</div>}
        {!error && !detailLoading && !selected && <div className={styles.empty}>메일을 선택해주세요.</div>}
        {!error && !detailLoading && selected && (
          <div>
            <h2 className={styles.detailSubject}>{selected.subject || '(제목 없음)'}</h2>
            <div className={styles.detailMeta}>
              <span>보낸사람: {selected.fromAddress}</span>
              <span>{formatDate(selected.receivedAt)}</span>
            </div>
            {selected.bodyHtml ? (
              <HtmlMailBody html={selected.bodyHtml} />
            ) : (
              <div className={styles.detailBody}>{selected.body}</div>
            )}
            {selected.attachments.length > 0 && (
              <div className={styles.attachmentSection}>
                <div className={styles.attachmentSectionTitle}>
                  첨부파일 {selected.attachments.length}개
                </div>
                {selected.attachments.map(att => (
                  <AttachmentRow key={att.id} attachment={att} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
