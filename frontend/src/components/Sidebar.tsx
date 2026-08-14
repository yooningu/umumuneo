import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Sidebar.module.css';

// 네비게이션 아이템
const NAV_ITEMS = [
  { path: '/',          label: '홈',     icon: '🏠' },
  { path: '/schedule',  label: '일정',   icon: '📅' },
  { path: '/timetable', label: '시간표', icon: '📋' },
  { path: '/chat',      label: '챗봇',   icon: '💬' },
  { path: '/nas',       label: 'NAS',    icon: '🗂️' },
  { path: '/settings',  label: '설정',   icon: '⚙️' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className={styles.sidebar}>
      <div className={styles.logo}>캘린더</div>
      {NAV_ITEMS.map(item => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`${styles.navButton} ${isActive ? styles.active : ''}`.trim()}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
