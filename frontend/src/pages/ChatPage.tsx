import { useState } from 'react';
import { FaXmark } from 'react-icons/fa6';
import ChatSessionList from '../components/chat/ChatSessionList';
import ChatPanel from '../components/chat/ChatPanel';
import useMediaQuery from '../hooks/useMediaQuery';
import drawer from '../styles/drawer.module.css';
import styles from './ChatPage.module.css';

// 챗봇 페이지: 왼쪽은 대화 목록(ChatSessionList), 오른쪽은 실제 대화창(ChatPanel).
// 홈 화면의 ChatWidget과는 별개 컴포넌트 - UI를 서로 다르게 가져갈 예정이라 공유하지 않음.
// panelKey는 "사용자가 직접 다른 세션을 선택/새 대화를 눌렀을 때"만 올려서 ChatPanel을 새로
// 마운트시켜 그 세션의 대화 기록을 처음부터 불러오게 한다. 반면 지금 하던 새 대화가 첫 메시지를
// 보내고 막 세션 id를 받은 경우(onSessionCreated)는 같은 대화가 이어지는 것뿐이라 리마운트하면
// 안 됨 - activeSessionId만 갱신(사이드바 강조 표시용)하고 panelKey는 그대로 둔다.
//
// 모바일 기준은 이 페이지만의 값 대신, Sidebar가 하단 독으로 바뀌는 지점(824px)과 동일하게 맞춤
const MOBILE_BREAKPOINT = '(max-width: 824px)';

export default function ChatPage() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [panelKey, setPanelKey] = useState(0);
  const [listCollapsed, setListCollapsed] = useState(false); // 데스크톱/태블릿 전용 - 접어서 동그란 아이콘으로
  const [listDrawerOpen, setListDrawerOpen] = useState(false); // 모바일 전용 - 서랍으로 열림
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT);

  const handleSelect = (sessionId: string | null) => {
    setActiveSessionId(sessionId);
    setPanelKey(k => k + 1);
    setListDrawerOpen(false); // 모바일에서 세션을 고르면 서랍은 자동으로 닫힘
  };

  return (
    <div className={styles.container}>
      {/* 데스크톱/태블릿 - 목록이 공간을 차지하는 사이드 패널(접으면 동그란 아이콘으로 줄어듦) */}
      {!isMobile && (
        <div className={`${styles.sidePane} ${listCollapsed ? styles.sidePaneCollapsed : ''}`.trim()}>
          <ChatSessionList
            activeSessionId={activeSessionId}
            onSelect={handleSelect}
            refreshKey={listRefreshKey}
            collapsed={listCollapsed}
            onToggleCollapse={() => setListCollapsed(v => !v)}
          />
        </div>
      )}

      <div className={styles.mainPane}>
        <ChatPanel
          key={panelKey}
          initialSessionId={activeSessionId}
          onSessionCreated={(sessionId) => {
            setActiveSessionId(sessionId);
            setListRefreshKey(k => k + 1);
          }}
          onToggleList={isMobile ? () => setListDrawerOpen(true) : undefined}
        />
      </div>

      {/* 모바일 - 목록이 공간을 차지하지 않고, 일정 페이지와 같은 방식으로 왼쪽에서 서랍이
          덮어씌워지고 나머지 화면은 살짝 어둡게 처리됨 */}
      {isMobile && listDrawerOpen && (
        <div className={drawer.drawerOverlay} onClick={() => setListDrawerOpen(false)}>
          <div className={`${drawer.drawerPanel} ${styles.drawerPanel}`.trim()} onClick={e => e.stopPropagation()}>
            <button type="button" className={drawer.drawerClose} onClick={() => setListDrawerOpen(false)} aria-label="닫기">
              <FaXmark />
            </button>
            <ChatSessionList
              activeSessionId={activeSessionId}
              onSelect={handleSelect}
              refreshKey={listRefreshKey}
            />
          </div>
        </div>
      )}
    </div>
  );
}
