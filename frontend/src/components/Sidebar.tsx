import { cloneElement, useEffect, useState, type ReactElement } from 'react';
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
  // 모바일에서는 설정이 각 페이지 상단바로 옮겨가서(ex. 홈 화면 상단바) 하단 탭바에서는 숨김 (Sidebar.module.css)
  { path: '/settings', label: '설정', icon: <IoSettingsOutline />, activeIcon: <IoSettings />, iconViewBox: '26 26 460 460', mobileHidden: true },
];

const NEAR_BOTTOM_PX = 4; // 스크롤이 이 정도까지 바닥에 붙으면 "맨 끝"으로 침
const MIN_SCROLLABLE_HEIGHT = 150; // 작은 팝오버/드롭다운 스크롤까지 반응하지 않도록 거르는 최소 높이

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  // 모바일 전용 - 어떤 스크롤 영역이든(일정 목록, 타임라인 등) 맨 아래에 닿으면 떠있는
  // 독을 아래로 내려서 숨기고, 거기서 조금이라도 위로 올리면 다시 보이게 함
  const [hiddenByScroll, setHiddenByScroll] = useState(false);

  useEffect(() => {
    // scroll 이벤트는 기본적으로 버블링이 안 돼서, window에 캡처 단계로 걸어야
    // 어느 하위 스크롤 영역에서 발생했든 잡을 수 있음
    const onScroll = (e: Event) => {
      const el = e.target;
      if (!(el instanceof HTMLElement) || el.clientHeight < MIN_SCROLLABLE_HEIGHT) return;
      // 하루짜리 타임라인(MobileDayAgenda)처럼 이미 패딩으로 네비 자리를 비워둔 화면은
      // 끝까지 스크롤해도 가려질 일이 없으니 숨기지 않고 항상 보이게 함
      if (el.closest('[data-keep-nav]')) { setHiddenByScroll(false); return; }
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setHiddenByScroll(distanceFromBottom <= NEAR_BOTTOM_PX);
    };
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, []);

  return (
    <nav className={`${styles.sidebar} ${hiddenByScroll ? styles.sidebarHidden : ''}`.trim()}>
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
              className={`${styles.navButton} ${isActive ? styles.navButtonActive : ''} ${item.mobileHidden ? styles.mobileHidden : ''}`.trim()}
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
