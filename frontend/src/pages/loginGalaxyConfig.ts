// 로그인 배경 애니메이션 설정값 (frontend/ex/config.js를 그대로 옮긴 것 - 값 변경 없음)
// 색상은 '#RRGGBB' 또는 투명도까지 '#RRGGBBAA' 형식 (예: '#FFA500', '#FFA50080')
export const CONFIG = {

  // ── 배경 ──
  background: {
    color: '#000000ff',          // 배경색
    scanlines: true,           // 가로 줄무늬 효과
    vignette: true             // 가장자리 어둡게
  },

  // ── 배경 프로그램 효과 (네트워크 선, 터미널 창, 16진수, 글리치) ──
  program: {
    color: '#FFA500',          // 효과 색 (선, 점, 글자 등 전부)
    alertColor: '#ff5100ff',     // 가끔 나오는 경고 터미널/글리치 강조 색
    activity: 58,              // 전체 활동량 (10~100, 클수록 움직임/패킷 많음)
    networkDensity: 150,       // 네트워크 점 개수 (20~160)
    terminalAmount: 62,        // 터미널 창 등장 빈도 (0~100, 0이면 안 나옴)
    glitchAmount: 24,          // 글리치 빈도 (0~100, 0이면 안 나옴)
    bootText: true,            // 시작할 때 왼쪽 아래 부팅 문구 + 배경 효과가 서서히 나타남 (false면 바로 표시)
    mouseReaction: true,       // 마우스 따라 살짝 움직임
    fps: 60                    // 최대 프레임 (낮추면 가벼워짐)
  },

  // ── 회전하는 구 ──
  sphere: {
    starColor: '#F9DFC6',      // 구 별 색
    glowColor: '#ffd5adff',      // 구 별 주변 빛 번짐 색
    starCount: 300,            // 구 별 개수
    starSize: [1.5, 4],        // 구 별 크기 범위 (px) [최소, 최대]
    size: 1500,                 // 구 영역 크기 (px), 구 반지름은 이 값에 비례
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
    scale: 1,               // 아이콘 크기 배율 (원본 SVG 159×168 기준)
    spacing: 2.7,              // 몸통 별 간격 (작을수록 촘촘, 너무 작으면 버벅일 수 있음)
    eyeSpacing: 1.9,           // 눈 별 간격
    starSize: [1.4, 2.6],      // 별 크기 범위 (px) [최소, 최대]
    glow: 1.8,                 // 빛 번짐 크기 배율
    gatherSeconds: 3.5,        // 별 하나가 모이는 데 걸리는 시간 (초)
    maxDelay: 1.2,             // 별마다 출발 시점을 흩뜨리는 최대 지연 (초)
    startOpacity: 0.35,        // 흩어져 있을 때 별 투명도 (0~1)

    // 아이콘 뒤 은은한 빛 (별이 다 모이면 서서히 나타남)
    backGlow: {
      enabled: true,           // false면 빛 없음
      color: '#FFA500',        // 빛 색
      size: 2.6,               // 빛 크기 (아이콘 너비의 몇 배)
      opacity: 0.2,           // 빛 세기 (0~1)
      fadeSeconds: 2.5,        // 나타나는 데 걸리는 시간 (초)
      pulseSeconds: 4,         // 숨 쉬듯 커졌다 작아지는 주기 (초, 0이면 멈춤)
      pulseScale: 1.12         // 숨 쉴 때 최대 크기 배율
    }
  },

  // ── 상단 글자 ──
  title: {
    enabled: true,             // false면 글자 없음
    text: '우무에 오신 것을 환영해요',          // 표시할 글자
    color: '#FFFFFF',          // 글자 색
    size: 36,                  // 글자 크기 (px)
    weight: 300,               // 글자 굵기 (100 얇게 ~ 900 굵게)
    letterSpacing: 6,          // 글자 사이 간격 (px)
    top: 20,                   // 화면 위에서부터 위치 (화면 높이의 %, 작을수록 위로)
    glowColor: '#FFA50080',    // 글자 주변 빛 색 (투명하게 하려면 '#00000000')
    fadeSeconds: 2,            // 나타나는 데 걸리는 시간 (초, 구가 나타날 때 같이 등장)

    // 제목 아래에 작게 들어가는 설명 글
    subtitle: '일정 관리, 챗봇, 파일 보관까지 - 우무 하나로',
    subtitleColor: '#CBD5E1',
    subtitleSize: 14,
    subtitleWeight: 400,
    subtitleLetterSpacing: 1
  }
};
