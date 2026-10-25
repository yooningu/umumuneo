import { useEffect } from 'react';
import { IoClose } from "react-icons/io5";
import styles from './Alert.module.css';

interface Props {
  message: string | null;
  onClose: () => void;
  duration?: number; // ms, 자동으로 닫히기까지 시간
}

// window.alert() 대신 쓰는 커스텀 디자인의 토스트 알림.
// 화면을 막지 않고 화면 하단에 잠깐 떴다가 자동으로 사라진다.
// 사용하는 쪽에서 message 상태를 들고 있다가 alert() 호출하던 자리에 setMessage(text)만 하면 됨.
export default function Alert({ message, onClose, duration = 3000 }: Props) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className={styles.wrapper} role="alert">
      <div className={styles.toast}>
        <span className={styles.text}>{message}</span>
        <button className={styles.close} onClick={onClose} aria-label="닫기"><IoClose /></button>
      </div>
    </div>
  );
}
