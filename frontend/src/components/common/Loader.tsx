import styles from './Loader.module.css';

interface Props {
  size?: number; // px
  className?: string;
}

// 로딩 아이콘: 정삼각형으로 배치된 점 3개가 회전하면서 중앙으로 모였다가 잠깐 멈춘 뒤
// 다시 퍼지기를 반복한다. 색은 currentColor를 따라가므로 부모의 text color로 조절하면 됨.
export default function Loader({ size = 20, className }: Props) {
  return (
    <div
      className={[styles.loader, className].filter(Boolean).join(' ')}
      style={{ width: size, height: size }}
      role="status"
      aria-label="로딩 중"
    >
      <div className={styles.spoke}>
        <span className={styles.dot} />
      </div>
      <div className={styles.spoke}>
        <span className={styles.dot} />
      </div>
      <div className={styles.spoke}>
        <span className={styles.dot} />
      </div>
    </div>
  );
}
