import { cloneElement, type ReactElement } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Sidebar.module.css';
import { IoTodayOutline, IoToday } from "react-icons/io5";
import { IoMail, IoMailOutline } from "react-icons/io5";
import { HiCloud, HiOutlineCloud } from "react-icons/hi2";
import { IoSettings, IoSettingsOutline } from "react-icons/io5";
import Logo from '../assets/logo.svg?react';
import Chat from '../assets/nav/Chat.svg?react';
import Home from '../assets/nav/Home.svg?react';
import ChatOutline from '../assets/nav/ChatOutline.svg?react';
import HomeOutline from '../assets/nav/HomeOutline.svg?react';


// iconViewBox: Ionicons(Io*)는 512x512 안에 아이콘마다 실제 그려진 영역이 달라서(예: 구름은 꽉 차있고 나머진 여백이 있음)
// 각 아이콘의 path 좌표를 기준으로 실제 그려진 영역만 보이도록 viewBox를 잘라냄
const NAV_ITEMS = [
  { path: '/', label: '로고', icon: <Logo /> },
  { path: '/', label: '홈', icon: <HomeOutline />, activeIcon: <Home /> },
  { path: '/schedule', label: '일정', icon: <IoTodayOutline />, activeIcon: <IoToday />, iconViewBox: '32 32 448 448' },
  { path: '/chat', label: '챗봇', icon: <ChatOutline />, activeIcon: <Chat /> },
  // HiOutlineCloud는 (Ionicons와 달리) 각 path가 아니라 svg 루트에서 fill:none/stroke/strokeWidth를 상속받는
  // 방식이라, attr을 덮어쓸 때 그 셋도 같이 지정해줘야 함 (안 그러면 외곽선이 사라지거나 채워져 버림)
  { path: '/nas', label: 'NAS', icon: <HiOutlineCloud />, activeIcon: <HiCloud />, iconViewBox: '1.5 3.72 21 16.53', iconStroke: '1.5' },
  { path: '/mail', label: '메일', icon: <IoMailOutline />, activeIcon: <IoMail />, iconViewBox: '32 80 448 352' },
  { path: '/settings', label: '설정', icon: <IoSettingsOutline />, activeIcon: <IoSettings />, iconViewBox: '26 26 460 460' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className={styles.sidebar}>
      <div className={styles.buttonContainer}>
        {NAV_ITEMS.map((item, index) => {
          const isActive = location.pathname === item.path;
          const showingActiveIcon = isActive && !!item.activeIcon;
          const icon = showingActiveIcon ? item.activeIcon : item.icon;

          // outline 아이콘 중 svg 루트에서 fill:none/stroke를 상속받는 방식(HiOutlineCloud)은
          // attr을 덮어쓸 때 그 둘도 같이 지정해줘야 외곽선이 안 사라짐
          const attrOverride = item.iconViewBox
            ? (!showingActiveIcon && item.iconStroke
                ? { viewBox: item.iconViewBox, fill: 'none', stroke: 'currentColor', strokeWidth: item.iconStroke }
                : { viewBox: item.iconViewBox, fill: 'currentColor' })
            : undefined;

          const iconNode = cloneElement(icon as ReactElement<{ className?: string; attr?: Record<string, string | undefined> }>, {
            className: styles.icon,
            ...(attrOverride && { attr: attrOverride }),
          });

          return (
            <button
              key={item.path + index}
              className={styles.navButton}
              onClick={() => navigate(item.path)}
            >
              {iconNode}
              <span className={styles.label}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
