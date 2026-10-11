import { useState, useEffect } from 'react';
import { getSessions, deleteSession } from '../api/chat';
import type { ChatSession } from '../types';
import styles from './ChatSessionList.module.css';

interface Props {
  activeSessionId: string | null;
  onSelect: (sessionId: string | null) => void;
  refreshKey?: number;
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
export default function ChatSessionList({ activeSessionId, onSelect, refreshKey }: Props) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    getSessions().then(setSessions).catch(console.error);
  }, [refreshKey]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('이 대화를 삭제할까요?')) return;
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
      <button className={styles.newBtn} onClick={() => onSelect(null)}>+ 새 대화</button>
      <div className={styles.list}>
        {sessions.length === 0 ? (
          <div className={styles.empty}>대화 기록이 없습니다</div>
        ) : (
          sessions.map(s => (
            <div
              key={s.id}
              className={`${styles.item} ${activeSessionId === s.id ? styles.itemActive : ''}`.trim()}
              onClick={() => onSelect(s.id)}
            >
              <div className={styles.itemTitle}>{s.title || '새 대화'}</div>
              <div className={styles.itemMeta}>
                <span>{formatRelative(s.lastActiveAt)}</span>
                <button className={styles.deleteBtn} onClick={e => handleDelete(e, s.id)}>×</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
