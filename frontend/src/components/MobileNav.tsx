import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NAV_ITEMS, renderNavIcon } from './Sidebar';
import styles from './MobileNav.module.css';

// 로고/설정 제외하고 실제로 하단 독에 보이는 버튼만 - 토글 썸(활성 버튼 뒤에서 미끄러지는
// 브랜드색 배경)이 몇 번째 자리로 움직여야 하는지 계산하는 데 씀
const MOBILE_ITEMS = NAV_ITEMS.filter(item => item.label !== '로고' && !item.mobileHidden);
const NAV_THUMB_STEP_PX = 56; // 버튼 48px + 간격 8px

const NEAR_BOTTOM_PX = 4; // 스크롤이 이 정도까지 바닥에 붙으면 "맨 끝"으로 침
const MIN_SCROLLABLE_HEIGHT = 150; // 작은 팝오버/드롭다운 스크롤까지 반응하지 않도록 거르는 최소 높이

// 824px 미만에서 Sidebar 대신 쓰는, 화면 바닥에서 떠있는 하단 아이콘 독.
// 별도 컴포넌트로 뺀 이유 - PC용 Sidebar랑 같은 DOM에서 미디어쿼리로만 모양을 바꾸려니
// (로고 숨김, 토글 썸 삽입 등) :first-child/:last-child 선택자가 서로 꼬여서 깨지기 쉬웠음
export default function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  // 어떤 스크롤 영역이든(일정 목록, 타임라인 등) 맨 아래에 닿으면 독을 아래로 내려서 숨기고,
  // 거기서 조금이라도 위로 올리면 다시 보이게 함
  const [hiddenByScroll, setHiddenByScroll] = useState(false);
  const activeIndex = MOBILE_ITEMS.findIndex(item => item.path === location.pathname);

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
    <nav className={`${styles.dock} ${hiddenByScroll ? styles.dockHidden : ''}`.trim()}>
      <div className={styles.buttonContainer}>
        {/* 활성 버튼 뒤에서 브랜드색으로 미끄러지는 토글 썸 */}
        {activeIndex >= 0 && (
          <div
            className={styles.navThumb}
            style={{ transform: `translateX(${activeIndex * NAV_THUMB_STEP_PX}px)` }}
          />
        )}
        {MOBILE_ITEMS.map((item, index) => {
          const isActive = location.pathname === item.path;
          const iconNode = renderNavIcon(item, isActive, styles.icon);

          return (
            <button
              key={item.path + index}
              className={`${styles.navButton} ${isActive ? styles.navButtonActive : ''}`.trim()}
              onClick={() => navigate(item.path)}
            >
              {iconNode}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
