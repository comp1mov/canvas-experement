(() => {
  'use strict';

  // === ALLOWED PAGES ===
  const ALLOWED = [
    'grisha-tsvetkov.com/cv',
    'grisha-tsvetkov.com/contacts',
    'grisha-tsvetkov.com/portfolio'
  ];

  function isAllowed() {
    return ALLOWED.some(p => location.href.includes(p));
  }

  // === DEVICE DETECTION ===
  function isMobile() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      || matchMedia('(pointer: coarse)').matches;
  }

  // === GLOBALS ===
  let canvas, ctx, W, H, dpr;
  let particles = [];
  let mouse = { x: -9999, y: -9999, active: false };
  let prevScrollY = 0;
  let running = false;
  let frameId = null;
  let _onResize, _onMove, _onDown, _onLeave;

  const rand  = Math.random;
  const TAU   = Math.PI * 2;
  const mix   = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ================================================================
  //  INIT
  // ================================================================
  function init() {
    if (running) return;
    if (!isAllowed()) return;
    running = true;

    const mobile  = isMobile();
    const vw      = innerWidth;
    const isPhone = mobile && vw <= 768;

    // ────────────── CONFIG ──────────────
    const C = {
      // particle count (area-based density)
      count: Math.max(50, Math.floor(
        vw * innerHeight * (isPhone ? 0.00008 : 0.00011)
      )),

      // ── parallax ──
      // strength of depth-based scroll speed variation
      // 0 = all particles scroll 1:1 with text
      // 0.4 = far layer at 80%, near layer at 120% of scroll speed
      parallaxStrength: isPhone ? 0.25 : 0.4,

      // ── particle appearance (varies by depth 0→1) ──
      sizeMin:    0.3,    // far
      sizeMax:    2.2,    // near
      opacityMin: 0.07,   // far
      opacityMax: 0.45,   // near
      color: [255, 255, 255],

      // ── gentle drift ──
      driftAmp:  0.05,
      driftFreq: 0.2,
      friction:  0.965,

      // ── mouse: attract + swirl ──
      mouseRadius:   isPhone ? 0 : 380,
      attractForce:  0.02,
      swirlForce:    0.3,
      swirlFalloff:  2.5,   // exponent — higher = tighter falloff

      // ── tap burst ──
      burstCount:   isPhone ? 10 : 16,
      burstSpeed:   2.5,
      burstLifeMin: 1.0,
      burstLifeMax: 2.0,

      // ── lines between particles ──
      lineRadius:     isPhone ? 65 : 100,
      lineMaxPerNode: 3,
      lineOpacity:    0.18,
      lineWidth:      0.5,
      lineBend:       0.1,   // curvature (0 = straight)

      // ── render ──
      blendMode: 'difference',
      dprClamp:  isPhone ? 1.5 : 2.0,
    };

    // ────────────── CANVAS ──────────────
    canvas = document.createElement('canvas');
    ctx    = canvas.getContext('2d', { alpha: true });
    document.body.appendChild(canvas);

    Object.assign(canvas.style, {
      position:     'fixed',
      inset:        '0',
      width:        '100%',
      height:       '100%',
      zIndex:       '9999',
      pointerEvents:'none',
      mixBlendMode: C.blendMode,
      opacity:      '0',
      transition:   'opacity 1.5s ease',
    });

    function resize() {
      dpr = Math.min(devicePixelRatio || 1, C.dprClamp);
      W = Math.floor(innerWidth  * dpr);
      H = Math.floor(innerHeight * dpr);
      canvas.width  = W;
      canvas.height = H;
    }
    resize();
    _onResize = resize;
    addEventListener('resize', _onResize, { passive: true });

    // ────────────── PARTICLES ──────────────
    function makeParticle() {
      const depth = rand();
      return {
        x: rand() * W,
        y: rand() * H,
        vx: 0, vy: 0,
        depth,
        size:    mix(C.sizeMin, C.sizeMax, depth) * dpr,
        opacity: mix(C.opacityMin, C.opacityMax, depth),
        // drift noise
        phX: rand() * 1000,
        phY: rand() * 1000,
        driftMul: 0.5 + depth * 0.8,  // far=slow, near=fast
        // not a burst
        burst: false, bornAt: 0, life: 0,
      };
    }

    function makeBurst(bx, by) {
      const depth = 0.2 + rand() * 0.6;
      const angle = rand() * TAU;
      const speed = C.burstSpeed * (0.4 + rand()) * dpr;
      return {
        x: bx, y: by,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        depth,
        size:    mix(C.sizeMin, C.sizeMax, depth) * dpr * 0.6,
        opacity: mix(C.opacityMin, C.opacityMax, depth) * 0.7,
        phX: 0, phY: 0, driftMul: 1,
        burst: true,
        bornAt: performance.now() / 1000,
        life: mix(C.burstLifeMin, C.burstLifeMax, rand()),
      };
    }

    particles = [];
    for (let i = 0; i < C.count; i++) particles.push(makeParticle());

    // ────────────── INPUT ──────────────
    _onMove = (e) => {
      if (isPhone) return;
      mouse.x = e.clientX * dpr;
      mouse.y = e.clientY * dpr;
      mouse.active = true;
    };

    _onDown = (e) => {
      const bx = e.clientX * dpr;
      const by = e.clientY * dpr;
      for (let i = 0; i < C.burstCount; i++) {
        particles.push(makeBurst(bx, by));
      }
    };

    _onLeave = () => { mouse.active = false; };

    addEventListener('pointermove', _onMove, { passive: true });
    addEventListener('pointerdown', _onDown, { passive: true });
    document.addEventListener('mouseleave', _onLeave, { passive: true });

    prevScrollY = window.scrollY || 0;

    // fade in
    requestAnimationFrame(() => { canvas.style.opacity = '1'; });

    // ────────────── RGBA HELPER ──────────────
    const r = C.color[0], g = C.color[1], b = C.color[2];
    function rgba(a) {
      return `rgba(${r},${g},${b},${a < 0.001 ? 0 : a.toFixed(4)})`;
    }

    // ────────────── RENDER LOOP ──────────────
    let lastT = 0;
    const frameDur = 1000 / 60;

    function frame(ts) {
      if (!running) return;
      frameId = requestAnimationFrame(frame);

      // throttle to ~60fps
      if (ts - lastT < frameDur * 0.85) return;
      const elapsed = ts - lastT;
      lastT = ts;

      const dt  = Math.min(elapsed / 1000, 0.05);
      const now = ts / 1000;

      // ── scroll delta ──
      const sy     = window.scrollY || 0;
      const sDelta = sy - prevScrollY;
      prevScrollY  = sy;

      // ── update particles ──
      const margin = 80 * dpr;
      const mR  = C.mouseRadius * dpr;
      const mR2 = mR * mR;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // -- burst lifetime --
        if (p.burst) {
          if (now - p.bornAt >= p.life) {
            particles.splice(i, 1);
            continue;
          }
          p.vx *= 0.94;
          p.vy *= 0.94;
          p.x  += p.vx;
          p.y  += p.vy;
          // parallax even for bursts
          const sf = 1.0 + (p.depth - 0.5) * C.parallaxStrength;
          p.y -= sDelta * dpr * sf;
          continue;
        }

        // -- parallax scroll --
        // scrollFactor: far(0)=0.8, mid(0.5)=1.0, near(1)=1.2  (at strength 0.4)
        // particles track content; depth creates speed variation → parallax
        const scrollFactor = 1.0 + (p.depth - 0.5) * C.parallaxStrength;
        p.y -= sDelta * dpr * scrollFactor;

        // -- gentle drift --
        const spd = C.driftFreq * p.driftMul;
        p.phX += spd * dt;
        p.phY += spd * dt * 0.73;
        p.vx  += Math.sin(p.phX) * C.driftAmp * p.driftMul * dt;
        p.vy  += Math.cos(p.phY) * C.driftAmp * p.driftMul * dt;

        // -- mouse attract + swirl --
        if (mouse.active && mR > 0) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const d2 = dx * dx + dy * dy;

          if (d2 < mR2 && d2 > 1) {
            const dist = Math.sqrt(d2);
            const fall = Math.pow(1 - dist / mR, C.swirlFalloff);
            const nx = dx / dist;
            const ny = dy / dist;

            // attract toward cursor
            p.vx += nx * C.attractForce * fall;
            p.vy += ny * C.attractForce * fall;

            // swirl (perpendicular to attract direction)
            p.vx += (-ny) * C.swirlForce * fall * dt;
            p.vy += ( nx) * C.swirlForce * fall * dt;
          }
        }

        // -- friction --
        p.vx *= C.friction;
        p.vy *= C.friction;
        p.x  += p.vx;
        p.y  += p.vy;

        // -- wrap around edges --
        if      (p.y < -margin)    p.y += H + 2 * margin;
        else if (p.y > H + margin) p.y -= H + 2 * margin;
        if      (p.x < -margin)    p.x += W + 2 * margin;
        else if (p.x > W + margin) p.x -= W + 2 * margin;
      }

      // ══════════════ DRAW ══════════════
      ctx.clearRect(0, 0, W, H);

      // ── lines (behind dots) ──
      const lr  = C.lineRadius * dpr;
      const lr2 = lr * lr;
      const lw  = C.lineWidth * dpr;
      ctx.globalCompositeOperation = 'screen';
      ctx.lineWidth = lw;

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        if (a.burst) continue;
        if (a.x < -lr || a.x > W + lr || a.y < -lr || a.y > H + lr) continue;

        let edges = 0;
        for (let j = i + 1; j < particles.length && edges < C.lineMaxPerNode; j++) {
          const b2 = particles[j];
          if (b2.burst) continue;

          const dx = b2.x - a.x;
          const dy = b2.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > lr2 || d2 < 1) continue;

          const dist  = Math.sqrt(d2);
          const t     = 1 - dist / lr;
          const alpha = t * t * C.lineOpacity;
          if (alpha < 0.002) continue;

          // gentle curve via quadratic bezier
          const mx = (a.x + b2.x) * 0.5;
          const my = (a.y + b2.y) * 0.5;
          const perpX = -dy / dist;
          const perpY =  dx / dist;
          const sign  = ((i * 7 + j * 13) & 1) ? 1 : -1;
          const cpx   = mx + perpX * dist * C.lineBend * sign;
          const cpy   = my + perpY * dist * C.lineBend * sign;

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.quadraticCurveTo(cpx, cpy, b2.x, b2.y);
          ctx.strokeStyle = rgba(alpha);
          ctx.stroke();

          edges++;
        }
      }

      // ── dots ──
      ctx.globalCompositeOperation = C.blendMode;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.x < -p.size || p.x > W + p.size ||
            p.y < -p.size || p.y > H + p.size) continue;

        let alpha = p.opacity;

        // burst fade-out
        if (p.burst) {
          const age = now - p.bornAt;
          const lt  = age / p.life;
          const fin = clamp(age / 0.08, 0, 1);   // quick fade-in
          const fot = (1 - lt);
          alpha *= fin * fot * fot;               // quadratic fade-out
        }

        if (alpha < 0.002) continue;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fillStyle = rgba(alpha);
        ctx.fill();
      }
    }

    frameId = requestAnimationFrame(frame);
    console.log('✦ particles v2 started ·', location.pathname);
  }

  // ================================================================
  //  CLEANUP
  // ================================================================
  function cleanup() {
    if (!running) return;
    running = false;
    if (frameId) cancelAnimationFrame(frameId);
    removeEventListener('resize', _onResize);
    removeEventListener('pointermove', _onMove);
    removeEventListener('pointerdown', _onDown);
    document.removeEventListener('mouseleave', _onLeave);
    if (canvas?.parentNode) {
      canvas.style.opacity = '0';
      setTimeout(() => canvas?.remove(), 1600);
    }
    particles = [];
    console.log('✦ particles v2 stopped');
  }

  // ================================================================
  //  SPA NAVIGATION DETECTION
  // ================================================================
  init();

  let lastUrl = location.href;
  function checkNav() {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    if (!isAllowed()) cleanup();
    else if (!running) init();
  }

  document.addEventListener('click', () => setTimeout(checkNav, 300), { capture: true });
  addEventListener('popstate', () => setTimeout(checkNav, 300));
  setInterval(checkNav, 500);
})();
