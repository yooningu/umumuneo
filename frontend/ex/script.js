(function () {
  'use strict';

  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d', { alpha: false });

  let w = 1, h = 1, dpr = 1;
  let raf = 0, last = 0, elapsed = 0, frameCarry = 0;
  let mouseX = 0, mouseY = 0, mouseNX = 0, mouseNY = 0;
  let nodes = [], packets = [], terminals = [], glitches = [], sparks = [];
  let nextTerminalAt = 0, nextGlitchAt = 0, nextPacketAt = 0;

  // 값은 config.js의 CONFIG.program / CONFIG.background에서 가져옴
  const P = CONFIG.program;
  const opts = {
    background: CONFIG.background.color,
    primary: P.color,
    accent: P.alertColor,
    activity: P.activity,
    networkDensity: P.networkDensity,
    terminalAmount: P.terminalAmount,
    glitchAmount: P.glitchAmount,
    mouseReaction: P.mouseReaction,
    fps: P.fps,
    bootSequence: P.bootText
  };

  const docIPs = [
    '192.0.2.17','192.0.2.44','192.0.2.91','198.51.100.12',
    '198.51.100.42','203.0.113.8','203.0.113.27','203.0.113.91'
  ];

  const terminalPool = [
    'uplink :: handshake accepted',
    'node heartbeat nominal',
    'entropy pool reseeded',
    'cipher channel established',
    'route mirror synchronized',
    'relay latency 12.4ms',
    'packet signature verified',
    'ghost process sleeping',
    'shadow index rebuilt',
    'tunnel state :: encrypted',
    'watchdog :: silent',
    'kernel trace masked',
    'access token rotated',
    'sector map verified',
    'cache line sanitized',
    'mesh topology updated',
    'signal noise within limits',
    'breach monitor armed'
  ];

  const hexPool = '0123456789ABCDEF';

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function hex(len) {
    let s = '';
    for (let i = 0; i < len; i++) s += hexPool[(Math.random() * 16) | 0];
    return s;
  }

  // '#RGB', '#RGBA', '#RRGGBB', '#RRGGBBAA' 모두 지원 (색 자체의 투명도는 alpha에 곱함)
  function rgba(hexColor, alpha) {
    let h = String(hexColor).trim().replace(/^#/, '');
    if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
    if (!/^[a-f\d]{6}([a-f\d]{2})?$/i.test(h)) return `rgba(255,255,255,${alpha})`;
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${alpha * a})`;
  }

  function bootFactor() {
    if (!opts.bootSequence) return 1;
    return clamp((elapsed - 0.8) / 8.5, 0, 1);
  }

  function resize() {
    dpr = clamp(window.devicePixelRatio || 1, 1, 1.6);
    w = Math.max(1, window.innerWidth);
    h = Math.max(1, window.innerHeight);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mouseX = w * .5; mouseY = h * .5;
    buildNetwork();
  }

  function buildNetwork() {
    nodes = [];
    const count = Math.round(opts.networkDensity * clamp((w * h) / (1920 * 1080), .55, 1.45));
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: rand(w * .06, w * .94),
        y: rand(h * .10, h * .90),
        z: rand(.2, 1),
        phase: rand(0, Math.PI * 2),
        pulse: rand(.2, 1),
        size: rand(.6, 1.8),
        driftX: rand(-.8, .8),
        driftY: rand(-.5, .5)
      });
    }
  }

  function spawnPacket() {
    if (nodes.length < 2) return;
    const a = nodes[(Math.random() * nodes.length) | 0];
    let b = nodes[(Math.random() * nodes.length) | 0];
    for (let i = 0; i < 8 && b === a; i++) b = nodes[(Math.random() * nodes.length) | 0];
    packets.push({ a, b, t: 0, speed: rand(.18, .52), life: rand(1.5, 3.2) });
    if (packets.length > 45) packets.shift();
  }

  function spawnTerminal() {
    const isLeft = Math.random() < .58;
    const width = Math.min(rand(220, 390), Math.max(160, w - 24));
    const preferredX = isLeft ? rand(w * .055, w * .28) : rand(w * .62, w * .84);
    const x = clamp(preferredX, 12, Math.max(12, w - width - 12));
    const y = rand(h * .13, h * .78);
    const lines = [];
    const lineCount = 2 + ((Math.random() * 5) | 0);
    lines.push(`[${hex(4)}:${hex(4)}] ${docIPs[(Math.random() * docIPs.length)|0]}`);
    for (let i = 1; i < lineCount; i++) {
      if (Math.random() < .38) lines.push(`0x${hex(8)}  ${hex(4)}:${hex(4)}:${hex(4)}`);
      else lines.push(terminalPool[(Math.random() * terminalPool.length) | 0]);
    }
    terminals.push({
      x, y, lines, age: 0, life: rand(4.5, 9),
      width, blink: rand(0, 6.28), alert: Math.random() < .08
    });
    if (terminals.length > 8) terminals.shift();
  }

  function spawnGlitch() {
    const count = 1 + ((Math.random() * 4) | 0);
    for (let i = 0; i < count; i++) {
      glitches.push({
        y: rand(0, h), x: rand(0, w * .75),
        width: rand(w * .08, w * .42), height: rand(1, 5),
        age: 0, life: rand(.05, .19), dir: Math.random() < .5 ? -1 : 1
      });
    }
  }

  function spawnSpark(x, y) {
    sparks.push({ x, y, age: 0, life: rand(.35, .9), r: rand(1, 2.5) });
    if (sparks.length > 70) sparks.shift();
  }

  function update(dt) {
    elapsed += dt;

    if (opts.mouseReaction) {
      mouseNX = lerp(mouseNX, (mouseX / w - .5) * 2, 1 - Math.pow(.0004, dt));
      mouseNY = lerp(mouseNY, (mouseY / h - .5) * 2, 1 - Math.pow(.0004, dt));
    } else {
      mouseNX = lerp(mouseNX, 0, .08);
      mouseNY = lerp(mouseNY, 0, .08);
    }

    for (const n of nodes) {
      n.x += n.driftX * dt * (0.08 + opts.activity / 280);
      n.y += n.driftY * dt * (0.08 + opts.activity / 320);
      if (n.x < w*.03) n.x += w*.94;
      if (n.x > w*.97) n.x -= w*.94;
      if (n.y < h*.06) n.y += h*.88;
      if (n.y > h*.94) n.y -= h*.88;
    }

    for (let i = packets.length - 1; i >= 0; i--) {
      packets[i].t += dt * packets[i].speed;
      packets[i].life -= dt;
      if (packets[i].life <= 0 || packets[i].t > 1.25) packets.splice(i, 1);
    }

    for (let i = terminals.length - 1; i >= 0; i--) {
      terminals[i].age += dt;
      if (terminals[i].age > terminals[i].life) terminals.splice(i, 1);
    }

    for (let i = glitches.length - 1; i >= 0; i--) {
      glitches[i].age += dt;
      if (glitches[i].age > glitches[i].life) glitches.splice(i, 1);
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      sparks[i].age += dt;
      if (sparks[i].age > sparks[i].life) sparks.splice(i, 1);
    }

    if (elapsed > nextPacketAt) {
      spawnPacket();
      nextPacketAt = elapsed + rand(.05, .25) * (100 / Math.max(10, opts.activity));
    }

    if (elapsed > nextTerminalAt && Math.random() * 100 < opts.terminalAmount) {
      spawnTerminal();
      nextTerminalAt = elapsed + rand(.8, 2.5) * (115 / Math.max(12, opts.terminalAmount));
    }

    if (elapsed > nextGlitchAt && Math.random() * 100 < opts.glitchAmount) {
      spawnGlitch();
      nextGlitchAt = elapsed + rand(1.7, 5.5) * (120 / Math.max(8, opts.glitchAmount));
    }
  }

  function drawBackground() {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, w, h);

    const bf = bootFactor();
    const glow = ctx.createRadialGradient(w*.53, h*.47, 0, w*.53, h*.47, Math.max(w,h)*.68);
    glow.addColorStop(0, rgba(opts.primary, .028 * bf));
    glow.addColorStop(.45, rgba(opts.primary, .010 * bf));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0,0,w,h);
  }

  function nodeScreen(n) {
    const depth = n.z;
    const px = (n.x - w*.5) + mouseNX * 9 * depth + w*.5;
    const py = (n.y - h*.5) + mouseNY * 6 * depth + h*.5;
    return {x:px,y:py};
  }

  function drawNetwork() {
    const bf = bootFactor();
    const linkDist = Math.min(w,h) * .15;
    ctx.lineWidth = .55;

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i], ap = nodeScreen(a);
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const ds = dx*dx + dy*dy;
        if (ds > linkDist*linkDist) continue;
        const bp = nodeScreen(b);
        const alpha = (1 - Math.sqrt(ds)/linkDist) * .085 * bf;
        if (alpha < .008) continue;
        ctx.strokeStyle = rgba(opts.primary, alpha);
        ctx.beginPath(); ctx.moveTo(ap.x, ap.y); ctx.lineTo(bp.x, bp.y); ctx.stroke();
      }
    }

    for (const n of nodes) {
      const p = nodeScreen(n);
      const pulse = .45 + Math.sin(elapsed*1.25+n.phase)*.18;
      const a = clamp((.10 + n.pulse*.14) * bf * pulse, 0, .6);
      ctx.fillStyle = rgba(opts.primary, a);
      ctx.beginPath(); ctx.arc(p.x,p.y,n.size*(.8+n.z),0,Math.PI*2); ctx.fill();
    }
  }

  function drawPackets() {
    const bf = bootFactor();
    for (const p of packets) {
      const a = nodeScreen(p.a), b = nodeScreen(p.b);
      const t = clamp(p.t, 0, 1);
      const x = lerp(a.x,b.x,t), y = lerp(a.y,b.y,t);
      const alpha = Math.sin(t*Math.PI) * .62 * bf;
      ctx.fillStyle = rgba(opts.primary, alpha);
      ctx.shadowColor = opts.primary; ctx.shadowBlur = 8;
      ctx.fillRect(x-1.2,y-1.2,2.4,2.4);
      ctx.shadowBlur = 0;
      if (Math.random() < .012) spawnSpark(x,y);
    }

    for (const s of sparks) {
      const a = (1-s.age/s.life)*.28;
      ctx.fillStyle = rgba(opts.primary,a);
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
    }
  }

  function drawTerminals() {
    const bf = bootFactor();
    ctx.textBaseline = 'top';
    for (const t of terminals) {
      const fadeIn = clamp(t.age/.5,0,1), fadeOut = clamp((t.life-t.age)/1.1,0,1);
      const alpha = fadeIn*fadeOut*bf;
      if (alpha <= 0) continue;
      const lineH = clamp(h*.015, 13, 20);
      const fontSize = Math.max(11, lineH*.72);
      const panelH = t.lines.length*lineH + 26;

      ctx.fillStyle = 'rgba(0,0,0,'+(alpha*.48)+')';
      ctx.fillRect(t.x-12,t.y-12,t.width,panelH);
      ctx.strokeStyle = rgba(t.alert ? opts.accent : opts.primary, alpha*.16);
      ctx.lineWidth = 1;
      ctx.strokeRect(t.x-12+.5,t.y-12+.5,t.width-1,panelH-1);

      ctx.fillStyle = rgba(t.alert ? opts.accent : opts.primary, alpha*.40);
      ctx.fillRect(t.x-12,t.y-12,2,panelH);
      ctx.font = `${fontSize}px Consolas, monospace`;

      for (let i = 0; i < t.lines.length; i++) {
        const isHead = i === 0;
        ctx.fillStyle = rgba(t.alert && isHead ? opts.accent : opts.primary, alpha*(isHead?.82:.52));
        let text = t.lines[i];
        if (i === t.lines.length-1 && Math.sin(elapsed*5+t.blink)>0.3) text += ' _';
        ctx.fillText(text, t.x, t.y + i*lineH);
      }
    }
  }

  function drawHexRain() {
    const bf = bootFactor();
    const amount = Math.round(7 + opts.activity/13);
    ctx.font = `${Math.max(10,h*.012)}px Consolas, monospace`;
    ctx.textBaseline='top';
    for (let i=0;i<amount;i++) {
      const seed = i*7919.31;
      const x = w*(.73 + ((Math.sin(seed)*.5+.5)*.23));
      const speed = 9 + (i%5)*5;
      const y = ((elapsed*speed*10 + seed*4) % (h*1.35)) - h*.18;
      const a = (.035 + (i%4)*.012) * bf;
      ctx.fillStyle = rgba(opts.primary,a);
      ctx.fillText(`${hex(2)} ${hex(4)} ${hex(2)}`,x,y);
    }
  }

  function drawGlitches() {
    for (const g of glitches) {
      const a = (1-g.age/g.life)*.24;
      ctx.fillStyle = rgba(Math.random()<.18?opts.accent:opts.primary,a);
      ctx.fillRect(g.x + g.dir*g.age*140, g.y, g.width, g.height);
    }

    if (glitches.length && Math.random() < .28) {
      const sy = (Math.random()*h)|0, sh = 2 + ((Math.random()*7)|0);
      ctx.globalCompositeOperation='screen';
      ctx.fillStyle=rgba(opts.primary,.035);
      ctx.fillRect(0,sy,w,sh);
      ctx.globalCompositeOperation='source-over';
    }
  }

  function drawBoot() {
    if (!opts.bootSequence || elapsed > 8.5) return;
    const lines = [
      'cold start :: secure display',
      'mapping silent relay mesh',
      'loading passive monitor',
      'link state :: isolated',
      'visual layer online'
    ];
    const shown = Math.min(lines.length, Math.floor(elapsed/.85));
    if (shown <= 0) return;
    const fs = Math.max(11,h*.014);
    ctx.font=`${fs}px Consolas, monospace`; ctx.textBaseline='top';
    for(let i=0;i<shown;i++) {
      const age = elapsed - (i+1)*.85;
      const a = clamp(1-age/4,0,.5);
      ctx.fillStyle=rgba(opts.primary,a);
      ctx.fillText(`> ${lines[i]}`,w*.055,h*.73+i*fs*1.55);
    }
  }

  function render() {
    drawBackground();
    drawNetwork();
    drawPackets();
    drawHexRain();
    drawTerminals();
    drawBoot();
    drawGlitches();
  }

  function loop(ts) {
    raf = requestAnimationFrame(loop);
    if (!last) { last=ts; return; }
    const raw = Math.min(.05,(ts-last)/1000);
    last=ts;
    frameCarry += raw;
    const step = 1/Math.max(15,opts.fps);
    if (frameCarry < step) return;
    const dt = frameCarry; frameCarry=0;
    update(dt); render();
  }

  function onMouseMove(e) { mouseX=e.clientX; mouseY=e.clientY; }
  window.addEventListener('mousemove',onMouseMove,{passive:true});
  window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',function(){
    if (document.hidden && raf) { cancelAnimationFrame(raf); raf=0; last=0; }
    else if (!document.hidden && !raf) raf=requestAnimationFrame(loop);
  });

  resize();
  nextTerminalAt=1.4; nextPacketAt=.5; nextGlitchAt=4.2;
  raf=requestAnimationFrame(loop);
}());
