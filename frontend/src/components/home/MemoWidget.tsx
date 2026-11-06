import { useState, useEffect, useRef } from 'react';
import { getMemos, createMemo, updateMemo, deleteMemo } from '../../api/memo';
import type { Memo } from '../../types';
import Skeleton from '../common/Skeleton';
import styles from './MemoWidget.module.css';

const AUTOSAVE_DELAY_MS = 1200;

type SaveState = 'idle' | 'saving' | 'saved';

// 브라우저 탭처럼 메모를 여러 개 둘 수 있는 메모장 - 탭 제목은 그 메모 내용의 첫 줄을 그대로 씀.
// 저장 버튼 없이, 타이핑을 멈추고 일정 시간이 지나면 자동으로 저장됨
function titleOf(memo: Memo): string {
  const firstLine = memo.content.split('\n')[0].trim();
  return firstLine || '제목 없음';
}

export default function MemoWidget() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ id: string; content: string } | null>(null);

  useEffect(() => {
    getMemos()
      .then(list => {
        setMemos(list);
        setActiveId(list[0]?.id ?? null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // 저장 타이머가 아직 안 끝났으면(탭 전환/언마운트 등으로) 바로 지금 저장시켜버림
  const flushPending = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (pendingRef.current) {
      const { id, content } = pendingRef.current;
      pendingRef.current = null;
      updateMemo(id, content).catch(console.error);
    }
  };

  const scheduleSave = (id: string, content: string) => {
    pendingRef.current = { id, content };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      saveTimerRef.current = null;
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (!pending) return;
      setSaveState('saving');
      try {
        await updateMemo(pending.id, pending.content);
        setSaveState('saved');
      } catch (e) {
        console.error(e);
        setSaveState('idle');
      }
    }, AUTOSAVE_DELAY_MS);
  };

  // 컴포넌트가 사라질 때(다른 탭으로 전환 등) 아직 저장 안 된 변경이 남아있으면 그 전에 바로 저장
  useEffect(() => flushPending, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!activeId) return;
    const next = e.target.value;
    setMemos(prev => prev.map(m => (m.id === activeId ? { ...m, content: next } : m)));
    setSaveState('idle');
    scheduleSave(activeId, next);
  };

  const switchTab = (id: string) => {
    if (id === activeId) return;
    flushPending();
    setActiveId(id);
    setSaveState('idle');
  };

  const addTab = async () => {
    flushPending();
    try {
      const created = await createMemo();
      setMemos(prev => [...prev, created]);
      setActiveId(created.id);
      setSaveState('idle');
    } catch (e) {
      console.error(e);
    }
  };

  const closeTab = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (memos.length <= 1) return; // 최소 하나는 남겨둠
    if (id === activeId) flushPending();
    try {
      await deleteMemo(id);
    } catch (e) {
      console.error(e);
      return;
    }
    const closedIndex = memos.findIndex(m => m.id === id);
    const remaining = memos.filter(m => m.id !== id);
    setMemos(remaining);
    if (activeId === id) {
      const fallback = remaining[Math.min(closedIndex, remaining.length - 1)];
      setActiveId(fallback?.id ?? null);
      setSaveState('idle');
    }
  };

  const activeMemo = memos.find(m => m.id === activeId) ?? null;

  return (
    <div className={styles.container}>
      <div className={styles.tabBar}>
        {memos.map(m => (
          <button
            key={m.id}
            type="button"
            className={`${styles.tab} ${m.id === activeId ? styles.tabActive : ''}`.trim()}
            onClick={() => switchTab(m.id)}
            title={titleOf(m)}
          >
            <span className={styles.tabTitle}>{titleOf(m)}</span>
            {memos.length > 1 && (
              <span className={styles.tabClose} onClick={e => closeTab(m.id, e)} role="button" aria-label="메모 닫기">
                ×
              </span>
            )}
          </button>
        ))}
        <button type="button" className={styles.addTabBtn} onClick={addTab} aria-label="새 메모 추가">
          +
        </button>
      </div>

      {loading ? (
        <div className={styles.skeletonWrap}>
          <Skeleton width="90%" />
          <Skeleton width="75%" />
          <Skeleton width="85%" />
          <Skeleton width="40%" />
        </div>
      ) : (
        <textarea
          className={styles.textarea}
          value={activeMemo?.content ?? ''}
          onChange={handleChange}
          placeholder="메모를 입력하세요"
        />
      )}
      <div className={styles.statusRow}>
        {saveState === 'saving' && <span>저장 중...</span>}
        {saveState === 'saved' && <span>저장됨</span>}
      </div>
    </div>
  );
}
