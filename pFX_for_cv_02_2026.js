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
      count: Math.max(50, Math.floor(
        vw * innerHeight * (isPhone ? 0.00008 : 0.00011)
      )),

      // ── parallax ──
      // base scroll-speed variation by depth
      parallaxStrength: isPhone ? 0.35 : 0.6,

      // ── spring dynamics ──
      // creates overshoot / bounce when scroll starts and stops
      springStiffness:  isPhone ? 0.02 : 0.03,
      springDamping:    isPhone ? 0.82 : 0.78,
      springGain:       isPhone ? 1.8  : 2.5,
      springMaxVel:     3000,

      // ── particle appearance (depth 0→1) ──
      sizeMin:    0.3,
      sizeMax:    2.5,
      opacityMin: 0.05,
      opacityMax: 0.5,
      color: [255, 255, 255],

      // ── gentle drift ──
      driftAmp:  0.05,
      driftFreq: 0.2,
      friction:  0.965,

      // ── mouse: attract + swirl ──
      mouseRadius:   isPhone ? 0 : 380,
      attractForce:  0.02,
      swirlForce:    0.3,
      swirlFalloff:  2.5,

      // ── tap burst (integrates into grid) ──
      burstCount:     isPhone ? 8 : 14,
      burstSpeed:     3.0,
      burstSettleSec: 2.5,

      // ── lines between particles ──
      lineRadius:     isPhone ? 65 : 100,
      lineMaxPerNode: 3,
      lineOpacity:    0.18,
      lineWidth:      0.5,
      lineBend:       0.1,

      // ── max total particles ──
      maxParticles: 400,

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

    // ────────────── SCROLL & SPRING STATE ──────────────
    let prevScrollY = window.scrollY || 0;

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
        // per-particle spring offset for parallax bounce
        springOff: 0,
        springVel: 0,
        // drift noise
        phX: rand() * 1000,
        phY: rand() * 1000,
        driftMul: 0.5 + depth * 0.8,
        // burst state (false = normal particle)
        burst:    false,
        burstAge: 1,  // 1 = fully settled
      };
    }

    function makeBurstParticle(bx, by) {
      const depth = 0.15 + rand() * 0.7;
      const angle = rand() * TAU;
      const speed = C.burstSpeed * (0.3 + rand()) * dpr;
      return {
        x: bx, y: by,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        depth,
        size:    mix(C.sizeMin, C.sizeMax, depth) * dpr,
        opacity: mix(C.opacityMin, C.opacityMax, depth),
        springOff: 0,
        springVel: 0,
        phX: rand() * 1000,
        phY: rand() * 1000,
        driftMul: 0.5 + depth * 0.8,
        burst:    true,
        burstAge: 0,   // starts at 0, settles to 1
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

      // cap total particles
      let over = (particles.length + C.burstCount) - C.maxParticles;
      if (over > 0) {
        let removed = 0;
        for (let i = 0; i < particles.length && removed < over; i++) {
          if (particles[i].burstAge >= 1) {
            particles.splice(i, 1);
            removed++;
            i--;
          }
        }
      }

      for (let i = 0; i < C.burstCount; i++) {
        particles.push(makeBurstParticle(bx, by));
      }
    };

    _onLeave = () => { mouse.active = false; };

    addEventListener('pointermove', _onMove, { passive: true });
    addEventListener('pointerdown', _onDown, { passive: true });
    document.addEventListener('mouseleave', _onLeave, { passive: true });

    // fade in
    requestAnimationFrame(() => { canvas.style.opacity = '1'; });

    // ────────────── RGBA HELPER ──────────────
    const cr = C.color[0], cg = C.color[1], cb = C.color[2];
    function rgba(a) {
      return `rgba(${cr},${cg},${cb},${a < 0.001 ? 0 : a.toFixed(4)})`;
    }

    // ────────────── RENDER LOOP ──────────────
    let lastT = 0;
    const frameDur = 1000 / 60;

    function frame(ts) {
      if (!running) return;
      frameId = requestAnimationFrame(frame);

      if (ts - lastT < frameDur * 0.85) return;
      const elapsed = ts - lastT;
      lastT = ts;

      const dt  = Math.min(elapsed / 1000, 0.05);

      // ── scroll delta ──
      const sy     = window.scrollY || 0;
      const sDelta = sy - prevScrollY;
      prevScrollY  = sy;

      // scroll velocity (px/s), clamped
      const scrollVel = clamp(
        sDelta / (dt || 0.016),
        -C.springMaxVel,
         C.springMaxVel
      );

      // ── update particles ──
      const margin = 100 * dpr;
      const mR  = C.mouseRadius * dpr;
      const mR2 = mR * mR;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // ── depth-based parallax factor ──
        // depthOffset: far(0)→ -0.3, mid(0.5)→ 0, near(1)→ +0.3  (at strength 0.6)
        const depthOffset = (p.depth - 0.5) * C.parallaxStrength;

        // base scroll tracking: all follow scroll, depth varies speed
        p.y -= sDelta * dpr * (1.0 + depthOffset);

        // ── SPRING: inject scroll impulse, scaled by depth ──
        // Far particles get negative impulse → spring lag
        // Near particles get positive impulse → spring overshoot
        p.springVel += scrollVel * depthOffset * C.springGain * dt;

        // spring physics: pull back to rest (0) + damping
        p.springVel += -p.springOff * C.springStiffness;
        p.springVel *= C.springDamping;
        p.springOff += p.springVel * dt;
        p.springOff  = clamp(p.springOff, -H * 0.3, H * 0.3);

        // ── burst settling ──
        if (p.burst && p.burstAge < 1) {
          p.burstAge = Math.min(1, p.burstAge + dt / C.burstSettleSec);
          // friction increases as particle settles
          const settleK = p.burstAge * p.burstAge;
          const burstFriction = mix(0.93, C.friction, settleK);
          p.vx *= burstFriction;
          p.vy *= burstFriction;
        }

        // ── gentle drift (once burst has mostly settled) ──
        if (!p.burst || p.burstAge > 0.3) {
          const spd = C.driftFreq * p.driftMul;
          p.phX += spd * dt;
          p.phY += spd * dt * 0.73;
          p.vx  += Math.sin(p.phX) * C.driftAmp * p.driftMul * dt;
          p.vy  += Math.cos(p.phY) * C.driftAmp * p.driftMul * dt;
        }

        // ── mouse attract + swirl ──
        if (mouse.active && mR > 0) {
          const drawY = p.y + p.springOff;
          const dx = mouse.x - p.x;
          const dy = mouse.y - drawY;
          const d2 = dx * dx + dy * dy;

          if (d2 < mR2 && d2 > 1) {
            const dist = Math.sqrt(d2);
            const fall = Math.pow(1 - dist / mR, C.swirlFalloff);
            const nx = dx / dist;
            const ny = dy / dist;

            p.vx += nx * C.attractForce * fall;
            p.vy += ny * C.attractForce * fall;
            p.vx += (-ny) * C.swirlForce * fall * dt;
            p.vy += ( nx) * C.swirlForce * fall * dt;
          }
        }

        // ── friction + integrate ──
        p.vx *= C.friction;
        p.vy *= C.friction;
        p.x  += p.vx;
        p.y  += p.vy;

        // ── wrap edges ──
        if      (p.y < -margin)    p.y += H + 2 * margin;
        else if (p.y > H + margin) p.y -= H + 2 * margin;
        if      (p.x < -margin)    p.x += W + 2 * margin;
        else if (p.x > W + margin) p.x -= W + 2 * margin;
      }

      // ══════════════ DRAW ══════════════
      ctx.clearRect(0, 0, W, H);

      // ── lines ──
      const lr  = C.lineRadius * dpr;
      const lr2 = lr * lr;
      const lw  = C.lineWidth * dpr;
      ctx.globalCompositeOperation = 'screen';
      ctx.lineWidth = lw;

      for (let i = 0; i < particles.length; i++) {
        const a  = particles[i];
        const ax = a.x;
        const ay = a.y + a.springOff;

        if (ax < -lr || ax > W + lr || ay < -lr || ay > H + lr) continue;

        // burst particles don't connect lines until 15% settled
        if (a.burst && a.burstAge < 0.15) continue;

        let edges = 0;
        for (let j = i + 1; j < particles.length && edges < C.lineMaxPerNode; j++) {
          const b = particles[j];
          if (b.burst && b.burstAge < 0.15) continue;

          const bx = b.x;
          const by = b.y + b.springOff;
          const dx = bx - ax;
          const dy = by - ay;
          const d2 = dx * dx + dy * dy;
          if (d2 > lr2 || d2 < 1) continue;

          const dist  = Math.sqrt(d2);
          const t     = 1 - dist / lr;
          let alpha = t * t * C.lineOpacity;

          // fade lines in as burst particles settle
          if (a.burst && a.burstAge < 1) alpha *= a.burstAge;
          if (b.burst && b.burstAge < 1) alpha *= b.burstAge;

          if (alpha < 0.002) continue;

          const mx = (ax + bx) * 0.5;
          const my = (ay + by) * 0.5;
          const perpX = -dy / dist;
          const perpY =  dx / dist;
          const sign  = ((i * 7 + j * 13) & 1) ? 1 : -1;
          const cpx   = mx + perpX * dist * C.lineBend * sign;
          const cpy   = my + perpY * dist * C.lineBend * sign;

          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.quadraticCurveTo(cpx, cpy, bx, by);
          ctx.strokeStyle = rgba(alpha);
          ctx.stroke();

          edges++;
        }
      }

      // ── dots ──
      ctx.globalCompositeOperation = C.blendMode;

      for (let i = 0; i < particles.length; i++) {
        const p  = particles[i];
        const px = p.x;
        const py = p.y + p.springOff;

        if (px < -p.size || px > W + p.size ||
            py < -p.size || py > H + p.size) continue;

        let alpha = p.opacity;

        // burst particles: quick fade-in at birth
        if (p.burst && p.burstAge < 0.1) {
          alpha *= p.burstAge / 0.1;
        }

        if (alpha < 0.002) continue;

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, TAU);
        ctx.fillStyle = rgba(alpha);
        ctx.fill();
      }
    }

    frameId = requestAnimationFrame(frame);
    console.log('✦ particles v2.1 started ·', location.pathname);
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
    console.log('✦ particles v2.1 stopped');
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
