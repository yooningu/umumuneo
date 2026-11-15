/**
 * Aurora Flow 4K - Animated Wave Wallpaper for Wallpaper Engine
 * Procedural GLSL Value-Noise Shader with Smooth Palette Interpolation
 * Controlled directly via Wallpaper Engine Native Properties
 * Synchronized across multiple monitors via Modulo Absolute Clock
 */

(function () {
  'use strict';

  // --- Presets (100% English, harmonious wave color gradients) ---
  const PRESETS = {
    emerald_glow: {
      name: "Emerald Glow (Default)",
      colors: ["#6ee7b7", "#34d399", "#059669"],
      bg: "#000000"
    },
    cyberpunk: {
      name: "Cyberpunk Neon",
      colors: ["#f43f5e", "#a855f7", "#06b6d4"],
      bg: "#030712"
    },
    sunset: {
      name: "Sunset Gold & Fire",
      colors: ["#f59e0b", "#f97316", "#ef4444"],
      bg: "#0c0a09"
    },
    ocean: {
      name: "Deep Ocean Blue",
      colors: ["#38bdf8", "#3b82f6", "#1d4ed8"],
      bg: "#020617"
    },
    obsidian: {
      name: "Obsidian & Silver",
      colors: ["#e4e4e7", "#a1a1aa", "#52525b"],
      bg: "#09090b"
    },
    amethyst: {
      name: "Amethyst Purple",
      colors: ["#e879f9", "#c084fc", "#9333ea"],
      bg: "#090514"
    },
    crimson: {
      name: "Crimson Blood",
      colors: ["#fb7185", "#f43f5e", "#e11d48"],
      bg: "#0f0205"
    }
  };

  const state = {
    colors: ["#6ee7b7", "#34d399", "#059669"],
    backgroundColor: "#000000",
    speed: 0.06,
    scale: 4.0,
    stretch: 1.5,
    turbulence: 1.2,
    fluidity: 0.02,
    rimWidth: 0.16,
    sharpness: 2.7,
    shimmer: 0.8,
    glow: 2.9,
    opacity: 1.0,
    flowDirection: "up",
    mouseEnabled: true,
    mouseStrength: 0.4,
    mouseRadius: 0.05,
    mouseDampening: 0.15
  };

  function hexToRgbNorm(hexStr) {
    if (!hexStr) return [1, 1, 1];
    if (typeof hexStr === 'string' && hexStr.trim().indexOf(' ') !== -1) {
      const parts = hexStr.trim().split(/\s+/).map(Number);
      if (parts.length >= 3 && !parts.some(isNaN)) {
        if (parts[0] > 1.0 || parts[1] > 1.0 || parts[2] > 1.0) {
          return [parts[0] / 255.0, parts[1] / 255.0, parts[2] / 255.0];
        }
        return [parts[0], parts[1], parts[2]];
      }
    }
    const clean = hexStr.replace("#", "").padEnd(6, "0");
    return [
      parseInt(clean.slice(0, 2), 16) / 255.0,
      parseInt(clean.slice(2, 4), 16) / 255.0,
      parseInt(clean.slice(4, 6), 16) / 255.0
    ];
  }

  function rgbToHex(rgb) {
    const r = Math.round(Math.max(0, Math.min(1, rgb[0])) * 255).toString(16).padStart(2, '0');
    const g = Math.round(Math.max(0, Math.min(1, rgb[1])) * 255).toString(16).padStart(2, '0');
    const b = Math.round(Math.max(0, Math.min(1, rgb[2])) * 255).toString(16).padStart(2, '0');
    return '#' + r + g + b;
  }

  function computePalette(colorList) {
    const rawList = (colorList && colorList.length ? colorList : ["#6ee7b7", "#34d399", "#059669"]).slice(0, 8);
    const count = rawList.length;
    const arr = [];
    for (let i = 0; i < 8; i++) {
      arr.push(hexToRgbNorm(rawList[Math.min(i, count - 1)]));
    }
    const avg = [0, 0, 0];
    for (let i = 0; i < count; i++) {
      avg[0] += arr[i][0];
      avg[1] += arr[i][1];
      avg[2] += arr[i][2];
    }
    avg[0] /= count;
    avg[1] /= count;
    avg[2] /= count;
    return { arr, count, avg };
  }

  function getFlowVec(dir) {
    switch (dir) {
      case "up": return [0.0, 1.0];
      case "down": return [0.0, -1.0];
      case "left": return [-1.0, 0.0];
      case "right": return [1.0, 0.0];
      default: return [0.0, 1.0];
    }
  }

  // --- GLSL Shaders ---
  const vertexShaderSrc = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

  const fragmentShaderSrc = `
precision highp float;

uniform vec3  iResolution;
uniform vec2  iMouse;
uniform float iTime;

uniform vec3  uColor0;
uniform vec3  uColor1;
uniform vec3  uColor2;
uniform vec3  uColor3;
uniform vec3  uColor4;
uniform vec3  uColor5;
uniform vec3  uColor6;
uniform vec3  uColor7;
uniform int   uColorCount;

uniform vec3  uMouseColor;
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

vec3 getColor(int i) {
  if (i <= 0) return uColor0;
  if (i == 1) return uColor1;
  if (i == 2) return uColor2;
  if (i == 3) return uColor3;
  if (i == 4) return uColor4;
  if (i == 5) return uColor5;
  if (i == 6) return uColor6;
  return uColor7;
}

vec3 palette(float h) {
  int count = uColorCount;
  if (count <= 1) return uColor0;
  float t = clamp(h, 0.0, 1.0) * float(count - 1);
  int idx = int(floor(t));
  float f = fract(t);
  vec3 c1 = getColor(idx);
  vec3 c2 = getColor(idx + 1);
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

  // --- Initialize WebGL ---
  const canvas = document.getElementById('glcanvas');
  if (!canvas) return;

  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true }) ||
             canvas.getContext('webgl', { alpha: true, antialias: true }) ||
             canvas.getContext('experimental-webgl');

  if (!gl) {
    console.error("WebGL initialization failed.");
    return;
  }

  gl.clearColor(0.0, 0.0, 0.0, 0.0);

  function createShader(glCtx, type, source) {
    const s = glCtx.createShader(type);
    glCtx.shaderSource(s, source);
    glCtx.compileShader(s);
    if (!glCtx.getShaderParameter(s, glCtx.COMPILE_STATUS)) {
      console.error(glCtx.getShaderInfoLog(s));
      glCtx.deleteShader(s);
      return null;
    }
    return s;
  }

  const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link failed:", gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);

  // Single interleaved VBO: position (vec2) + uv (vec2) = 16 bytes stride
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  0, 0,
     3, -1,  2, 0,
    -1,  3,  0, 2
  ]), gl.STATIC_DRAW);

  const posAttr = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(posAttr);
  gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 16, 0);

  const uvAttr = gl.getAttribLocation(program, "uv");
  gl.enableVertexAttribArray(uvAttr);
  gl.vertexAttribPointer(uvAttr, 2, gl.FLOAT, false, 16, 8);

  // Uniform locations cache
  const uLoc = {
    iResolution: gl.getUniformLocation(program, "iResolution"),
    iMouse: gl.getUniformLocation(program, "iMouse"),
    iTime: gl.getUniformLocation(program, "iTime"),
    uColor0: gl.getUniformLocation(program, "uColor0"),
    uColor1: gl.getUniformLocation(program, "uColor1"),
    uColor2: gl.getUniformLocation(program, "uColor2"),
    uColor3: gl.getUniformLocation(program, "uColor3"),
    uColor4: gl.getUniformLocation(program, "uColor4"),
    uColor5: gl.getUniformLocation(program, "uColor5"),
    uColor6: gl.getUniformLocation(program, "uColor6"),
    uColor7: gl.getUniformLocation(program, "uColor7"),
    uColorCount: gl.getUniformLocation(program, "uColorCount"),
    uMouseColor: gl.getUniformLocation(program, "uMouseColor"),
    uFlow: gl.getUniformLocation(program, "uFlow"),
    uSpeed: gl.getUniformLocation(program, "uSpeed"),
    uScale: gl.getUniformLocation(program, "uScale"),
    uStretch: gl.getUniformLocation(program, "uStretch"),
    uTurbulence: gl.getUniformLocation(program, "uTurbulence"),
    uFluidity: gl.getUniformLocation(program, "uFluidity"),
    uRimWidth: gl.getUniformLocation(program, "uRimWidth"),
    uSharpness: gl.getUniformLocation(program, "uSharpness"),
    uShimmer: gl.getUniformLocation(program, "uShimmer"),
    uGlow: gl.getUniformLocation(program, "uGlow"),
    uOpacity: gl.getUniformLocation(program, "uOpacity"),
    uMouseEnabled: gl.getUniformLocation(program, "uMouseEnabled"),
    uMouseStrength: gl.getUniformLocation(program, "uMouseStrength"),
    uMouseRadius: gl.getUniformLocation(program, "uMouseRadius")
  };

  // --- Resilient Resize handling with fallback and ResizeObserver ---
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(10, rect.width || window.innerWidth || 1920);
    const h = Math.max(10, rect.height || window.innerHeight || 1080);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(resize);
    ro.observe(document.body);
  }
  resize();

  // --- Mouse / Pointer interaction ---
  let mouseTarget = [0, 0];
  let mouseSmooth = [0, 0];
  let lastTimeMs = 0;

  window.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const curDpr = dpr || 1;
    mouseTarget[0] = (e.clientX - rect.left) * curDpr;
    mouseTarget[1] = (rect.height - (e.clientY - rect.top)) * curDpr;
    if (state.mouseDampening <= 0) {
      mouseSmooth[0] = mouseTarget[0];
      mouseSmooth[1] = mouseTarget[1];
    }
  });

  // --- Background Color sync ---
  function updateBackground() {
    document.body.style.backgroundColor = state.backgroundColor;
    const container = document.getElementById('canvas-container');
    if (container) container.style.backgroundColor = state.backgroundColor;
  }

  // --- Animation Render Loop ---
  function render(timestamp) {
    requestAnimationFrame(render);

    // Modulo 3600s ensures high-precision float32 while keeping 100% multi-monitor sync
    const timeSec = (Date.now() % 3600000) * 0.001;

    if (state.mouseDampening > 0) {
      if (!lastTimeMs) lastTimeMs = timestamp;
      const deltaSec = (timestamp - lastTimeMs) / 1000.0;
      lastTimeMs = timestamp;
      let factor = 1.0 - Math.exp(-deltaSec / Math.max(0.001, state.mouseDampening));
      if (factor > 1.0) factor = 1.0;
      mouseSmooth[0] += (mouseTarget[0] - mouseSmooth[0]) * factor;
      mouseSmooth[1] += (mouseTarget[1] - mouseSmooth[1]) * factor;
    } else {
      lastTimeMs = timestamp;
      mouseSmooth[0] = mouseTarget[0];
      mouseSmooth[1] = mouseTarget[1];
    }

    const { arr, count, avg } = computePalette(state.colors);
    const flow = getFlowVec(state.flowDirection);

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform3f(uLoc.iResolution, canvas.width, canvas.height, 1.0);
    gl.uniform2f(uLoc.iMouse, mouseSmooth[0], mouseSmooth[1]);
    gl.uniform1f(uLoc.iTime, timeSec);

    gl.uniform3fv(uLoc.uColor0, arr[0]);
    gl.uniform3fv(uLoc.uColor1, arr[1]);
    gl.uniform3fv(uLoc.uColor2, arr[2]);
    gl.uniform3fv(uLoc.uColor3, arr[3]);
    gl.uniform3fv(uLoc.uColor4, arr[4]);
    gl.uniform3fv(uLoc.uColor5, arr[5]);
    gl.uniform3fv(uLoc.uColor6, arr[6]);
    gl.uniform3fv(uLoc.uColor7, arr[7]);
    gl.uniform1i(uLoc.uColorCount, count);

    gl.uniform3fv(uLoc.uMouseColor, avg);
    gl.uniform2fv(uLoc.uFlow, flow);

    gl.uniform1f(uLoc.uSpeed, state.speed);
    gl.uniform1f(uLoc.uScale, state.scale);
    gl.uniform1f(uLoc.uStretch, state.stretch);
    gl.uniform1f(uLoc.uTurbulence, state.turbulence);
    gl.uniform1f(uLoc.uFluidity, state.fluidity);
    gl.uniform1f(uLoc.uRimWidth, state.rimWidth);
    gl.uniform1f(uLoc.uSharpness, state.sharpness);
    gl.uniform1f(uLoc.uShimmer, state.shimmer);
    gl.uniform1f(uLoc.uGlow, state.glow);
    gl.uniform1f(uLoc.uOpacity, state.opacity);

    gl.uniform1f(uLoc.uMouseEnabled, state.mouseEnabled ? 1.0 : 0.0);
    gl.uniform1f(uLoc.uMouseStrength, state.mouseStrength);
    gl.uniform1f(uLoc.uMouseRadius, state.mouseRadius);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  requestAnimationFrame(render);

  // --- Wallpaper Engine Properties Listener (Native Control) ---
  window.wallpaperPropertyListener = {
    applyUserProperties: function (props) {
      if (props.colorPreset && props.colorPreset.value) {
        const p = PRESETS[props.colorPreset.value];
        if (p) {
          state.colors = [...p.colors];
          state.backgroundColor = p.bg;
          updateBackground();
        }
      }

      if (props.waveColor1 && props.waveColor1.value) {
        state.colors[0] = rgbToHex(hexToRgbNorm(props.waveColor1.value));
      }
      if (props.waveColor2 && props.waveColor2.value) {
        state.colors[1] = rgbToHex(hexToRgbNorm(props.waveColor2.value));
      }
      if (props.waveColor3 && props.waveColor3.value) {
        state.colors[2] = rgbToHex(hexToRgbNorm(props.waveColor3.value));
      }
      if (props.backgroundColor && props.backgroundColor.value) {
        state.backgroundColor = rgbToHex(hexToRgbNorm(props.backgroundColor.value));
        updateBackground();
      }

      if (props.speed && props.speed.value !== undefined) state.speed = props.speed.value;
      if (props.scale && props.scale.value !== undefined) state.scale = props.scale.value;
      if (props.stretch && props.stretch.value !== undefined) state.stretch = props.stretch.value;
      if (props.turbulence && props.turbulence.value !== undefined) state.turbulence = props.turbulence.value;
      if (props.fluidity && props.fluidity.value !== undefined) state.fluidity = props.fluidity.value;
      if (props.rimWidth && props.rimWidth.value !== undefined) state.rimWidth = props.rimWidth.value;
      if (props.sharpness && props.sharpness.value !== undefined) state.sharpness = props.sharpness.value;
      if (props.shimmer && props.shimmer.value !== undefined) state.shimmer = props.shimmer.value;
      if (props.glow && props.glow.value !== undefined) state.glow = props.glow.value;
      if (props.flowDirection && props.flowDirection.value !== undefined) state.flowDirection = props.flowDirection.value;
      if (props.mouseInteraction && props.mouseInteraction.value !== undefined) state.mouseEnabled = props.mouseInteraction.value;
    }
  };

  updateBackground();
})();
