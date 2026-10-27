import { useState } from 'react';
import ChatSessionList from '../components/chat/ChatSessionList';
import ChatPanel from '../components/chat/ChatPanel';
import styles from './ChatPage.module.css';

// 챗봇 페이지: 왼쪽은 대화 목록(ChatSessionList), 오른쪽은 실제 대화창(ChatPanel).
// 홈 화면의 ChatWidget과는 별개 컴포넌트 - UI를 서로 다르게 가져갈 예정이라 공유하지 않음.
// panelKey는 "사용자가 직접 다른 세션을 선택/새 대화를 눌렀을 때"만 올려서 ChatPanel을 새로
// 마운트시켜 그 세션의 대화 기록을 처음부터 불러오게 한다. 반면 지금 하던 새 대화가 첫 메시지를
// 보내고 막 세션 id를 받은 경우(onSessionCreated)는 같은 대화가 이어지는 것뿐이라 리마운트하면
// 안 됨 - activeSessionId만 갱신(사이드바 강조 표시용)하고 panelKey는 그대로 둔다.
export default function ChatPage() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [panelKey, setPanelKey] = useState(0);

  const handleSelect = (sessionId: string | null) => {
    setActiveSessionId(sessionId);
    setPanelKey(k => k + 1);
  };

  return (
    <div className={styles.container}>
      <div className={styles.sidePane}>
        <ChatSessionList
          activeSessionId={activeSessionId}
          onSelect={handleSelect}
          refreshKey={listRefreshKey}
        />
      </div>
      <div className={styles.mainPane}>
        <ChatPanel
          key={panelKey}
          initialSessionId={activeSessionId}
          onSessionCreated={(sessionId) => {
            console.log('[ChatPage] onSessionCreated', sessionId);
            setActiveSessionId(sessionId);
            setListRefreshKey(k => k + 1);
          }}
        />
      </div>
    </div>
  );
}
