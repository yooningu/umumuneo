import { useState } from 'react';
import ChatSessionList from '../components/chat/ChatSessionList';
import ChatWidget from '../components/chat/ChatWidget';
import styles from './ChatPage.module.css';

// 챗봇 페이지: 왼쪽은 대화 목록(ChatSessionList), 오른쪽은 실제 대화창(ChatWidget).
// key={activeSessionId}로 세션을 바꿀 때마다 ChatWidget을 통째로 새로 마운트시켜서
// (내부 상태가 많아 부분 전환보다 깔끔함) 그 세션의 대화 기록을 처음부터 불러오게 한다.
export default function ChatPage() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  return (
    <div className={styles.container}>
      <div className={styles.sidePane}>
        <ChatSessionList
          activeSessionId={activeSessionId}
          onSelect={setActiveSessionId}
          refreshKey={listRefreshKey}
        />
      </div>
      <div className={styles.mainPane}>
        <ChatWidget
          key={activeSessionId ?? 'new'}
          initialSessionId={activeSessionId}
          onSessionCreated={(sessionId) => {
            setActiveSessionId(sessionId);
            setListRefreshKey(k => k + 1);
          }}
        />
      </div>
    </div>
  );
}
