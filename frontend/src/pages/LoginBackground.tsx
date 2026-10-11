import { useEffect, useRef } from 'react';
import { CONFIG } from './loginGalaxyConfig';
import { initLoginScene } from './loginSceneEffect';
import { initLoginGalaxy } from './loginGalaxyEffect';
import './LoginBackground.css';

// 로그인 화면 배경 애니메이션 (frontend/ex 안의 vanilla JS 목업을 그대로 옮긴 것).
// 별이 모여 로고 모양이 되고, 그 뒤로 구가 나타나며, 그 뒤로는 네트워크/터미널/글리치 효과가 깔림.
// 디자인/동작은 원본 그대로이고, mount될 때 시작해서 unmount될 때 정리되도록 effect로만 감쌈.
export default function LoginBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cleanupScene = canvasRef.current ? initLoginScene(canvasRef.current, CONFIG) : undefined;
    const cleanupGalaxy = initLoginGalaxy(CONFIG);
    return () => {
      cleanupScene?.();
      cleanupGalaxy?.();
    };
  }, []);

  return (
    <div className="loginBg">
      <canvas id="scene" ref={canvasRef} />

      <div className="stage" id="stage">
        {/* 아이콘이 다 모인 뒤 크게 나타났다가 작아지면서 아이콘을 감싸는 구 */}
        <div className="sphere">
          <div className="galaxy" id="galaxy" />
        </div>
        {/* 화면 전체에 퍼져 있다가 구 중심으로 모이는 별 */}
        <div className="shape" id="shape" />
      </div>

      <div id="scanlines" />
      <div id="vignette" />

      {/* 상단 글자 (내용은 loginGalaxyConfig.ts의 title) */}
      <div className="title" id="title" />
      <div className="subtitle" id="subtitle" />
    </div>
  );
}
