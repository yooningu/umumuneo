import type { CSSProperties } from 'react';
import styles from './Skeleton.module.css';

interface Props {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

// 로딩 중에 내용 모양만 흐릿하게 먼저 보여주는 스켈레톤 블록 하나. 각 리스트는 이걸 조합해서
// 자기 레이아웃(아바타+텍스트, 줄 여러 개 등)에 맞는 스켈레톤 행을 만들어 씀
export default function Skeleton({ width = '100%', height = '14px', borderRadius = '6px', className }: Props) {
  const style: CSSProperties = { width, height, borderRadius };
  return <div className={`${styles.skeleton} ${className ?? ''}`.trim()} style={style} />;
}
