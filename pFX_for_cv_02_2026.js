(() => {
  'use strict';

  const ALLOWED = [
    'grisha-tsvetkov.com/cv',
    'grisha-tsvetkov.com/contacts',
    'grisha-tsvetkov.com/portfolio'
  ];

  function isAllowed() {
    return ALLOWED.some(p => location.href.includes(p));
  }

  function isMobile() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      || matchMedia('(pointer: coarse)').matches;
  }

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

      // ── hero particles for extreme depth ──
      heroNearCount:  isPhone ? 1 : 3,
      heroFarCount:   isPhone ? 3 : 5,

      // ── parallax ──
      parallaxStrength: isPhone ? 0.5 : 0.9,

      // ── spring dynamics ──
      springStiffness:  isPhone ? 0.02 : 0.025,
      springDamping:    isPhone ? 0.82 : 0.76,
      springGain:       isPhone ? 2.0  : 3.2,
      springMaxVel:     3000,

      // ── depth → appearance ──
      // normal particles: depth 0.1 → 0.9
      // hero far:  depth 0.0 → 0.08
      // hero near: depth 0.92 → 1.0
      sizeMin:    0.2,    // depth=0  (furthest hero)
      sizeMax:    3.5,    // depth=1  (nearest hero)
      opacityMin: 0.03,
      opacityMax: 0.55,
      color: [255, 255, 255],

      // ── gentle drift ──
      driftAmp:  0.05,
      driftFreq: 0.2,
      friction:  0.965,

      // ── mouse: WIDE SLOW ORBIT ──
      mouseRadius:    isPhone ? 0 : 500,
      attractForce:   0.003,     // very gentle pull (was 0.02)
      swirlForce:     0.25,      // swirl (was 0.15)
      swirlFalloff:   1.8,       // softer falloff = wider influence
      mouseDeadzone:  60,        // px from cursor where attract stops
                                 // prevents clumping at center

      // ── tap burst ──
      burstCountMin:  isPhone ? 5  : 8,
      burstCountMax:  isPhone ? 12 : 20,
      burstSpeedMin:  1.5,
      burstSpeedMax:  5.0,
      burstSettleSec: 2.5,

      // ── lines ──
      lineRadius:     isPhone ? 70 : 110,
      lineMaxPerNode: 3,
      lineOpacity:    0.25,     // was 0.18
      lineWidth:      0.7,      // was 0.5
      lineBend:       0.12,

      // ── limits ──
      maxParticles: 420,
      
      // ── fade ──
      fadeInSec:   2.0,     // seconds for new particles to fade in
      fadeOutSec:  2.5,     // seconds to fade out before death
      lifeMin:     25,      // min lifetime in seconds
      lifeMax:     50,      // max lifetime in seconds

      // ── render ──
      blendMode: 'difference',
      dprClamp:  isPhone ? 1.5 : 2.0,
    };

    // phone: smaller particles
    if (isPhone) {
      C.sizeMin = 0.15;
      C.sizeMax = 1.6;
    }

    // ────────────── CANVAS ──────────────
    canvas = document.createElement('canvas');
    ctx    = canvas.getContext('2d', { alpha: true });
    document.body.appendChild(canvas);

    Object.assign(canvas.style, {
      position:      'fixed',
      inset:         '0',
      width:         '100%',
      height:        '100%',
      zIndex:        '9999',
      pointerEvents: 'none',
      mixBlendMode:  C.blendMode,
      opacity:       '0',
      transition:    'opacity 1.5s ease',
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

    // ────────────── SCROLL STATE ──────────────
    let prevScrollY = window.scrollY || 0;

    // ────────────── PARTICLE FACTORY ──────────────
    function sizeForDepth(d) {
      // cubic curve: small dots stay small longer, big dots ramp up fast
      const t = d * d;
      return mix(C.sizeMin, C.sizeMax, t) * dpr;
    }

    function opacityForDepth(d) {
      return mix(C.opacityMin, C.opacityMax, d);
    }

    function makeParticle(depthOverride) {
      const depth = (depthOverride !== undefined)
        ? depthOverride
        : 0.1 + rand() * 0.8;  // normal range: 0.1–0.9

      return {
        x: rand() * W,
        y: rand() * H,
        vx: 0, vy: 0,
        depth,
        size:    sizeForDepth(depth),
        opacity: opacityForDepth(depth),
        springOff: 0,
        springVel: 0,
        phX: rand() * 1000,
        phY: rand() * 1000,
        driftMul: 0.3 + depth * 1.0,
        burst:    false,
        burstAge: 1,
        bornAt:   performance.now() / 1000 - rand() * 1.5,
        life:     mix(C.lifeMin, C.lifeMax, rand()),
      };
    }

    function makeBurstParticle(bx, by) {
      const depth = 0.15 + rand() * 0.7;
      const angle = rand() * TAU;
      // varied burst power
      const speed = mix(C.burstSpeedMin, C.burstSpeedMax, rand()) * dpr;
      return {
        x: bx, y: by,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        depth,
        size:    sizeForDepth(depth),
        opacity: opacityForDepth(depth),
        springOff: 0,
        springVel: 0,
        phX: rand() * 1000,
        phY: rand() * 1000,
        driftMul: 0.3 + depth * 1.0,
        burst:    true,
        burstAge: 0,
        bornAt:   performance.now() / 1000,
        life:     mix(C.lifeMin, C.lifeMax, rand()),
      };
    }

    // ── populate ──
    particles = [];

    // hero far (tiny, very deep background)
    for (let i = 0; i < C.heroFarCount; i++) {
      particles.push(makeParticle(0.01 + rand() * 0.07));
    }

    // normal particles
    for (let i = 0; i < C.count; i++) {
      particles.push(makeParticle());
    }

    // hero near (big, very foreground)
    for (let i = 0; i < C.heroNearCount; i++) {
      particles.push(makeParticle(0.93 + rand() * 0.07));
    }

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

      // random burst count per tap
      const count = Math.floor(
        mix(C.burstCountMin, C.burstCountMax, rand())
      );

      // cap total particles
      let over = (particles.length + count) - C.maxParticles;
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

      for (let i = 0; i < count; i++) {
        particles.push(makeBurstParticle(bx, by));
      }
    };

    _onLeave = () => { mouse.active = false; };

    addEventListener('pointermove', _onMove, { passive: true });
    addEventListener('pointerdown', _onDown, { passive: true });
    document.addEventListener('mouseleave', _onLeave, { passive: true });

    requestAnimationFrame(() => { canvas.style.opacity = '1'; });

    // ────────────── RGBA ──────────────
    const cr = C.color[0], cg = C.color[1], cb = C.color[2];
    function rgba(a) {
      return `rgba(${cr},${cg},${cb},${a < 0.001 ? 0 : a.toFixed(4)})`;
    }

    // ────────────── FRAME LOOP ──────────────
    let lastT = 0;
    const frameDur = 1000 / 60;

    function frame(ts) {
      if (!running) return;
      frameId = requestAnimationFrame(frame);
      if (ts - lastT < frameDur * 0.85) return;
      const elapsed = ts - lastT;
      lastT = ts;
      const dt = Math.min(elapsed / 1000, 0.05);

      // ── scroll ──
      const sy     = window.scrollY || 0;
      const sDelta = sy - prevScrollY;
      prevScrollY  = sy;

      const scrollVel = clamp(
        sDelta / (dt || 0.016),
        -C.springMaxVel,
         C.springMaxVel
      );

      // ── update ──
      const margin = 120 * dpr;
      const mR   = C.mouseRadius * dpr;
      const mR2  = mR * mR;
      const dead = C.mouseDeadzone * dpr;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // ── parallax scroll ──
        const depthOffset = (p.depth - 0.5) * C.parallaxStrength;
        p.y -= sDelta * dpr * (1.0 + depthOffset);

        // ── spring bounce ──
        p.springVel += scrollVel * depthOffset * C.springGain * dt;
        p.springVel += -p.springOff * C.springStiffness;
        p.springVel *= C.springDamping;
        p.springOff += p.springVel * dt;
        p.springOff  = clamp(p.springOff, -H * 0.35, H * 0.35);

        // ── burst settling ──
        if (p.burst && p.burstAge < 1) {
          p.burstAge = Math.min(1, p.burstAge + dt / C.burstSettleSec);
          const settleK = p.burstAge * p.burstAge;
          p.vx *= mix(0.93, C.friction, settleK);
          p.vy *= mix(0.93, C.friction, settleK);
        }

        // ── drift ──
        if (!p.burst || p.burstAge > 0.3) {
          const spd = C.driftFreq * p.driftMul;
          p.phX += spd * dt;
          p.phY += spd * dt * 0.73;
          p.vx  += Math.sin(p.phX) * C.driftAmp * p.driftMul * dt;
          p.vy  += Math.cos(p.phY) * C.driftAmp * p.driftMul * dt;
        }

        // ── mouse: wide orbit, no clumping ──
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

            // attract — but STOP when inside deadzone
            if (dist > dead) {
              p.vx += nx * C.attractForce * fall;
              p.vy += ny * C.attractForce * fall;
            } else {
              // inside deadzone: gentle repel to prevent clumping
              p.vx -= nx * C.attractForce * 0.5;
              p.vy -= ny * C.attractForce * 0.5;
            }

            // swirl — always active, creates orbiting
            p.vx += (-ny) * C.swirlForce * fall * dt;
            p.vy += ( nx) * C.swirlForce * fall * dt;
          }
        }

        // ── friction + integrate ──
        p.vx *= C.friction;
        p.vy *= C.friction;
        p.x  += p.vx;
        p.y  += p.vy;

        // ── wrap ──
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
      ctx.globalCompositeOperation = 'screen';
      ctx.lineWidth = C.lineWidth * dpr;

      for (let i = 0; i < particles.length; i++) {
        const a  = particles[i];
        const ax = a.x;
        const ay = a.y + a.springOff;

        if (ax < -lr || ax > W + lr || ay < -lr || ay > H + lr) continue;
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

          const dist = Math.sqrt(d2);
          const t    = 1 - dist / lr;
          let alpha  = t * t * C.lineOpacity;

          if (a.burst && a.burstAge < 1) alpha *= a.burstAge;
          if (b.burst && b.burstAge < 1) alpha *= b.burstAge;

          // life-based fade for lines
          const ageA = ts / 1000 - a.bornAt;
          const ageB = ts / 1000 - b.bornAt;
          if (ageA < C.fadeInSec) alpha *= ageA / C.fadeInSec;
          if (ageB < C.fadeInSec) alpha *= ageB / C.fadeInSec;
          const leftA = a.life - ageA;
          const leftB = b.life - ageB;
          if (leftA < C.fadeOutSec) alpha *= leftA / C.fadeOutSec;
          if (leftB < C.fadeOutSec) alpha *= leftB / C.fadeOutSec;

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
      const now = ts / 1000;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p  = particles[i];
        const age = now - p.bornAt;

        // respawn dead particles (fully faded out)
        if (age >= p.life) {
          const fresh = makeParticle();
          fresh.bornAt = now;  // fresh fade-in starts now
          particles[i] = fresh;
          continue;
        }

        const px = p.x;
        const py = p.y + p.springOff;

        if (px < -p.size || px > W + p.size ||
            py < -p.size || py > H + p.size) continue;

        let alpha = p.opacity;

        // fade-in at birth
        if (age < C.fadeInSec) {
          alpha *= age / C.fadeInSec;
        }

        // fade-out before death
        const timeLeft = p.life - age;
        if (timeLeft < C.fadeOutSec) {
          alpha *= timeLeft / C.fadeOutSec;
        }

        // burst fade-in
        if (p.burst && p.burstAge < 0.1) alpha *= p.burstAge / 0.1;

        if (alpha < 0.002) continue;

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, TAU);
        ctx.fillStyle = rgba(alpha);
        ctx.fill();
      }
    }

    frameId = requestAnimationFrame(frame);
    console.log('✦ particles v2.2 ·', location.pathname);
  }

  // ════════════════════════════════════
  //  CLEANUP & NAV
  // ════════════════════════════════════
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
  }

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
