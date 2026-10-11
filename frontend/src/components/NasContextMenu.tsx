import { useEffect } from 'react';
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

// 나스 그리드 우클릭 메뉴. 바깥 좌클릭/ESC 하면 닫힘.
// (다른 곳 우클릭 시 재배치/재오픈은 상위의 document contextmenu 리스너가 이미 처리하므로
// 여기서 또 'contextmenu'로 닫아버리면 "열기 직후 바로 닫힘" 경합이 생겨서 안 넣음)
export default function NasContextMenu({ x, y, items, onClose }: Props) {
  useEffect(() => {
    const handleOutside = () => onClose();
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('click', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('click', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div className={styles.menu} style={{ left: x, top: y }} onClick={e => e.stopPropagation()}>
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
