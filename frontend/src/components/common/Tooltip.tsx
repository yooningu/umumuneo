import type { ReactNode } from 'react';
import styles from './Tooltip.module.css';

interface Props {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}

// 네이티브 title 속성(브라우저 기본 디자인) 대신 커스텀 디자인으로 보여주는 호버 툴팁.
// children을 감싸서 호버하면 content가 말풍선으로 뜬다.
// content가 '\n'이 포함된 문자열이면 한 줄(=일정 하나)씩 나눠서, 줄바꿈 없이 말줄임표(...)로 잘리게 한다.
export default function Tooltip({ content, children, className }: Props) {
  if (!content) return <>{children}</>;
  const lines = typeof content === 'string' ? content.split('\n') : null;
  return (
    <span className={[styles.wrapper, className].filter(Boolean).join(' ')}>
      {children}
      <span className={styles.bubble}>
        {lines
          ? lines.map((line, i) => <span key={i} className={styles.line}>{line}</span>)
          : content}
      </span>
    </span>
  );
}
