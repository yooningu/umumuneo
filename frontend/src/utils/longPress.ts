const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE_PX = 10;

// 터치 기기에서 "길게 누르기"를 마우스 우클릭(contextmenu)과 동일하게 취급하기 위한 유틸.
// 리액트 훅이 아니라 평범한 함수라 .map() 루프 안에서 여러 개 렌더링되는 요소들에도 안전하게
// 쓸 수 있음 - 엘리먼트 하나하나에 등록하는 게 아니라, 공통 조상(container) 하나에 한 번만
// 이벤트 리스너를 걸고 터치 지점의 엘리먼트를 그대로 콜백에 넘겨주는 이벤트 위임 방식.
// 일정 시간 이상 손가락을 거의 안 움직이고 누르고 있으면 onLongPress(x, y, 누른 지점)를 호출함.
export function attachLongPress(
  container: Document | HTMLElement,
  onLongPress: (x: number, y: number, target: HTMLElement) => void
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let start: { x: number; y: number } | null = null;
  let touchTarget: HTMLElement | null = null;
  let fired = false;

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    start = null;
    touchTarget = null;
  };

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) {
      clear();
      return;
    }
    fired = false;
    const touch = e.touches[0];
    start = { x: touch.clientX, y: touch.clientY };
    touchTarget = e.target as HTMLElement;
    timer = setTimeout(() => {
      if (start && touchTarget) {
        fired = true;
        onLongPress(start.x, start.y, touchTarget);
      }
      clear();
    }, LONG_PRESS_MS);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!timer || !start) return;
    const touch = e.touches[0];
    if (
      Math.abs(touch.clientX - start.x) > MOVE_TOLERANCE_PX ||
      Math.abs(touch.clientY - start.y) > MOVE_TOLERANCE_PX
    ) {
      clear();
    }
  };

  // 길게 눌러서 메뉴가 떴으면, 손을 뗄 때 같이 발생하는 합성 클릭을 막아서
  // 메뉴가 뜨자마자 그 클릭으로 다시 닫혀버리는 걸 방지함
  const onTouchEnd = (e: TouchEvent) => {
    if (fired) {
      e.preventDefault();
      fired = false;
    }
    clear();
  };

  container.addEventListener('touchstart', onTouchStart as EventListener, { passive: true });
  container.addEventListener('touchmove', onTouchMove as EventListener, { passive: true });
  container.addEventListener('touchend', onTouchEnd as EventListener);
  container.addEventListener('touchcancel', onTouchEnd as EventListener);

  return () => {
    container.removeEventListener('touchstart', onTouchStart as EventListener);
    container.removeEventListener('touchmove', onTouchMove as EventListener);
    container.removeEventListener('touchend', onTouchEnd as EventListener);
    container.removeEventListener('touchcancel', onTouchEnd as EventListener);
    clear();
  };
}
