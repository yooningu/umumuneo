import { useEffect, useRef } from 'react';
import styles from './AttachMenu.module.css';

interface Props {
  onLocalFile: () => void;
  onNasFile: () => void;
  onClose: () => void;
}

// "+" 버튼을 누르면 뜨는 작은 메뉴 - 내 기기에서 파일을 고를지, NAS에 이미 올라가 있는
// 파일을 고를지 선택하게 함 (구글 드라이브의 "파일 추가"/"폴더 업로드" 메뉴와 비슷한 구조)
export default function AttachMenu({ onLocalFile, onNasFile, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // 바깥 클릭하면 닫힘 - 메뉴를 띄우는 클릭 자체가 바로 바깥 클릭으로 잡히지 않게 한 틱 미뤄서 등록
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', onMouseDown), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [onClose]);

  return (
    <div className={styles.menu} ref={ref}>
      <button className={styles.menuItem} onClick={onLocalFile}>내 파일 추가</button>
      <div className={styles.divider} />
      <button className={styles.menuItem} onClick={onNasFile}>NAS에서 추가</button>
    </div>
  );
}
