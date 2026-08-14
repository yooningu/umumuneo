import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import CallbackPage from './pages/auth/CallbackPage';
import HomePage from './pages/HomePage';
import SchedulePage from './pages/SchedulePage';
import TimetablePage from './pages/TimetablePage';
import ChatPage from './pages/ChatPage';
import NasPage from './pages/NasPage';
import SettingsPage from './pages/SettingsPage';
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

// 로그인 여부 확인
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('accessToken');
  return token ? <AppLayout>{children}</AppLayout> : <Navigate to="/login" />;
}

export default function App() {
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
        <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
