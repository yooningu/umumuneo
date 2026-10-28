import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import EmailAliasModal from './components/EmailAliasModal';
import LoginPage from './pages/LoginPage';
import CallbackPage from './pages/auth/CallbackPage';
import HomePage from './pages/HomePage';
import SchedulePage from './pages/SchedulePage';
import TimetablePage from './pages/TimetablePage';
import ChatPage from './pages/ChatPage';
import NasPage from './pages/NasPage';
import MailPage from './pages/MailPage';
import SettingsPage from './pages/SettingsPage';
import UploadProgressWidget from './components/common/UploadProgressWidget';
import { getMe } from './api/user';
import styles from './App.module.css';

// 왼쪽 고정 사이드바 + 페이지 레이아웃
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <Sidebar />
      {/* 페이지 컨텐츠 */}
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}

// 로그인 여부 확인 + 메일 별칭이 아직 없으면(최초 로그인) 정할 때까지 모달로 막음
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('accessToken');
  const [needsEmailAlias, setNeedsEmailAlias] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) return;
    getMe()
      .then(user => setNeedsEmailAlias(user.emailAlias === null))
      .catch(() => setNeedsEmailAlias(false)); // 조회 실패해도 화면은 정상적으로 보여줌
  }, [token]);

  if (!token) return <Navigate to="/login" />;

  return (
    <AppLayout>
      {needsEmailAlias && <EmailAliasModal onDone={() => setNeedsEmailAlias(false)} />}
      {children}
    </AppLayout>
  );
}

// 스크롤 영역에 마우스가 올라가 있을 때만 스크롤바가 보이게 하는 전역 처리.
// 순수 CSS :hover로는 webkit 스크롤바 썸이 "스크롤 막대 자체"에 마우스가 올라갔을 때만
// 반응하고 컨테이너 전체(내용물) 위에서는 안 먹는 경우가 있어서, 실제로 마우스가 올라간
// 요소에서 가장 가까운 스크롤 가능한 조상을 찾아 scroll-hover 클래스를 직접 붙여준다.
function useGlobalScrollbarHover() {
  useEffect(() => {
    let current: Element | null = null;

    const findScrollable = (start: Element | null): Element | null => {
      let el = start;
      while (el && el !== document.body && el !== document.documentElement) {
        const style = getComputedStyle(el);
        const overflowY = style.overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
          return el;
        }
        el = el.parentElement;
      }
      return null;
    };

    const onMove = (e: MouseEvent) => {
      const next = findScrollable(e.target as Element | null);
      if (next === current) return;
      current?.classList.remove('scroll-hover');
      current = next;
      current?.classList.add('scroll-hover');
    };

    const onLeave = () => {
      current?.classList.remove('scroll-hover');
      current = null;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      current?.classList.remove('scroll-hover');
    };
  }, []);
}

export default function App() {
  useGlobalScrollbarHover();

  return (
    <BrowserRouter>
      <Routes>
        {/* 인증 없이 접근 가능 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<CallbackPage />} />

        {/* 인증 필요 - 사이드바 포함 */}
        <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
        <Route path="/schedule" element={<PrivateRoute><SchedulePage /></PrivateRoute>} />
        <Route path="/timetable" element={<PrivateRoute><TimetablePage /></PrivateRoute>} />
        <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="/nas" element={<PrivateRoute><NasPage /></PrivateRoute>} />
        <Route path="/mail" element={<PrivateRoute><MailPage /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
      </Routes>
      {/* 어느 페이지로 이동해도 유지되는 업로드 진행 위젯 - 업로드 중에 다른 페이지로 가도 끊기지 않음 */}
      <UploadProgressWidget />
    </BrowserRouter>
  );
}
