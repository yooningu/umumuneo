import { useEffect, useRef, useState } from 'react';
import { initLoginScene } from './loginSceneEffect';
import { initLoginLiquidBackground } from './loginLiquidEffect';
import { initLoginGalaxy } from './loginGalaxyEffect';
import { initLoginSphereGpu } from './loginSphereGpuEffect';
import './LoginBackground.css';

// 앱 전체(사이드바 등)에서 쓰는 모바일 기준(824px)과 동일하게 맞춤
const MOBILE_BREAKPOINT = 824;

// 로그인 배경 애니메이션 설정값 (frontend/ex/config.js를 그대로 옮긴 것 - 값 변경 없음)
// 색상은 '#RRGGBB' 또는 투명도까지 '#RRGGBBAA' 형식 (예: '#FFA500', '#FFA50080')
export const CONFIG = {

  // ── 배경 ──
  background: {
    color: '#000000',          // 배경색
    scanlines: true,           // 가로 줄무늬 효과
    vignette: true             // 가장자리 어둡게
  },

  // ── 배경 프로그램 효과 (네트워크 선, 터미널 창, 16진수, 글리치 - "별자리"처럼 보이는 효과) ──
  program: {
    color: '#FFA500',          // 효과 색 (선, 점, 글자 등 전부) - index.css의 --brand와 동일
    alertColor: '#6b9caa',     // 가끔 나오는 경고 터미널/글리치 강조 색 - index.css의 --sub와 동일
    activity: 58,              // 전체 활동량 (10~100, 클수록 움직임/패킷 많음)
    networkDensity: 150,       // 네트워크 점 개수 (20~160)
    terminalAmount: 62,        // 터미널 창 등장 빈도 (0~100, 0이면 안 나옴)
    glitchAmount: 24,          // 글리치 빈도 (0~100, 0이면 안 나옴)
    bootText: true,            // 시작할 때 왼쪽 아래 부팅 문구 + 배경 효과가 서서히 나타남 (false면 바로 표시)
    mouseReaction: true,       // 마우스 따라 살짝 움직임
    fps: 60                    // 최대 프레임 (낮추면 가벼워짐)
  },

  // ── 배경 효과 (흐르는 흑백 오로라 파도, frontend/background/2 기반) ──
  // 위 program(별자리) 효과 위에 반투명하게 겹쳐짐 - 파도가 옅은 부분은 아래 별자리가 그대로 비쳐 보임
  liquid: {
    colors: ['#a99c86', '#7c6f5b', '#524531'], // 파도 색 그라디언트 (흑백 베이스에 브랜드색(--brand, 주황)을 15%만 살짝 섞음, 전체적으로 어둡게)
    speed: 0.06,                // 흐르는 속도
    scale: 4,                   // 파도 크기 (작을수록 크게 보임)
    stretch: 1.5,                // 가로로 늘리는 비율
    turbulence: 1.2,             // 출렁임 정도
    rimWidth: 0.16,              // 파도 능선 두께
    sharpness: 2.7,              // 능선 경계 선명도
    glow: 0.75,                  // 밝기 (기본 2.9에서 많이 낮춤 - 흰 하이라이트가 너무 밝지 않도록)
    opacity: 0.35,               // 전체 불투명도 (낮출수록 아래 별자리가 더 잘 비쳐 보임)
    flowDirection: 'up' as 'up' | 'down' | 'left' | 'right', // 흐르는 방향
    mouseEnabled: true           // 마우스 따라 반응
  },

  // ── 회전하는 구 ──
  sphere: {
    starColor: '#F9DFC6',      // 구 별 색
    glowColor: '#ffd5adff',    // 구 별 주변 빛 번짐 색
    starCount: 300,            // 구 별 개수
    starSize: [1.5, 4],        // 구 별 크기 범위 (px) [최소, 최대]
    size: 1000,                // 구 영역 크기 (px), 구 반지름은 이 값에 비례
    radius: [0.24, 0.38],      // 구 반지름 = size × 이 비율 [안쪽, 바깥쪽]
    offsetY: 120,              // 화면 중앙보다 위로 올리는 거리 (px, 음수면 아래로)
    rotateSeconds: 15,         // 한 바퀴 도는 시간 (초, 작을수록 빠름)
    introScale: 3,             // 처음 나타날 때 크기 배율 (여기서 1배로 줄어듦)
    introSeconds: 3,           // 줄어드는 데 걸리는 시간 (초)
    fadeSeconds: 1.2           // 나타나는(투명→불투명) 시간 (초)
  },

  // ── 가운데 아이콘 (별들이 모여서 만드는 모양) ──
  icon: {
    bodyColor: '#FFA500',      // 몸통 색
    eyeColor: '#FFFFFF',       // 눈 색
    scale: 1,                  // 아이콘 크기 배율 (원본 SVG 159×168 기준)
    spacing: 2.7,              // 몸통 별 간격 (작을수록 촘촘, 너무 작으면 버벅일 수 있음)
    eyeSpacing: 2,             // 눈 별 간격
    starSize: [1.4, 2.6],      // 별 크기 범위 (px) [최소, 최대]
    glow: 1.8,                 // 빛 번짐 크기 배율
    gatherSeconds: 2.5,        // 별 하나가 모이는 데 걸리는 시간 (초)
    maxDelay: 1.2,             // 별마다 출발 시점을 흩뜨리는 최대 지연 (초)
    startOpacity: 0.35,        // 흩어져 있을 때 별 투명도 (0~1)

    // 아이콘 뒤 은은한 빛 (별이 다 모이면 서서히 나타남)
    backGlow: {
      enabled: true,           // false면 빛 없음
      color: '#ffc04aff',      // 빛 색
      size: 4,                 // 빛 크기 (아이콘 너비의 몇 배)
      opacity: 0.15,           // 빛 세기 (0~1)
      fadeSeconds: 2,          // 나타나는 데 걸리는 시간 (초)
      pulseSeconds: 4,         // 숨 쉬듯 커졌다 작아지는 주기 (초, 0이면 멈춤)
      pulseScale: 1.12         // 숨 쉴 때 최대 크기 배율
    }
  },

  // ── 상단 글자 (색상/크기/위치 등 스타일은 LoginBackground.css에 직접 정의됨) ──
  title: {
    enabled: true,             // false면 글자 없음
    text: '어서 와요, 우무예요!',          // 표시할 글자
    // 제목 아래에 작게 들어가는 설명 글 - 아래 여러 개를 subtitleRotateMs 간격으로 돌아가며 보여줌
    subtitles: [
      '깜빡한 일정은 우무가 알려드릴게요',
      '보관할 파일은 우무한테 맡겨요',
      '받은 메일도 우무가 알려드릴게요',
      '중요한 일정은 카카오톡으로 알려드려요',
      '시간표도 일정도 우무가 기억해요'
    ],
    subtitleRotateMs: 3000
  }
};

// 로그인 화면 배경 애니메이션 (frontend/ex 안의 vanilla JS 목업을 그대로 옮긴 것).
// 별이 모여 로고 모양이 되고, 그 뒤로 구가 나타나며, 그 뒤로는 네트워크/터미널/글리치 효과가 깔림.
// 디자인/동작은 원본 그대로이고, mount될 때 시작해서 unmount될 때 정리되도록 effect로만 감쌈.
export default function LoginBackground() {
  const sceneRef = useRef<HTMLCanvasElement>(null);
  const liquidRef = useRef<HTMLCanvasElement>(null);
  const sphereGpuBackRef = useRef<HTMLCanvasElement>(null);
  const sphereGpuFrontRef = useRef<HTMLCanvasElement>(null);
  // 모바일에서는 구 자체를 비활성화함 (별 수백 개 생성/배치/회전 계산을 아예 건너뜀) - 최초 1회만 판단
  const [isMobile] = useState(() => window.innerWidth <= MOBILE_BREAKPOINT);

  useEffect(() => {
    // 아래(별자리) → 위(반투명 오로라 파도) 순서로 겹쳐서 그림
    const cleanupScene = sceneRef.current ? initLoginScene(sceneRef.current, CONFIG, isMobile) : undefined;
    const cleanupLiquid = liquidRef.current ? initLoginLiquidBackground(liquidRef.current, CONFIG, isMobile) : undefined;
    const cleanupGalaxy = initLoginGalaxy(CONFIG, isMobile);

    // 구를 WebGPU로 그려보는 실험 - 지원 안 하면 null을 돌려받고, 그때는 기존 DOM 구를 그대로 둠
    let cancelledGpu = false;
    let cleanupGpu: (() => void) | undefined;
    if (!isMobile && sphereGpuBackRef.current && sphereGpuFrontRef.current) {
      initLoginSphereGpu(sphereGpuBackRef.current, sphereGpuFrontRef.current, CONFIG).then((cleanup) => {
        if (cancelledGpu) { cleanup?.(); return; }
        if (cleanup) {
          cleanupGpu = cleanup;
          const domSphere = document.querySelector('.loginBg .sphere') as HTMLElement | null;
          if (domSphere) domSphere.style.display = 'none';
        }
      });
    }

    return () => {
      cleanupScene?.();
      cleanupLiquid?.();
      cleanupGalaxy?.();
      cancelledGpu = true;
      cleanupGpu?.();
    };
  }, [isMobile]);

  return (
    <div className="loginBg">
      <canvas id="scene" ref={sceneRef} />
      <canvas id="liquid" ref={liquidRef} />
      {/* WebGPU로 그리는 구(뒤쪽 절반) - 커졌다가 작아지는 인트로 때 .stage 박스보다 훨씬 커지므로
          화면 전체 크기 캔버스로 두고(잘리지 않게), 아이콘 위치에 맞춰 내부에서 좌표만 보정함
          (loginSphereGpuEffect.ts). 모바일은 구 자체를 안 씀 */}
      {!isMobile && <canvas className="sphere-gpu" ref={sphereGpuBackRef} />}

      <div className="stage" id="stage">
        {/* 아이콘이 다 모인 뒤 크게 나타났다가 작아지면서 아이콘을 감싸는 구 - 모바일은 렌더 자체를 안 함.
            WebGPU를 지원하면 gpu 캔버스(위/아래)가 이 DOM 구를 가리고 대신 그려짐 */}
        {!isMobile && (
          <div className="sphere">
            <div className="galaxy" id="galaxy" />
          </div>
        )}
        {/* 화면 전체에 퍼져 있다가 구 중심으로 모이는 별 */}
        <div className="shape" id="shape" />
      </div>

      {/* 구(앞쪽 절반) - 원래 DOM 버전은 구와 아이콘이 같은 3D 공간에 있어서 회전하며 일부 별이
          아이콘 앞을 지나갔음 - 이 캔버스가 그 "앞쪽" 별만 그려서 아이콘 위에 보이게 함 */}
      {!isMobile && <canvas className="sphere-gpu" ref={sphereGpuFrontRef} />}

      <div id="scanlines" />
      <div id="vignette" />

      {/* 상단 글자 (내용은 위 CONFIG.title) */}
      <div className="title" id="title" />
      <div className="subtitle" id="subtitle" />
    </div>
  );
}
