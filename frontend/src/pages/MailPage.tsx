import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IoArrowBack } from 'react-icons/io5';
import { FaAngleLeft, FaAngleRight, FaAnglesLeft, FaAnglesRight } from 'react-icons/fa6';
import { BsTrash } from 'react-icons/bs';
import { getMails, getMailDetail, deleteMail, setMailRead, blockSender } from '../api/mail';
import { downloadFile, getPreviewBlobUrl } from '../api/file';
import Skeleton from '../components/common/Skeleton';
import ConfirmDialog from '../components/common/ConfirmDialog';
import type { MailItem, MailDetail, MailAttachment } from '../types';
import styles from './MailPage.module.css';

const PAGE_SIZE = 20;
const MAX_VISIBLE_PAGES = 5;

// 페이지네이션에 보여줄 페이지 번호들 - 현재 페이지를 가운데 두고 최대 5개까지,
// 끝쪽에 가까우면 그만큼 반대쪽으로 더 보여줌 (항상 5개를 채우려고 시도)
function getPageNumbers(current: number, total: number): number[] {
  if (total <= MAX_VISIBLE_PAGES) return Array.from({ length: total }, (_, i) => i);
  let start = Math.max(0, current - Math.floor(MAX_VISIBLE_PAGES / 2));
  let end = start + MAX_VISIBLE_PAGES - 1;
  if (end > total - 1) {
    end = total - 1;
    start = end - MAX_VISIBLE_PAGES + 1;
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

// 로딩 중에 실제 메일 항목(보낸사람/날짜 + 제목 + 미리보기) 모양으로 보여줄 스켈레톤
function MailListSkeleton() {
  return (
    <div className={styles.listItem}>
      <div className={styles.checkboxCol} />
      <div className={styles.listItemContent}>
        <div className={styles.listItemTop}>
          <Skeleton width="40%" height={12} />
          <Skeleton width={50} height={12} />
        </div>
        <Skeleton width="60%" height={15} className={styles.skeletonGap} />
        <Skeleton width="85%" height={13} className={styles.skeletonGap} />
      </div>
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

// 메일 페이지: 예전엔 목록(왼쪽)+상세(오른쪽) 분할 화면이었는데, 모바일 메일 앱처럼
// 평소엔 목록 하나만 꽉 채워 보여주고, 메일을 열면 화면 전체가 상세 화면으로 전환되는 방식으로 바꿈.
export default function MailPage() {
  const [mails, setMails] = useState<MailItem[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openMailId, setOpenMailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[] | null>(null);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    getMails({ page, size: PAGE_SIZE, search: search.trim() || undefined })
      .then(data => {
        setMails(data.content);
        setTotalPages(data.totalPages);
      })
      .catch(() => setError('메일 목록을 불러오지 못했어요.'))
      .finally(() => setLoading(false));
  }, [page, search, refreshKey]);

  const handleSearchChange = (v: string) => {
    setSearch(v);
    setPage(0);
  };

  const openMail = (id: string) => {
    setOpenMailId(id);
    setDetail(null);
    setDetailLoading(true);
    setError(null);
    getMailDetail(id)
      .then(d => {
        setDetail(d);
        // 백엔드가 조회 시점에 읽음 처리해주므로, 목록 쪽도 다시 안 불러오고 바로 반영
        setMails(prev => prev.map(m => (m.id === id ? { ...m, isRead: true } : m)));
      })
      .catch(() => setError('메일을 불러오지 못했어요.'))
      .finally(() => setDetailLoading(false));
  };

  const closeMail = () => {
    setOpenMailId(null);
    setDetail(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev => (prev.size === mails.length ? new Set() : new Set(mails.map(m => m.id))));
  };

  const confirmDeleteNow = async () => {
    const ids = confirmDeleteIds;
    setConfirmDeleteIds(null);
    if (!ids || ids.length === 0) return;
    try {
      await Promise.all(ids.map(id => deleteMail(id)));
      setSelectedIds(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });
      if (openMailId && ids.includes(openMailId)) closeMail();
      setRefreshKey(k => k + 1);
    } catch (e) {
      console.error(e);
    }
  };

  // 선택된 메일들이 전부 읽음 상태면 안읽음으로, 하나라도 안읽음이 있으면 전부 읽음으로 전환
  const handleToggleReadSelected = async () => {
    if (selectedIds.size === 0) return;
    const selected = mails.filter(m => selectedIds.has(m.id));
    const nextRead = !selected.every(m => m.isRead);
    try {
      await Promise.all([...selectedIds].map(id => setMailRead(id, nextRead)));
      setMails(prev => prev.map(m => (selectedIds.has(m.id) ? { ...m, isRead: nextRead } : m)));
    } catch (e) {
      console.error(e);
    }
  };

  // 선택된 메일들의 보낸사람 주소(중복 제거)를 전부 차단
  const selectedSenderAddresses = () =>
    [...new Set(mails.filter(m => selectedIds.has(m.id)).map(m => m.fromAddress))];

  const confirmBlockNow = async () => {
    setConfirmBlock(false);
    const addresses = selectedSenderAddresses();
    if (addresses.length === 0) return;
    try {
      await Promise.all(addresses.map(addr => blockSender(addr)));
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
    }
  };

  if (openMailId) {
    return (
      <div className={styles.container}>
        <div className={styles.detailTopBar}>
          <button className={styles.backBtn} onClick={closeMail} title="목록으로">
            <IoArrowBack />
          </button>
          <div className={styles.detailTopInfo}>
            <div className={styles.detailTopSubject}>{detail?.subject || (detailLoading ? '' : '(제목 없음)')}</div>
            {detail && <div className={styles.detailTopFrom}>{detail.fromAddress}</div>}
          </div>
          <button
            className={styles.deleteBtn}
            onClick={() => setConfirmDeleteIds([openMailId])}
            title="삭제"
          >
            <BsTrash />
          </button>
        </div>

        <div className={styles.detailScroll}>
          {error && <div className={styles.errorBox}>{error}</div>}
          {!error && detailLoading && <div className={styles.empty}>불러오는 중...</div>}
          {!error && !detailLoading && detail && (
            <div>
              <div className={styles.detailMeta}>
                <span>{formatDate(detail.receivedAt)}</span>
              </div>
              {detail.bodyHtml ? (
                <HtmlMailBody html={detail.bodyHtml} />
              ) : (
                <div className={styles.detailBody}>{detail.body}</div>
              )}
              {detail.attachments.length > 0 && (
                <div className={styles.attachmentSection}>
                  <div className={styles.attachmentSectionTitle}>
                    첨부파일 {detail.attachments.length}개
                  </div>
                  {detail.attachments.map(att => (
                    <AttachmentRow key={att.id} attachment={att} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {confirmDeleteIds && (
          <ConfirmDialog
            message="이 메일을 삭제할까요?"
            danger
            onConfirm={confirmDeleteNow}
            onCancel={() => setConfirmDeleteIds(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.listHeader}>
        <input
          className={styles.checkbox}
          type="checkbox"
          checked={mails.length > 0 && selectedIds.size === mails.length}
          onChange={toggleSelectAll}
          title="전체 선택"
        />
        <div className={styles.headerActions}>
          <button
            className={styles.headerActionBtn}
            onClick={handleToggleReadSelected}
            disabled={selectedIds.size === 0}
            title="읽음/안읽음 전환"
          >
            읽음
          </button>
          <button
            className={styles.headerActionBtn}
            onClick={() => setConfirmDeleteIds([...selectedIds])}
            disabled={selectedIds.size === 0}
            title="삭제"
          >
            삭제
          </button>
          <button
            className={styles.headerActionBtn}
            onClick={() => setConfirmBlock(true)}
            disabled={selectedIds.size === 0}
            title="보낸사람 차단"
          >
            차단
          </button>
        </div>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="메일 검색"
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
        />
      </div>

      <div className={styles.listScroll}>
        {loading && Array.from({ length: PAGE_SIZE }, (_, i) => <MailListSkeleton key={i} />)}
        {!loading && mails.length === 0 && (
          <div className={styles.empty}>{search ? '검색 결과가 없어요.' : '받은 메일이 없어요.'}</div>
        )}
        {!loading && mails.map(mail => (
          <div
            key={mail.id}
            className={styles.listItem}
            onClick={() => openMail(mail.id)}
          >
            <input
              className={styles.checkbox}
              type="checkbox"
              checked={selectedIds.has(mail.id)}
              onChange={() => toggleSelect(mail.id)}
              onClick={e => e.stopPropagation()}
            />
            {/* 체크박스는 선택 표시라 읽음 상태랑 무관하게 항상 선명하게 보여야 해서,
                연하게 표시하는 효과는 글자 영역에만 줌 */}
            <div className={`${styles.listItemContent} ${mail.isRead ? styles.listItemRead : ''}`.trim()}>
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
            </div>
          </div>
        ))}
      </div>

      {totalPages > 0 && (
        <div className={styles.pagination}>
          <button className={styles.pageNavBtn} disabled={page === 0} onClick={() => setPage(0)} title="처음">
            <FaAnglesLeft />
          </button>
          <button className={styles.pageNavBtn} disabled={page === 0} onClick={() => setPage(p => p - 1)} title="이전">
            <FaAngleLeft />
          </button>
          {getPageNumbers(page, totalPages).map(p => (
            <button
              key={p}
              className={`${styles.pageNumBtn} ${p === page ? styles.pageNumBtnActive : ''}`.trim()}
              onClick={() => setPage(p)}
            >
              {p + 1}
            </button>
          ))}
          <button className={styles.pageNavBtn} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} title="다음">
            <FaAngleRight />
          </button>
          <button className={styles.pageNavBtn} disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)} title="마지막">
            <FaAnglesRight />
          </button>
        </div>
      )}

      {confirmDeleteIds && (
        <ConfirmDialog
          message={`메일 ${confirmDeleteIds.length}개를 삭제할까요?`}
          danger
          onConfirm={confirmDeleteNow}
          onCancel={() => setConfirmDeleteIds(null)}
        />
      )}

      {confirmBlock && (
        <ConfirmDialog
          message={`보낸사람 ${selectedSenderAddresses().length}명을 차단할까요? 앞으로 이 주소에서 오는 메일은 받지 않아요.`}
          danger
          onConfirm={confirmBlockNow}
          onCancel={() => setConfirmBlock(false)}
        />
      )}
    </div>
  );
}
