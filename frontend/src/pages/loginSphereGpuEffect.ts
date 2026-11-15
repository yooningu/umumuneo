// 로그인 배경의 회전하는 구를 WebGPU로 그리는 버전 (실험용).
// 기존 DOM(.star div 300개 + CSS 3D transform) 방식은 "커졌다가 작아지는" 인트로 애니메이션에서
// 랙이 있었음 - 같은 모양을 GPU 파티클(인스턴싱된 빌보드 쿼드) 하나로 그려서,
// 확대/축소가 유니폼 값 하나만 바뀌는 식이 되게 함(별 개수와 무관하게 거의 공짜).
//
// 캔버스를 두 개(back/front) 받음 - 원래 DOM 버전은 구와 아이콘이 같은 3D 공간(preserve-3d)에
// 있어서 회전하며 일부 별은 아이콘 앞으로, 일부는 뒤로 지나갔음. 캔버스 하나로는 "전부 앞" 또는
// "전부 뒤"밖에 안 되므로, z>0(아이콘보다 앞)인 별만 그리는 캔버스는 아이콘 위에, z<=0(뒤)인
// 별만 그리는 캔버스는 아이콘 아래에 둬서 같은 효과를 흉내냄.
//
// WebGPU를 지원하지 않는 브라우저에서는 null을 반환함 - 호출하는 쪽(LoginBackground.tsx)이
// 이 경우 기존 DOM 기반 구(.sphere/.galaxy)를 그대로 보여주는 폴백으로 씀.
// (타입 패키지(@webgpu/types)를 새로 추가하지 않기 위해 WebGPU API는 any로 다룸)
import type { CONFIG as LoginGalaxyConfig } from './LoginBackground';

function hexToRgbNorm(hex: string): [number, number, number] {
  const h = hex.replace('#', '').slice(0, 6).padEnd(6, '0');
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255
  ];
}

// axis-angle 회전 행렬을 WGSL의 mat4x4<f32>(열 우선)에 맞는 16개 float로 만듦
function axisAngleMat4(axis: [number, number, number], angle: number): Float32Array {
  const [ax, ay, az] = axis;
  const len = Math.hypot(ax, ay, az) || 1;
  const x = ax / len, y = ay / len, z = az / len;
  const c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;

  // 행 우선으로 구한 3x3 회전 행렬
  const r00 = t * x * x + c, r01 = t * x * y - s * z, r02 = t * x * z + s * y;
  const r10 = t * x * y + s * z, r11 = t * y * y + c, r12 = t * y * z - s * x;
  const r20 = t * x * z - s * y, r21 = t * y * z + s * x, r22 = t * z * z + c;

  // 열 우선으로 배치 (col0, col1, col2, col3)
  return new Float32Array([
    r00, r10, r20, 0,
    r01, r11, r21, 0,
    r02, r12, r22, 0,
    0, 0, 0, 1
  ]);
}

const SHADER_SRC = (starColor: [number, number, number], glowColor: [number, number, number]) => `
struct Uniforms {
  rotation: mat4x4<f32>,
  params: vec4<f32>,      // x: perspective, y: scale, z: alpha, w: 0=뒤쪽 패스, 1=앞쪽 패스
  resolution: vec4<f32>,  // x,y: 캔버스 크기(기기 px), z,w: 구의 중심이 캔버스 안에서 있어야 할 위치(기기 px)
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VSOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) vz: f32, // 아이콘(z=0) 기준 앞/뒤 판정용 - 회전 후의 z값
};

const QUAD = array<vec2<f32>, 6>(
  vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(-1.0, 1.0),
  vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0)
);

@vertex
fn vs(@builtin(vertex_index) vIdx: u32, @location(0) inst: vec4<f32>) -> VSOut {
  let local = QUAD[vIdx % 6u];
  let rotated = (u.rotation * vec4<f32>(inst.xyz, 1.0)).xyz;

  let perspective = u.params.x;
  let depthScale = perspective / max(perspective - rotated.z, 1.0);
  let projected = rotated.xy * depthScale * u.params.y;
  let size = max(inst.w * depthScale * u.params.y, 0.6);

  // 구의 중심 기준 상대 좌표에, 캔버스 안에서 구가 실제로 있어야 할 절대 위치(center)를 더함
  // - 캔버스는 화면 전체 크기라 구가 커졌을 때 잘리지 않고, center 덕분에 아이콘 자리에 그대로 보임
  let canvasPos = projected + local * size + u.resolution.zw;
  let ndc = vec2<f32>((canvasPos.x / u.resolution.x) * 2.0 - 1.0, 1.0 - (canvasPos.y / u.resolution.y) * 2.0);

  var out: VSOut;
  out.pos = vec4<f32>(ndc, 0.0, 1.0);
  out.uv = local;
  out.vz = rotated.z;
  return out;
}

@fragment
fn fs(@location(0) uv: vec2<f32>, @location(1) vz: f32) -> @location(0) vec4<f32> {
  // 이 패스가 그릴 절반이 아니면 버림 (뒤쪽 패스엔 앞쪽 별을, 앞쪽 패스엔 뒤쪽 별을 안 그림)
  if (u.params.w < 0.5) {
    if (vz > 0.0) { discard; }
  } else {
    if (vz <= 0.0) { discard; }
  }

  let d = length(uv);
  let core = 1.0 - smoothstep(0.0, 0.5, d);
  let glow = 1.0 - smoothstep(0.0, 1.0, d);
  let a = clamp(core * 0.9 + glow * 0.35, 0.0, 1.0) * u.params.z;
  let col = mix(vec3<f32>(${glowColor[0]}, ${glowColor[1]}, ${glowColor[2]}),
                vec3<f32>(${starColor[0]}, ${starColor[1]}, ${starColor[2]}), core);
  return vec4<f32>(col * a, a);
}
`;

export async function initLoginSphereGpu(
  canvasBack: HTMLCanvasElement,
  canvasFront: HTMLCanvasElement,
  CONFIG: typeof LoginGalaxyConfig
): Promise<(() => void) | null> {
  const gpu = (navigator as any).gpu;
  if (!gpu) return null;

  let adapter: any, device: any;
  try {
    adapter = await gpu.requestAdapter();
    if (!adapter) return null;
    device = await adapter.requestDevice();
  } catch {
    return null;
  }

  const ctxBack = canvasBack.getContext('webgpu') as any;
  const ctxFront = canvasFront.getContext('webgpu') as any;
  if (!ctxBack || !ctxFront) return null;

  const format = gpu.getPreferredCanvasFormat();
  ctxBack.configure({ device, format, alphaMode: 'premultiplied' });
  ctxFront.configure({ device, format, alphaMode: 'premultiplied' });

  const SPHERE = CONFIG.sphere;
  const ICON = CONFIG.icon;
  const module = device.createShaderModule({
    code: SHADER_SRC(hexToRgbNorm(SPHERE.starColor), hexToRgbNorm(SPHERE.glowColor))
  });

  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module,
      entryPoint: 'vs',
      buffers: [{
        arrayStride: 16,
        stepMode: 'instance',
        attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x4' }]
      }]
    },
    fragment: {
      module,
      entryPoint: 'fs',
      targets: [{
        format,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' }
        }
      }]
    },
    primitive: { topology: 'triangle-list' }
  });

  const uniformBuffer = device.createBuffer({
    size: 96, // mat4x4(64) + params vec4(16) + resolution vec4(16)
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
  });

  function rand(min: number, max: number) { return Math.random() * (max - min) + min; }

  // 별들의 원래(화면 px, dpr 적용 전) 위치/크기 - 기존 DOM 버전과 같은 방식으로 구 표면 근처에 무작위 배치
  const R_MIN = SPHERE.size * SPHERE.radius[0], R_MAX = SPHERE.size * SPHERE.radius[1];
  const baseStars = new Float32Array(SPHERE.starCount * 4);
  for (let i = 0; i < SPHERE.starCount; i++) {
    // 구 껍질 위 무작위 방향 (정규분포 근사로 고르게 분포)
    let vx = 0, vy = 0, vz = 0, len = 0;
    do {
      vx = rand(-1, 1); vy = rand(-1, 1); vz = rand(-1, 1);
      len = Math.hypot(vx, vy, vz);
    } while (len < 0.0001);
    const r = rand(R_MIN, R_MAX) / len;
    // 글로우까지 포함한 스프라이트 크기 - 새 숫자를 지어내지 않고, 아이콘 점에도 이미 쓰는
    // 같은 용도의 기존 값(CONFIG.icon.glow)을 그대로 재사용함
    const size = rand(SPHERE.starSize[0], SPHERE.starSize[1]) * ICON.glow;
    baseStars[i * 4 + 0] = vx * r;
    baseStars[i * 4 + 1] = vy * r;
    baseStars[i * 4 + 2] = vz * r;
    baseStars[i * 4 + 3] = size;
  }

  const vertexBuffer = device.createBuffer({
    size: baseStars.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });

  let dpr = 1;
  // 구가 화면에서 실제로 보여야 할 중심 위치(아이콘 중심, 기기 px) - 캔버스는 화면 전체 크기라
  // 이 값을 따로 들고 있다가 매 프레임 보정해줘야 아이콘 자리에 그대로 보임
  let centerX = 0, centerY = 0;
  let scaledStars = new Float32Array(baseStars.length);
  function uploadScaledStars() {
    for (let i = 0; i < SPHERE.starCount; i++) {
      scaledStars[i * 4 + 0] = baseStars[i * 4 + 0] * dpr;
      scaledStars[i * 4 + 1] = baseStars[i * 4 + 1] * dpr;
      scaledStars[i * 4 + 2] = baseStars[i * 4 + 2] * dpr;
      scaledStars[i * 4 + 3] = baseStars[i * 4 + 3] * dpr;
    }
    device.queue.writeBuffer(vertexBuffer, 0, scaledStars.buffer, scaledStars.byteOffset, scaledStars.byteLength);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvasBack.getBoundingClientRect();
    for (const c of [canvasBack, canvasFront]) {
      c.width = Math.max(2, Math.round(rect.width * dpr));
      c.height = Math.max(2, Math.round(rect.height * dpr));
    }
    uploadScaledStars();

    // 구의 중심은 아이콘(.shape)의 실제 중심에 맞춰야 함 - 구가 아이콘을 감싸려면 아이콘 기준이어야 함
    const shapeEl = document.getElementById('shape');
    const shapeRect = shapeEl ? shapeEl.getBoundingClientRect() : rect;
    centerX = (shapeRect.left - rect.left) * dpr;
    centerY = (shapeRect.top - rect.top) * dpr;
  }
  window.addEventListener('resize', resize);
  resize();

  const ease = (t: number) => 1 - Math.pow(1 - t, 3); // cubic-bezier(.16,1,.3,1) 근사
  const triggerTime = ICON.maxDelay + ICON.gatherSeconds; // 아이콘이 다 모이는 시점과 동일

  const uniformScratch = new Float32Array(24);
  let raf = 0;
  let stopped = false;
  let start = 0;

  function renderPass(ctx: any, passFlag: number) {
    uniformScratch[19] = passFlag;
    device.queue.writeBuffer(uniformBuffer, 0, uniformScratch.buffer);

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: ctx.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear',
        storeOp: 'store'
      }]
    });
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setBindGroup(0, bindGroup);
    pass.draw(6, SPHERE.starCount);
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  function draw(timeMs: number) {
    if (!start) start = timeMs;
    const time = (timeMs - start) / 1000;
    const since = time - triggerTime;

    const introT = Math.min(1, Math.max(0, since / Math.max(0.001, SPHERE.introSeconds)));
    const fadeT = Math.min(1, Math.max(0, since / Math.max(0.001, SPHERE.fadeSeconds)));
    const scale = since < 0 ? SPHERE.introScale : SPHERE.introScale + (1 - SPHERE.introScale) * ease(introT);
    const alpha = since < 0 ? 0 : ease(fadeT);

    const angle = (time / Math.max(1, SPHERE.rotateSeconds)) * Math.PI * 2;
    const rotation = axisAngleMat4([1, 1, 1], angle);
    uniformScratch.set(rotation, 0);
    uniformScratch[16] = SPHERE.size * 2 * dpr; // perspective
    uniformScratch[17] = scale;
    uniformScratch[18] = alpha;
    // uniformScratch[19] (passFlag)는 renderPass에서 각각 채움
    uniformScratch[20] = canvasBack.width;
    uniformScratch[21] = canvasBack.height;
    uniformScratch[22] = centerX;
    uniformScratch[23] = centerY;

    renderPass(ctxBack, 0);  // 아이콘보다 뒤(z<=0)인 별만
    renderPass(ctxFront, 1); // 아이콘보다 앞(z>0)인 별만
  }

  function loop(ts: number) {
    if (stopped) return;
    raf = requestAnimationFrame(loop);
    draw(ts);
  }
  raf = requestAnimationFrame(loop);

  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    try { device.destroy(); } catch { /* 이미 정리된 경우 무시 */ }
  };
}
