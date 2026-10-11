// 로그인 배경의 "별이 모여 로고가 되고, 구가 나타나는" 효과
// frontend/ex/index.html 안의 <script> 블록을 그대로 옮기되, 함수로 감싸서
// React 컴포넌트의 mount/unmount에 맞춰 시작/정리할 수 있게 함. 로직/수치는 원본과 동일함.
// (관련 id를 가진 .stage/.galaxy/.shape/#scanlines/#vignette/.title 엘리먼트가 이미 DOM에 있어야 함)
import type { CONFIG as LoginGalaxyConfig } from './loginGalaxyConfig';

export function initLoginGalaxy(CONFIG: typeof LoginGalaxyConfig): () => void {
  let cancelled = false;
  let raf = 0;

  const SPHERE = CONFIG.sphere;
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--bg', CONFIG.background.color);
  rootStyle.setProperty('--stage-size', SPHERE.size + 'px');
  rootStyle.setProperty('--offset-y', SPHERE.offsetY + 'px');
  rootStyle.setProperty('--sphere-color', SPHERE.starColor);
  rootStyle.setProperty('--rotate-time', SPHERE.rotateSeconds + 's');
  rootStyle.setProperty('--intro-scale', String(SPHERE.introScale));
  rootStyle.setProperty('--intro-time', SPHERE.introSeconds + 's');
  rootStyle.setProperty('--fade-time', SPHERE.fadeSeconds + 's');

  const scanlinesEl = document.getElementById('scanlines');
  const vignetteEl = document.getElementById('vignette');
  if (!CONFIG.background.scanlines && scanlinesEl) scanlinesEl.style.display = 'none';
  if (!CONFIG.background.vignette && vignetteEl) vignetteEl.style.display = 'none';

  // 상단 글자
  const TITLE = CONFIG.title;
  const titleEl = document.getElementById('title')!;
  if (TITLE && TITLE.enabled) {
    titleEl.textContent = TITLE.text;
    titleEl.style.setProperty('--title-color', TITLE.color);
    titleEl.style.setProperty('--title-size', TITLE.size + 'px');
    titleEl.style.setProperty('--title-weight', String(TITLE.weight));
    titleEl.style.setProperty('--title-spacing', TITLE.letterSpacing + 'px');
    titleEl.style.setProperty('--title-top', TITLE.top + '%');
    titleEl.style.setProperty('--title-glow', TITLE.glowColor);
    titleEl.style.setProperty('--title-fade', TITLE.fadeSeconds + 's');
  } else {
    titleEl.style.display = 'none';
  }

  // 제목 아래 작은 설명 글
  const subtitleEl = document.getElementById('subtitle');
  if (subtitleEl) {
    if (TITLE && TITLE.enabled && TITLE.subtitle) {
      subtitleEl.textContent = TITLE.subtitle;
      subtitleEl.style.setProperty('--title-top', TITLE.top + '%');
      subtitleEl.style.setProperty('--subtitle-color', TITLE.subtitleColor);
      subtitleEl.style.setProperty('--subtitle-size', TITLE.subtitleSize + 'px');
      subtitleEl.style.setProperty('--subtitle-weight', String(TITLE.subtitleWeight));
      subtitleEl.style.setProperty('--subtitle-spacing', TITLE.subtitleLetterSpacing + 'px');
      subtitleEl.style.setProperty('--title-fade', TITLE.fadeSeconds + 's');
    } else {
      subtitleEl.style.display = 'none';
    }
  }

  function rand(min: number, max: number) { return Math.random() * (max - min) + min; }

  // .stage 영역 안에 점들을 구 형태로 배치 (반지름은 구 영역 크기에 비례)
  const galaxy = document.getElementById('galaxy')!;
  const R_MIN = SPHERE.size * SPHERE.radius[0], R_MAX = SPHERE.size * SPHERE.radius[1];

  for (let i = 0; i < SPHERE.starCount; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = rand(SPHERE.starSize[0], SPHERE.starSize[1]);
    star.style.setProperty('--size', size + 'px');
    star.style.setProperty('--shadow', `0 0 ${rand(1, 5)}px ${rand(0, 1.5)}px ${SPHERE.glowColor}`);
    star.style.setProperty('--transform',
      `rotate3d(1, 0, 0, ${rand(0, 360)}deg) ` +
      `rotate3d(0, 1, 0, ${rand(0, 360)}deg) ` +
      `rotate3d(0, 0, 1, ${rand(0, 360)}deg) ` +
      `translate3d(0, 0, ${rand(R_MIN, R_MAX)}px)`);
    galaxy.appendChild(star);
  }

  // ── 아이콘: 화면 전체에 흩어져 있던 별들이 모여서 모양을 만들고 멈춤 ──
  // (우무 마스코트 - 다리 4개가 달린 모양. 몸통/귀는 하나의 path로 돼 있고, 다리 4개만
  //  "길게 뻗은 모양"과 "움츠린 모양" 사이 세로 길이가 다름. 모여서 멈춘 뒤에도 다리를
  //  왼쪽부터 오른쪽으로 파도치듯 늘였다 줄였다 하고, 눈은 가끔 깜빡인다)
  const ICON = CONFIG.icon;
  const SHAPE_W = 147, SHAPE_H = 188;
  const SHAPE_SCALE = ICON.scale;
  const SPACING = ICON.spacing;          // 별 사이 최소 간격 (SVG 단위)
  const EYE_SPACING = ICON.eyeSpacing;

  // 다리가 쭉 뻗은 기본 모양 (SVG 좌표계, 0~147 x 0~188)
  const BODY_PATH = 'M73.6438 0C91.5207 1.73832e-05 107.865 6.56117 120.401 17.4062C127.842 10.1915 137.962 8.53061 143.163 13.7314C148.435 19.0035 146.657 29.3309 139.19 36.7979C138.533 37.4547 137.852 38.0659 137.156 38.6338C142.259 48.4742 145.144 59.6499 145.144 71.5C145.144 77.8028 144.328 83.6983 142.796 89.1562C140.574 97.0758 138.144 105.067 138.144 113.292V168.847C138.144 173.817 134.114 177.847 129.144 177.847C124.173 177.847 120.144 173.817 120.144 168.847V148C120.144 143.306 116.338 139.5 111.644 139.5C106.949 139.5 103.144 143.306 103.144 148V177.847C103.144 183.37 98.6666 187.847 93.1438 187.847C87.6209 187.847 83.1438 183.37 83.1438 177.847V155C83.1438 150.029 79.1143 146 74.1438 146C69.1732 146 65.1438 150.029 65.1438 155V178.347C65.1438 183.593 60.8905 187.847 55.6438 187.847C50.3971 187.847 46.1438 183.593 46.1438 178.347V149C46.1438 143.753 41.8905 139.5 36.6438 139.5C31.3971 139.5 27.1438 143.753 27.1438 149V168.847C27.1438 173.817 23.1143 177.847 18.1438 177.847C13.1732 177.847 9.14378 173.817 9.14378 168.847V113.292C9.14378 105.067 6.71371 97.0757 4.49144 89.1562C2.95993 83.6983 2.14378 77.8028 2.14378 71.5C2.14378 59.5587 5.07207 48.3016 10.2483 38.4062C1.71135 33.0381 -2.27739 23.9355 1.32738 17.6914C5.0553 11.2345 15.4918 10.2806 24.6369 15.5605C25.5147 16.0673 26.3488 16.613 27.136 17.1914C39.6388 6.47447 55.8851 0 73.6438 0Z';
  const EYES = [
    { cx: 54.3145, cy: 92.6966, rx: 7.5, ry: 11.5 },
    { cx: 91.8799, cy: 92.6966, rx: 7.5, ry: 11.5 }
  ];
  // 다리 4개의 x 구간(왼쪽부터) + 몸통에 붙는 목 지점(neckY)과 다 뻗었을 때/움츠렸을 때 끝 y
  // (491/492 두 그림을 비교해서 뽑은 값 - 바깥 다리 둘, 안쪽 다리 둘이 각각 같은 길이)
  const LEGS = [
    { index: 0, xMin: 0, xMax: 40, neckY: 139.5, tipY: 177.847, shortTipY: 158 },
    { index: 1, xMin: 40, xMax: 78, neckY: 142, tipY: 187.847, shortTipY: 168 },
    { index: 2, xMin: 78, xMax: 113, neckY: 142, tipY: 187.847, shortTipY: 168 },
    { index: 3, xMin: 113, xMax: 147, neckY: 139.5, tipY: 177.847, shortTipY: 158 }
  ];
  function legFor(x: number) {
    return LEGS.find(l => x >= l.xMin && x < l.xMax) ?? null;
  }

  function shapePoints() {
    const ctx = document.createElement('canvas').getContext('2d')!;
    const body = new Path2D(BODY_PATH);
    const eyes = EYES.map(e => {
      const p = new Path2D();
      p.ellipse(e.cx, e.cy, e.rx, e.ry, 0, 0, Math.PI * 2);
      return p;
    });
    const inside = (p: Path2D, x: number, y: number) => ctx.isPointInPath(p, x, y);
    const inBody = (x: number, y: number) => inside(body, x, y);
    const inEye = (x: number, y: number) => eyes.some(e => inside(e, x, y));

    // 간격을 유지하며 점을 넣기 위한 격자 (뭉침/빈 곳 방지)
    const pts: { x: number; y: number; eye: boolean; edge: boolean }[] = [];
    const cell = SPACING / Math.SQRT2;
    const grid = new Map<string, { x: number; y: number }>();
    const key = (gx: number, gy: number) => gx + ',' + gy;
    function tryAdd(x: number, y: number, eye: boolean, edge: boolean, minDist: number) {
      const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
      for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
          const q = grid.get(key(gx + i, gy + j));
          if (q && (q.x - x) ** 2 + (q.y - y) ** 2 < minDist * minDist) return false;
        }
      }
      const p = { x, y, eye, edge };
      pts.push(p);
      grid.set(key(gx, gy), p);
      return true;
    }

    // 1) 테두리를 일정 간격으로 먼저 깔아서 윤곽을 또렷하게
    //    (시작 위치만 무작위, 접선 방향으로만 살짝 흔들어서 줄 맞춤 느낌을 줄임)
    function addOutline(
      pointAt: (t: number) => { x: number; y: number },
      length: number,
      eye: boolean,
      skip: (x: number, y: number) => boolean,
      spacing: number
    ) {
      const n = Math.max(8, Math.round(length / spacing));
      const offset = Math.random();
      for (let i = 0; i < n; i++) {
        const t = ((i + offset + rand(-0.2, 0.2)) / n + 1) % 1;
        const p = pointAt(t);
        if (!skip(p.x, p.y)) tryAdd(p.x, p.y, eye, true, spacing * 0.8);
      }
    }

    // 눈 테두리 (흰색)
    for (const e of EYES) {
      const perim = Math.PI * (3 * (e.rx + e.ry) - Math.sqrt((3 * e.rx + e.ry) * (e.rx + 3 * e.ry)));
      addOutline(t => ({
        x: e.cx + Math.cos(t * Math.PI * 2) * (e.rx - 0.6),
        y: e.cy + Math.sin(t * Math.PI * 2) * (e.ry - 0.6)
      }), perim, true, () => false, EYE_SPACING);
    }

    // 몸통(+다리) 테두리
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', BODY_PATH);
    svg.appendChild(path);
    svg.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden';
    document.body.appendChild(svg);
    const len = path.getTotalLength();
    addOutline(t => path.getPointAtLength(t * len), len, false, () => false, SPACING);
    svg.remove();

    // 2) 내부: 무작위 위치에 던지되 최소 간격을 지키는 것만 채택 (눈 먼저 촘촘하게, 그다음 몸통)
    let misses = 0;
    for (const e of EYES) {
      misses = 0;
      while (misses < 1500) {
        const x = rand(e.cx - e.rx, e.cx + e.rx), y = rand(e.cy - e.ry, e.cy + e.ry);
        if (inEye(x, y) && tryAdd(x, y, true, false, EYE_SPACING)) misses = 0;
        else misses++;
      }
    }
    misses = 0;
    while (misses < 4000) {
      const x = rand(-10, SHAPE_W + 10), y = rand(-10, SHAPE_H + 10);
      if (!inEye(x, y) && inBody(x, y) && tryAdd(x, y, false, false, SPACING)) misses = 0;
      else misses++;
    }

    // 눈 밑에 깔리는 몸통색 채움 점. 평소엔 흰 눈 점에 완전히 가려져 안 보이다가,
    // 눈이 감기며 흰 점들이 중심으로 모이면 비어난 자리가 빈 틈이 아니라 몸통색으로
    // 채워진 것처럼 보이게 하려고 눈 영역에도 같은 자리를 몸통색으로 한 번 더 깔아둠
    // (흰 눈 점들과는 별도의 격자를 써야 함 - 같은 격자를 쓰면 이미 꽉 차 있어서 안 들어감)
    const fillerCell = EYE_SPACING / Math.SQRT2;
    const fillerGrid = new Map<string, { x: number; y: number }>();
    function tryAddFiller(x: number, y: number, minDist: number) {
      const gx = Math.floor(x / fillerCell), gy = Math.floor(y / fillerCell);
      for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
          const q = fillerGrid.get(key(gx + i, gy + j));
          if (q && (q.x - x) ** 2 + (q.y - y) ** 2 < minDist * minDist) return false;
        }
      }
      fillerGrid.set(key(gx, gy), { x, y });
      pts.push({ x, y, eye: false, edge: false });
      return true;
    }
    for (const e of EYES) {
      misses = 0;
      while (misses < 1500) {
        const x = rand(e.cx - e.rx, e.cx + e.rx), y = rand(e.cy - e.ry, e.cy + e.ry);
        if (inEye(x, y) && tryAddFiller(x, y, EYE_SPACING)) misses = 0;
        else misses++;
      }
    }
    return pts;
  }

  // 별 수천 개를 DOM 요소로 두면 버벅이므로 캔버스 하나에 그림.
  // 캔버스는 구와 같은 3D 공간(z=0)의 평면 하나라서 구 안에 있는 것처럼 보이는 효과는 그대로 유지됨
  const shapeEl = document.getElementById('shape')!;
  // 아이콘 뒤 은은한 빛 (캔버스보다 먼저 넣어서 별 뒤에 깔림)
  const BACK_GLOW = ICON.backGlow;
  if (BACK_GLOW && BACK_GLOW.enabled) {
    const glowEl = document.createElement('div');
    glowEl.className = 'icon-glow';
    glowEl.style.setProperty('--glow-size', SHAPE_W * SHAPE_SCALE * BACK_GLOW.size + 'px');
    glowEl.style.setProperty('--glow-color', BACK_GLOW.color);
    glowEl.style.setProperty('--glow-opacity', String(BACK_GLOW.opacity));
    glowEl.style.setProperty('--glow-fade', BACK_GLOW.fadeSeconds + 's');
    glowEl.style.setProperty('--glow-pulse', BACK_GLOW.pulseSeconds > 0 ? BACK_GLOW.pulseSeconds + 's' : '0s');
    glowEl.style.setProperty('--glow-pulse-scale', String(BACK_GLOW.pulseScale));
    shapeEl.appendChild(glowEl);
  }

  const canvasEl = document.createElement('canvas');
  shapeEl.appendChild(canvasEl);
  const sctx = canvasEl.getContext('2d')!;
  const MAX_DELAY = ICON.maxDelay, MOVE_TIME = ICON.gatherSeconds;

  // 빛나는 점 스프라이트를 미리 만들어 두고 drawImage로 찍음 (shadowBlur보다 훨씬 가벼움)
  function rgba(hexColor: string, alpha: number) {
    let h = String(hexColor).trim().replace(/^#/, '');
    if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
    if (!/^[a-f\d]{6}([a-f\d]{2})?$/i.test(h)) return `rgba(255,255,255,${alpha})`;
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${alpha * a})`;
  }

  function makeSprite(color: string) {
    const s = 32, c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, rgba(color, 1));
    grad.addColorStop(0.45, rgba(color, 1));
    grad.addColorStop(0.6, rgba(color, 0.4));
    grad.addColorStop(1, rgba(color, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    return c;
  }
  const bodySprite = makeSprite(ICON.bodyColor);
  const eyeSprite = makeSprite(ICON.eyeColor);
  const GLOW = ICON.glow; // 스프라이트는 빛 번짐 포함이라 점 크기보다 크게 찍음

  // 시작 위치: 화면 전체에 무작위 (shape 중심 기준 좌표)
  let center = shapeEl.getBoundingClientRect();
  const [SIZE_MIN, SIZE_MAX] = ICON.starSize;
  const dots = shapePoints().map(p => {
    // 다리 위 점이면(몸통/눈 제외) 목 지점(neckY) 기준으로 얼마나 아래에 있는지,
    // 짧아졌을 때 최소 몇 %까지 줄어들지(ratioMin)를 미리 계산해둠
    const leg = !p.eye ? legFor(p.x) : null;
    const belowNeck = leg && p.y > leg.neckY ? p.y - leg.neckY : 0;
    const ratioMin = leg ? (leg.shortTipY - leg.neckY) / (leg.tipY - leg.neckY) : 1;
    // 눈 점이면 어느 쪽 눈에 속하는지(깜빡일 때 그 눈의 중심 기준으로 오므라들게)
    const nearestEye = EYES.reduce((a, b) => (Math.abs(b.cx - p.x) < Math.abs(a.cx - p.x) ? b : a), EYES[0]);

    return {
      eye: p.eye,
      // 테두리 별은 윤곽이 또렷하도록 살짝 크게
      size: (p.edge ? rand(Math.min(SIZE_MIN + 0.2, SIZE_MAX), SIZE_MAX) : rand(SIZE_MIN, SIZE_MAX)) * GLOW,
      sx: rand(0, innerWidth) - center.left,
      sy: rand(0, innerHeight) - center.top,
      tx: (p.x - SHAPE_W / 2) * SHAPE_SCALE,
      ty: (p.y - SHAPE_H / 2) * SHAPE_SCALE,
      delay: rand(0, MAX_DELAY),
      legIndex: leg ? leg.index : -1,
      legNeckYT: leg ? (leg.neckY - SHAPE_H / 2) * SHAPE_SCALE : 0,
      legBelowScaled: belowNeck * SHAPE_SCALE,
      legRatioMin: ratioMin,
      eyeCenterYT: p.eye ? (nearestEye.cy - SHAPE_H / 2) * SHAPE_SCALE : 0
    };
  });
  // 눈(흰 별)이 몸통(주황 별)보다 앞에 오도록 몸통을 먼저 그림
  dots.sort((a, b) => Number(a.eye) - Number(b.eye));

  // 캔버스가 화면 전체를 덮도록 shape 중심 기준으로 배치
  let dpr = 1;
  function placeCanvas() {
    center = shapeEl.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasEl.width = Math.round(innerWidth * dpr);
    canvasEl.height = Math.round(innerHeight * dpr);
    canvasEl.style.width = innerWidth + 'px';
    canvasEl.style.height = innerHeight + 'px';
    canvasEl.style.left = -center.left + 'px';
    canvasEl.style.top = -center.top + 'px';
  }

  // 다리 길이 펄스(기본은 짧게 움츠린 상태, 다리별로 시차를 두고 잠깐씩 쭉 뻗었다 돌아옴) + 눈 깜빡임 타이밍.
  // 다리마다 주기를 다르게 줘봤는데(이전 버전), 아주 조금만 달라도 시간이 지나면서 위상이
  // 계속 흘러가 버려서 결국 왼쪽->오른쪽 순서가 무작위처럼 흐트러지는 문제가 있었음.
  // "흐름이 절대 안 끊긴다"가 우선이라, 넷 다 같은 주기 + 시차(STAGGER)만 주는 방식으로 되돌림 -
  // 이러면 순서는 영원히 왼쪽->오른쪽으로 고정되지만, 대신 정확히 LEG_PERIOD마다 통째로 반복됨
  // (주기를 충분히 길게 + 펄스 모양을 비대칭으로 둬서 반복이 눈에 덜 띄게 함)
  const LEG_PERIOD = 3;        // 다리 전체 주기(초) - 다 같이 공유
  const LEG_STAGGER = 0.4;     // 다리 순서(왼쪽->오른쪽)마다 주는 시작 시차
  const LEG_PULSE_POWER = 1.5; // 클수록 평소(짧음)에 더 오래 머묾 - 너무 크면 짧은 쪽만 오래 멈춰있는 것처럼 보임
  const BLINK_PERIOD = 4.5;    // 이만큼마다 한 번씩 깜빡임
  const BLINK_DURATION = 0.32; // 깜빡이는 데 걸리는 시간

  // 다리 "하나" 단위로 같은 값을 써야 모양이 그대로 길이만 바뀜 (점마다 다른 x로 계산하면
  // 다리 안에서도 위치별로 위상이 달라져서 모양 자체가 뭉개져 보임)
  // cos 기반이라 중간에 멈추는 구간 없이 항상 계속 움직임 (Math.max(0, sin(...))는 절반은 0에
  // 딱 붙어서 "끊기는 텀"처럼 보였어서 안 씀)
  function legPulse(time: number, legIndex: number) {
    const phase = ((time - legIndex * LEG_STAGGER) / LEG_PERIOD) * Math.PI * 2;
    const raw = 0.5 + 0.5 * Math.cos(phase);
    return Math.pow(raw, LEG_PULSE_POWER); // 0(짧음, 기본) ~ 1(쭉 뻗음)
  }

  // 아이콘이 통째로 살짝 아래로 내려갔다 다시 올라오는 느낌(숨쉬듯 둥실거리는 모션)
  const BOB_AMPLITUDE = 10; // 위아래로 움직이는 폭 (스케일 적용된 화면 px 기준)
  const BOB_PERIOD = 3.4;   // 한 번 내려갔다 올라오는 데 걸리는 시간(초)
  function bobOffset(time: number) {
    return Math.sin((time / BOB_PERIOD) * Math.PI * 2) * BOB_AMPLITUDE;
  }
  function eyeBlinkFactor(time: number) {
    const t0 = BLINK_PERIOD - BLINK_DURATION;
    const cycle = time % BLINK_PERIOD;
    if (cycle < t0) return 1;
    const bt = (cycle - t0) / BLINK_DURATION;
    return 1 - Math.sin(bt * Math.PI) * 0.92; // 깜빡이는 순간만 살짝 오므라듦(가로 폭은 안 바뀜)
  }

  const ease = (t: number) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function draw(time: number) {
    sctx.setTransform(dpr, 0, 0, dpr, dpr * center.left, dpr * center.top);
    sctx.clearRect(-center.left, -center.top, innerWidth, innerHeight);
    for (const d of dots) {
      const t = ease(Math.min(1, Math.max(0, (time - d.delay) / MOVE_TIME)));
      const x = d.sx + (d.tx - d.sx) * t;
      let y = d.sy + (d.ty - d.sy) * t;

      // 다 모인 뒤에는(t=1) 다리는 길이가, 눈은 가끔 깜빡이게 y를 조정.
      // 눈 밑에는 몸통색 채움 점을 따로 깔아놔서(위 shapePoints 참고) 눈이 감겨도 빈 틈 없이
      // 몸통색으로 채워져 보임
      let legAlphaMul = 1;
      if (t >= 1) {
        if (d.legBelowScaled > 0) {
          const raw = legPulse(time, d.legIndex);
          const factor = d.legRatioMin + (1 - d.legRatioMin) * raw;
          y = d.legNeckYT + d.legBelowScaled * factor;
          // 다리가 움츠러들수록(factor가 작을수록) 같은 점들이 더 좁은 범위에 몰려서
          // 밀도가 올라가(진하고 뭉쳐 보임) - 살짝 투명하게 보정해서 길 때와 비슷한 느낌으로 맞춤
          legAlphaMul = 0.55 + 0.45 * factor;
        } else if (d.eye) {
          const factor = eyeBlinkFactor(time);
          y = d.eyeCenterYT + (d.ty - d.eyeCenterYT) * factor;
        }
      }

      // 아이콘 전체가 같이 둥실거리도록 맨 마지막에 전부 동일하게 더함
      y += bobOffset(time) * t;

      sctx.globalAlpha = (ICON.startOpacity + (1 - ICON.startOpacity) * t) * legAlphaMul;
      sctx.drawImage(d.eye ? eyeSprite : bodySprite, x - d.size / 2, y - d.size / 2, d.size, d.size);
    }
    sctx.globalAlpha = 1;
  }

  // 흩어진 상태로 시작 → 한 번 모여서 멈춤(그 시점에 구/제목 등장) → 그 뒤로도 다리 파도/눈 깜빡임은 계속됨
  const TOTAL = MAX_DELAY + MOVE_TIME;
  let start = 0, done = false;
  function frame(now: number) {
    if (cancelled) return;
    if (!start) start = now;
    const time = (now - start) / 1000;
    draw(time);
    if (!done && time >= TOTAL) {
      done = true;
      document.getElementById('stage')?.classList.add('show');
      titleEl.classList.add('show');
      subtitleEl?.classList.add('show');
    }
    raf = requestAnimationFrame(frame);
  }
  function onResize() { placeCanvas(); }

  placeCanvas();
  raf = requestAnimationFrame(frame);
  window.addEventListener('resize', onResize);

  return function cleanup() {
    cancelled = true;
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    rootStyle.removeProperty('--bg');
    rootStyle.removeProperty('--stage-size');
    rootStyle.removeProperty('--offset-y');
    rootStyle.removeProperty('--sphere-color');
    rootStyle.removeProperty('--rotate-time');
    rootStyle.removeProperty('--intro-scale');
    rootStyle.removeProperty('--intro-time');
    rootStyle.removeProperty('--fade-time');
  };
}
