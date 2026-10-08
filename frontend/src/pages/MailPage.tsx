import { useEffect, useRef, useState } from 'react';
import { getMails, getMailDetail, downloadMailAttachment, getMailAttachmentPreviewUrl } from '../api/mail';
import type { MailItem, MailDetail, MailAttachment } from '../types';
import styles from './MailPage.module.css';

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

// 첨부파일 하나: previewable이면 이미지를 fetch해서 인라인으로 보여주고, 아니면 다운로드 버튼만 노출
function AttachmentRow({ mailId, attachment }: { mailId: string; attachment: MailAttachment }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isImage = attachment.previewable && (attachment.contentType?.startsWith('image/') ?? false);

  useEffect(() => {
    if (!isImage) return;
    let objectUrl: string | null = null;
    getMailAttachmentPreviewUrl(mailId, attachment.id)
      .then(url => { objectUrl = url; setPreviewUrl(url); })
      .catch(() => setPreviewUrl(null));
    return () => { if (objectUrl) window.URL.revokeObjectURL(objectUrl); };
  }, [mailId, attachment.id, isImage]);

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
        onClick={() => downloadMailAttachment(mailId, attachment.id, attachment.filename)}
      >
        다운로드
      </button>
    </div>
  );
}

// HTML 메일 본문을 안전하게 렌더링 - sandbox iframe에 격리시켜서 스크립트는 절대 못 돌게 막고
// (allow-scripts를 안 줌) 높이 계산에만 필요한 allow-same-origin만 허용함
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
      srcDoc={html}
      sandbox="allow-same-origin"
      onLoad={resize}
      title="메일 본문"
    />
  );
}

export default function MailPage() {
  const [mails, setMails] = useState<MailItem[]>([]);
  const [selected, setSelected] = useState<MailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <div className={styles.listHeader}>메일함</div>
        {loading && <div className={styles.empty}>불러오는 중...</div>}
        {!loading && mails.length === 0 && <div className={styles.empty}>받은 메일이 없어요.</div>}
        {mails.map(mail => (
          <button
            key={mail.id}
            className={`${styles.listItem} ${selected?.id === mail.id ? styles.listItemActive : ''}`.trim()}
            onClick={() => openMail(mail.id)}
          >
            <div className={styles.listItemTop}>
              <span className={styles.listItemFrom}>{mail.fromAddress}</span>
              <span className={styles.listItemDate}>{formatDate(mail.receivedAt)}</span>
            </div>
            <div className={styles.listItemSubject}>{mail.subject || '(제목 없음)'}</div>
            <div className={styles.listItemPreview}>
              {mail.bodyPreview}
              {mail.attachmentCount > 0 && (
                <span className={styles.attachmentBadge}> 📎{mail.attachmentCount}</span>
              )}
            </div>
          </button>
        ))}
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
                  <AttachmentRow key={att.id} mailId={selected.id} attachment={att} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
