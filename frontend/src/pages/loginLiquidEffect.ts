// 로그인 배경의 "scene" 캔버스 효과 (조용히 흐르는 흑백 오로라 파도)
// frontend/background/2 (Wallpaper Engine용 "Aurora Flow" WebGL 배경, Obsidian & Silver 흑백 프리셋)를
// 그대로 가져와 React 컴포넌트에서 mount/unmount에 맞춰 시작/정리할 수 있도록 함수로 감쌈.
import type { CONFIG as LoginGalaxyConfig } from './LoginBackground';

function hexToRgbNorm(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').padEnd(6, '0');
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255
  ];
}

function getFlowVec(dir: string): [number, number] {
  switch (dir) {
    case 'up': return [0.0, 1.0];
    case 'down': return [0.0, -1.0];
    case 'left': return [-1.0, 0.0];
    case 'right': return [1.0, 0.0];
    default: return [0.0, 1.0];
  }
}

const VERT = `
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAG = `
precision highp float;

uniform vec3  iResolution;
uniform vec2  iMouse;
uniform float iTime;

uniform vec3  uColor0;
uniform vec3  uColor1;
uniform vec3  uColor2;

uniform vec2  uFlow;
uniform float uSpeed;
uniform float uScale;
uniform float uStretch;
uniform float uTurbulence;
uniform float uFluidity;
uniform float uRimWidth;
uniform float uSharpness;
uniform float uShimmer;
uniform float uGlow;
uniform float uOpacity;
uniform float uMouseEnabled;
uniform float uMouseStrength;
uniform float uMouseRadius;

varying vec2 vUv;

#define PI 3.14159265

vec3 palette(float h) {
  float t = clamp(h, 0.0, 1.0) * 2.0;
  int idx = int(floor(t));
  float f = fract(t);
  vec3 c1 = idx <= 0 ? uColor0 : uColor1;
  vec3 c2 = idx <= 0 ? uColor1 : uColor2;
  return mix(c1, c2, f);
}

float hash(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float smin(float a, float b, float k) {
  float r = exp2(-a / k) + exp2(-b / k);
  return -k * log2(r);
}

float sinlerp(float a, float b, float w) {
  return mix(a, b, (sin(w * PI - PI / 2.0) + 1.0) / 2.0);
}

float vn(vec2 p, float s, float seed) {
  vec2 cellp = floor(p / s);
  vec2 relp = mod(p, s);
  float g1 = hash(vec3(cellp, seed));
  float g2 = hash(vec3(cellp.x + 1.0, cellp.y, seed));
  float g3 = hash(vec3(cellp.x + 1.0, cellp.y + 1.0, seed));
  float g4 = hash(vec3(cellp.x, cellp.y + 1.0, seed));
  float bx = sinlerp(g1, g2, relp.x / s);
  float tx = sinlerp(g4, g3, relp.x / s);
  return sinlerp(bx, tx, relp.y / s);
}

float dbn(vec2 p, float s, float seed) {
  float o = s / 2.0;
  float n0 = vn(p, s, seed);
  float n1 = vn(p + vec2(o, o), s, seed + 0.1);
  float n2 = vn(p + vec2(-o, o), s, seed + 0.2);
  float n3 = vn(p + vec2(o, -o), s, seed + 0.3);
  float n4 = vn(p + vec2(-o, -o), s, seed + 0.4);
  return (2.0 * n0 + 1.5 * n1 + 1.25 * n2 + 1.125 * n3 + n4) / 7.0;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  float safeResY = max(iResolution.y, 1.0);
  float ref = 700.0 / max(uScale, 0.05);
  vec2 p = fragCoord / safeResY * ref;
  p.x /= max(uStretch, 0.1);

  float spd = 200.0 * uSpeed;
  float t = iTime;

  vec2 dir = uFlow;
  vec2 perp = vec2(-dir.y, dir.x);

  float distort1 = vn(p + perp * (t * spd), 60.0, 10.0) * 50.0 * uTurbulence;
  float distort2 = vn(p - perp * (t * spd), 120.0, 15.0) * 100.0 * uTurbulence;

  float peaks = dbn(p + distort1 + dir * (t * spd * 0.5), 40.0, 1.0);
  float peaks2 = dbn(p + distort2 - dir * (t * spd * 0.5), 40.0, 0.0);

  float mapeaks = smin(peaks, peaks2, max(uFluidity, 0.001));

  float mGlow = 0.0;
  if (uMouseEnabled > 0.5) {
    vec2 mp = iMouse / safeResY * ref;
    float md = length(p - mp) / ref;
    float rr = max(uMouseRadius, 0.02);
    mGlow = exp(-md * md / (rr * rr)) * uMouseStrength;
  }

  float band = (uRimWidth - abs((mapeaks - 0.4) * 2.0)) * 5.0;
  float ltn = clamp(band - vn(p + dir * (t * spd * 0.5), 60.0, 12.0) * uShimmer, 0.0, 1.0);
  ltn = pow(ltn, uSharpness) * uGlow;
  ltn *= clamp(1.0 - mGlow, 0.0, 1.0);

  float h = clamp(0.5 + (peaks - peaks2) * 0.8, 0.0, 1.0);
  vec3 col = palette(h);

  vec3 outc = col * ltn;
  float a = clamp(max(outc.r, max(outc.g, outc.b)), 0.0, 1.0);
  fragColor = vec4(outc, a * uOpacity);
}

void main() {
  vec4 color;
  mainImage(color, vUv * iResolution.xy);
  gl_FragColor = color;
}
`;

export function initLoginLiquidBackground(canvas: HTMLCanvasElement, CONFIG: typeof LoginGalaxyConfig, isMobile: boolean): () => void {
  // 셰이더 비용은 픽셀 수에 비례하므로, 모바일은 렌더 해상도 상한을 낮춰서 부담을 줄임
  const dprCap = isMobile ? 1 : 2;
  const gl = (canvas.getContext('webgl2', { alpha: true, antialias: true }) ||
    canvas.getContext('webgl', { alpha: true, antialias: true }) ||
    canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;

  // WebGL을 못 쓰면 그냥 검은 배경으로 둠 (배경색은 CONFIG.background.color가 이미 깔아줌)
  if (!gl) return () => {};

  function createShader(type: number, src: string): WebGLShader | null {
    const s = gl!.createShader(type)!;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
      console.error(gl!.getShaderInfoLog(s));
      gl!.deleteShader(s);
      return null;
    }
    return s;
  }

  const vs = createShader(gl.VERTEX_SHADER, VERT);
  const fs = createShader(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return () => {};

  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return () => {};
  }
  gl.useProgram(program);
  gl.clearColor(0, 0, 0, 0);

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 0, 0,
    3, -1, 2, 0,
    -1, 3, 0, 2
  ]), gl.STATIC_DRAW);

  const posAttr = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(posAttr);
  gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 16, 0);

  const uvAttr = gl.getAttribLocation(program, 'uv');
  gl.enableVertexAttribArray(uvAttr);
  gl.vertexAttribPointer(uvAttr, 2, gl.FLOAT, false, 16, 8);

  const uLoc = {
    iResolution: gl.getUniformLocation(program, 'iResolution'),
    iMouse: gl.getUniformLocation(program, 'iMouse'),
    iTime: gl.getUniformLocation(program, 'iTime'),
    uColor0: gl.getUniformLocation(program, 'uColor0'),
    uColor1: gl.getUniformLocation(program, 'uColor1'),
    uColor2: gl.getUniformLocation(program, 'uColor2'),
    uFlow: gl.getUniformLocation(program, 'uFlow'),
    uSpeed: gl.getUniformLocation(program, 'uSpeed'),
    uScale: gl.getUniformLocation(program, 'uScale'),
    uStretch: gl.getUniformLocation(program, 'uStretch'),
    uTurbulence: gl.getUniformLocation(program, 'uTurbulence'),
    uFluidity: gl.getUniformLocation(program, 'uFluidity'),
    uRimWidth: gl.getUniformLocation(program, 'uRimWidth'),
    uSharpness: gl.getUniformLocation(program, 'uSharpness'),
    uShimmer: gl.getUniformLocation(program, 'uShimmer'),
    uGlow: gl.getUniformLocation(program, 'uGlow'),
    uOpacity: gl.getUniformLocation(program, 'uOpacity'),
    uMouseEnabled: gl.getUniformLocation(program, 'uMouseEnabled'),
    uMouseStrength: gl.getUniformLocation(program, 'uMouseStrength'),
    uMouseRadius: gl.getUniformLocation(program, 'uMouseRadius')
  };

  const L = CONFIG.liquid;
  const colors = L.colors.map(hexToRgbNorm);
  const flow = getFlowVec(L.flowDirection);

  let dpr = Math.min(window.devicePixelRatio || 1, dprCap);
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(10, rect.width || window.innerWidth || 1920);
    const h = Math.max(10, rect.height || window.innerHeight || 1080);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl!.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  let ro: ResizeObserver | undefined;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(resize);
    ro.observe(document.body);
  }
  resize();

  const mouseTarget = [0, 0];
  const mouseSmooth = [0, 0];
  const mouseDampening = 0.15;
  let lastTimeMs = 0;

  const onPointerMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const curDpr = dpr || 1;
    mouseTarget[0] = (e.clientX - rect.left) * curDpr;
    mouseTarget[1] = (rect.height - (e.clientY - rect.top)) * curDpr;
  };
  window.addEventListener('pointermove', onPointerMove);

  let raf = 0;
  let stopped = false;

  function render(timestamp: number) {
    if (stopped) return;
    raf = requestAnimationFrame(render);

    const timeSec = (Date.now() % 3600000) * 0.001;

    if (!lastTimeMs) lastTimeMs = timestamp;
    const deltaSec = (timestamp - lastTimeMs) / 1000.0;
    lastTimeMs = timestamp;
    const factor = Math.min(1.0, 1.0 - Math.exp(-deltaSec / mouseDampening));
    mouseSmooth[0] += (mouseTarget[0] - mouseSmooth[0]) * factor;
    mouseSmooth[1] += (mouseTarget[1] - mouseSmooth[1]) * factor;

    gl!.clear(gl!.COLOR_BUFFER_BIT);

    gl!.uniform3f(uLoc.iResolution, canvas.width, canvas.height, 1.0);
    gl!.uniform2f(uLoc.iMouse, mouseSmooth[0], mouseSmooth[1]);
    gl!.uniform1f(uLoc.iTime, timeSec);

    gl!.uniform3fv(uLoc.uColor0, colors[0]);
    gl!.uniform3fv(uLoc.uColor1, colors[1]);
    gl!.uniform3fv(uLoc.uColor2, colors[2]);
    gl!.uniform2fv(uLoc.uFlow, flow);

    gl!.uniform1f(uLoc.uSpeed, L.speed);
    gl!.uniform1f(uLoc.uScale, L.scale);
    gl!.uniform1f(uLoc.uStretch, L.stretch);
    gl!.uniform1f(uLoc.uTurbulence, L.turbulence);
    gl!.uniform1f(uLoc.uFluidity, 0.02);
    gl!.uniform1f(uLoc.uRimWidth, L.rimWidth);
    gl!.uniform1f(uLoc.uSharpness, L.sharpness);
    gl!.uniform1f(uLoc.uShimmer, 0.8);
    gl!.uniform1f(uLoc.uGlow, L.glow);
    gl!.uniform1f(uLoc.uOpacity, L.opacity);

    gl!.uniform1f(uLoc.uMouseEnabled, L.mouseEnabled ? 1.0 : 0.0);
    gl!.uniform1f(uLoc.uMouseStrength, 0.4);
    gl!.uniform1f(uLoc.uMouseRadius, 0.05);

    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  raf = requestAnimationFrame(render);

  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onPointerMove);
    ro?.disconnect();
  };
}
