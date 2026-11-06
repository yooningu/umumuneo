import { useState, useEffect } from 'react';

// CSS 미디어 쿼리 문자열을 그대로 받아서 그 조건이 맞는지(boolean)를 돌려줌 - 레이아웃 자체가
// (CSS로 숨기고 보여주는 수준이 아니라) 완전히 다른 컴포넌트 트리로 갈려야 할 때(ex. 홈 화면
// 모바일 뷰) 데스크톱/모바일 트리를 동시에 마운트해서 API를 두 번 부르지 않도록 씀
export default function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = () => setMatches(mql.matches);
    handler();
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
