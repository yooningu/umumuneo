import { useState, useEffect } from 'react';
import { IoClose } from "react-icons/io5";
import { FaPlus } from "react-icons/fa";
import { BsReverseLayoutSidebarInsetReverse } from "react-icons/bs";
import { getSessions, deleteSession } from '../../api/chat';
import ConfirmDialog from '../common/ConfirmDialog';
import Skeleton from '../common/Skeleton';
import type { ChatSession } from '../../types';
import styles from './ChatSessionList.module.css';

interface Props {
  activeSessionId: string | null;
  onSelect: (sessionId: string | null) => void;
  refreshKey?: number;
  // 접혀있으면 목록 자체를 숨기고 이 동그란 토글 아이콘만 보여줌 (ChatPage.tsx가 너비/높이 애니메이션을 담당)
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

function formatRelative(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

// 챗봇 페이지 왼쪽에 들어가는 대화 목록. 클릭하면 그 세션으로, "+ 새 대화"를 누르면
// sessionId를 null로 올려줘서(ChatPage가 ChatWidget을 새로 마운트) 빈 대화를 시작한다.
export default function ChatSessionList({ activeSessionId, onSelect, refreshKey, collapsed, onToggleCollapse }: Props) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    getSessions().then(setSessions).catch(console.error).finally(() => setLoading(false));
  }, [refreshKey]);

  // 접힌 상태 - 목록 데이터를 불러올 필요도 없이, 다시 펼치는 동그란 토글 버튼만 보여줌
  if (collapsed) {
    return (
      <button className={styles.collapsedToggle} onClick={onToggleCollapse} aria-label="대화 목록 펼치기" title="대화 목록 펼치기">
        <BsReverseLayoutSidebarInsetReverse />
      </button>
    );
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    if (!id) return;
    try {
      await deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSessionId === id) onSelect(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.topRow}>
        <button className={styles.newBtn} onClick={() => onSelect(null)}>
          <FaPlus />
          새 대화
        </button>
        {/* 서랍(모바일)에서 쓰일 땐 onToggleCollapse를 안 넘겨줘서 이 버튼이 안 뜸 - 닫기는
            서랍 자체의 X/바깥 영역 클릭으로 처리하기 때문 */}
        {onToggleCollapse && (
          <button className={styles.collapseBtn} onClick={onToggleCollapse} aria-label="대화 목록 접기" title="대화 목록 접기">
            <BsReverseLayoutSidebarInsetReverse />
          </button>
        )}
      </div>
      <div className={styles.list}>
        {loading ? (
          [0, 1, 2, 3, 4].map(i => (
            <div key={i} className={styles.skeletonItem}>
              <Skeleton width="60%" height={13} />
              <Skeleton width={36} height={11} />
            </div>
          ))
        ) : sessions.length === 0 ? (
          <div className={styles.empty}>대화 기록이 없습니다</div>
        ) : (
          sessions.map(s => (
            <div
              key={s.id}
              className={`${styles.item} ${activeSessionId === s.id ? styles.itemActive : ''}`.trim()}
              onClick={() => onSelect(s.id)}
            >
              <div className={styles.itemTitle}>{s.title || '새 대화'}</div>
              <div className={styles.itemRight}>
                <span className={styles.itemTime}>{formatRelative(s.lastActiveAt)}</span>
                <button className={styles.deleteBtn} onClick={e => handleDelete(e, s.id)}><IoClose size={20} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {confirmDeleteId && (
        <ConfirmDialog
          message="이 대화를 삭제할까요?"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
