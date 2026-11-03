import { useEffect } from 'react';

// 모바일 가상 키보드가 뜨면 visualViewport(실제 보이는 영역)가 줄어드는 걸 감지해서,
// 지금 포커스된 입력창/텍스트영역이 키보드에 가려지지 않게 화면 안으로 스크롤해준다.
// 페이지마다 따로 붙일 필요 없이 앱 전체에 한 번만 걸어두면 됨(App.tsx에서 호출).
// 다만 overflow:hidden으로 고정된 레이아웃 안에서는 스크롤할 조상이 없어서 효과가 안 날 수 있음.
export function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) return;
      if (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA') return;
      // 키보드가 다 올라온 뒤에 스크롤해야 위치가 어긋나지 않아서 한 틱 미룸
      requestAnimationFrame(() => {
        active.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    };

    vv.addEventListener('resize', handleResize);
    return () => vv.removeEventListener('resize', handleResize);
  }, []);
}
