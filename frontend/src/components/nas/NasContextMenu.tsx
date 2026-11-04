import { useEffect, useRef } from 'react';
import styles from './NasContextMenu.module.css';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

// 나스 그리드 우클릭(또는 모바일 길게 누르기) 메뉴. 바깥 클릭/터치/ESC 하면 닫힘.
// (다른 곳 우클릭 시 재배치/재오픈은 상위의 document contextmenu 리스너가 이미 처리하므로
// 여기서 또 'contextmenu'로 닫아버리면 "열기 직후 바로 닫힘" 경합이 생겨서 안 넣음)
//
// "바깥 클릭"을 'click' 이벤트 + stopPropagation으로 감지하면 모바일에서 문제가 생김:
// 메뉴를 띄운 길게누르기 제스처가 끝나는 touchend 하나로도 메뉴 안의 버튼을 탭한 것처럼
// 보일 수 있어서, 메뉴 안을 눌러도 click이 뜨기 전에(또는 다른 타이밍에) 메뉴가 먼저
// 닫혀버려 버튼의 onClick이 아예 실행되지 않는 경우가 있었음. 그래서 메뉴 DOM을 ref로 들고
// mousedown/touchstart 시점에 "메뉴 안인지"를 직접 contains()로 판단하는 방식으로 바꿔서,
// 메뉴 안을 눌렀을 때는 절대 바깥 클릭으로 취급되지 않게 함.
export default function NasContextMenu({ x, y, items, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: Event) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div ref={menuRef} className={styles.menu} style={{ left: x, top: y }}>
      {items.map((item, i) => (
        <button
          key={i}
          className={`${styles.menuItem} ${item.danger ? styles.menuItemDanger : ''}`.trim()}
          disabled={item.disabled}
          onClick={() => { item.onClick(); onClose(); }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
