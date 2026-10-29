import { useState, useEffect, useRef } from 'react';
import { getMemo, updateMemo } from '../../api/memo';
import styles from './MemoWidget.module.css';

const AUTOSAVE_DELAY_MS = 1200;

type SaveState = 'idle' | 'saving' | 'saved';

// 저장 버튼 없이, 타이핑을 멈추고 일정 시간이 지나면 자동으로 저장되는 메모장
export default function MemoWidget() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef('');

  useEffect(() => {
    getMemo()
      .then(memo => {
        setContent(memo.content);
        latestContentRef.current = memo.content;
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const scheduleSave = (next: string) => {
    latestContentRef.current = next;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      saveTimerRef.current = null;
      setSaveState('saving');
      try {
        await updateMemo(latestContentRef.current);
        setSaveState('saved');
      } catch (e) {
        console.error(e);
        setSaveState('idle');
      }
    }, AUTOSAVE_DELAY_MS);
  };

  // 컴포넌트가 사라질 때(다른 탭으로 전환 등) 아직 저장 안 된 변경이 남아있으면 그 전에 바로 저장
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        updateMemo(latestContentRef.current).catch(console.error);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setSaveState('idle');
    scheduleSave(e.target.value);
  };

  return (
    <div className={styles.container}>
      {loading ? (
        <div className={styles.empty}>불러오는 중...</div>
      ) : (
        <textarea
          className={styles.textarea}
          value={content}
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
