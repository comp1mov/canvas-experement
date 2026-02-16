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
    // values written as: isPhone ? PHONE : DESKTOP
    const C = {
      count: Math.max(50, Math.floor(
        vw * innerHeight * (isPhone ? 0.00008 : 0.00011)
      )),

      heroNearCount:  isPhone ? 2 : 5,
      heroFarCount:   isPhone ? 4 : 10,

      parallaxStrength: isPhone ? 0.16 : 0.25,

      springStiffness:  isPhone ? 0.03 : 0.04,
      springDamping:    isPhone ? 0.88 : 0.85,
      springGain:       isPhone ? 1.2  : 1.8,
      springMaxVel:     3000,

      sizeMin:    isPhone ? 0.15 : 0.2,
      sizeMax:    isPhone ? 1.6  : 3.5,
      opacityMin: 0.03,
      opacityMax: 0.85,
      color: [255, 255, 255],

      driftAmp:  0.05,
      driftFreq: 0.2,
      friction:  0.965,

      mouseRadius:    isPhone ? 0 : 500,
      attractForce:   0.003,
      swirlForce:     0.25,
      swirlFalloff:   2.8,
      mouseDeadzone:  80,

      burstCountMin:  isPhone ? 5  : 8,
      burstCountMax:  isPhone ? 12 : 20,
      burstSpeedMin:  1.5,
      burstSpeedMax:  5.0,
      burstSettleSec: 2.5,

      lineRadius:     isPhone ? 70 : 110,
      lineMaxPerNode: 3,
      lineOpacity:    0.25,
      lineWidth:      0.7,
      lineBend:       0.12,

      maxParticles: 420,

      // ── lifetime & fade-out ──
      lifeMin:    30,     // minimum lifetime in seconds
      lifeMax:    55,     // maximum lifetime in seconds
      fadeOutSec: 3.0,    // seconds of smooth fade before death
      forcedFadeSec: 1.5, // fade when killed by overcrowding
      fadeInSec: 2.0,     // fade-in for new/respawned particles (not burst)

      blendMode: 'difference',
      dprClamp:  isPhone ? 1.5 : 2.0,
    };

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

    let prevScrollY = window.scrollY || 0;

    // ────────────── PARTICLE FACTORY ──────────────
    function sizeForDepth(d) {
      const t = d * d;
      return mix(C.sizeMin, C.sizeMax, t) * dpr;
    }

    function opacityForDepth(d) {
      return mix(C.opacityMin, C.opacityMax, d);
    }

    function makeParticle(depthOverride) {
      const depth = (depthOverride !== undefined)
        ? depthOverride
        : 0.1 + rand() * 0.8;

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
        bornAt: performance.now() / 1000,
        life:   mix(C.lifeMin, C.lifeMax, rand()),
        dying:  false,   // set true to trigger forced fade-out
        dyingAt: 0,      // timestamp when dying started
        hueOff: (rand() - 0.5) * 30,
        satOff: (rand() - 0.5) * 30,
        litOff: (rand() - 0.5) * 30,
      };
    }

    function makeBurstParticle(bx, by) {
      const depth = 0.15 + rand() * 0.7;
      const angle = rand() * TAU;
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
        bornAt: performance.now() / 1000,
        life:   mix(C.lifeMin, C.lifeMax, rand()),
        dying:  false,
        dyingAt: 0,
        hueOff: (rand() - 0.5) * 30,
        satOff: (rand() - 0.5) * 30,
        litOff: (rand() - 0.5) * 30,
      };
    }

    // ── populate ──
    particles = [];

    for (let i = 0; i < C.heroFarCount; i++) {
      const p = makeParticle(0.05 + rand() * 0.1);  // depth 0.05–0.15
      p.size    = (isPhone ? 0.3 : 0.5) * dpr;      // small but visible
      p.opacity = 0.06 + rand() * 0.04;              // very subtle
      p.bornAt -= rand() * p.life * 0.8;
      particles.push(p);
    }

    for (let i = 0; i < C.count; i++) {
      const p = makeParticle();
      p.bornAt -= rand() * p.life * 0.8;
      particles.push(p);
    }

    for (let i = 0; i < C.heroNearCount; i++) {
      const p = makeParticle(0.88 + rand() * 0.12);  // depth 0.88–1.0
      p.size    = mix(isPhone ? 2.5 : 4.0, isPhone ? 4.0 : 6.5, rand()) * dpr;
      p.opacity = 0.08 + rand() * 0.07;              // visible but not harsh
      p.bornAt -= rand() * p.life * 0.8;
      particles.push(p);
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

      const count = Math.floor(
        mix(C.burstCountMin, C.burstCountMax, rand())
      );

      // cap total particles — mark oldest as dying instead of instant delete
      let over = (particles.length + count) - C.maxParticles;
      if (over > 0) {
        let marked = 0;
        for (let i = 0; i < particles.length && marked < over; i++) {
          if (!particles[i].dying && particles[i].burstAge >= 1) {
            particles[i].dying = true;
            particles[i].dyingAt = performance.now() / 1000;
            marked++;
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

    // ────────────── COLOR HELPERS ──────────────
    // base white in HSL = (0, 0%, 100%)
    // per-particle offsets add subtle color variation
    function hsla(p, a) {
      const h = ((0 + p.hueOff) % 360 + 360) % 360;
      const s = clamp(0 + p.satOff, 0, 100);
      const l = clamp(100 + p.litOff, 0, 100);
      return `hsla(${h.toFixed(0)},${s.toFixed(0)}%,${l.toFixed(0)}%,${a < 0.001 ? 0 : a.toFixed(4)})`;
    }
    // plain white for lines (no per-particle tint)
    function rgba(a) {
      return `rgba(255,255,255,${a < 0.001 ? 0 : a.toFixed(4)})`;
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
      const dt  = Math.min(elapsed / 1000, 0.05);
      const now = ts / 1000;

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

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // ── check death ──
        const age = now - p.bornAt;

        // forced dying (overcrowding): remove after fade completes
        if (p.dying) {
          const dyingAge = now - p.dyingAt;
          if (dyingAge >= C.forcedFadeSec) {
            particles.splice(i, 1);
            continue;
          }
        }

        // natural death: respawn
        if (age >= p.life) {
          particles[i] = makeParticle();
          continue;
        }

        // ── parallax scroll ──
        const depthOffset = (p.depth - 0.5) * C.parallaxStrength;
        p.y -= sDelta * dpr * (1.0 + depthOffset);

        // ── spring bounce ──
        p.springVel += scrollVel * depthOffset * C.springGain * dt;
        p.springVel += -p.springOff * C.springStiffness;
        p.springVel *= C.springDamping;
        p.springOff += p.springVel * dt;
        p.springOff  = clamp(p.springOff, -H * 0.15, H * 0.15);

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

            if (dist > dead) {
              p.vx += nx * C.attractForce * fall;
              p.vy += ny * C.attractForce * fall;
            } else {
              p.vx -= nx * C.attractForce * 0.5;
              p.vy -= ny * C.attractForce * 0.5;
            }

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

        // fade multiplier for dying particle
        const ageA    = now - a.bornAt;
        const leftA   = a.life - ageA;
        const fadeA   = leftA < C.fadeOutSec ? leftA / C.fadeOutSec : 1;
        const dyFadeA = a.dying ? clamp(1 - (now - a.dyingAt) / C.forcedFadeSec, 0, 1) : 1;
        const inA = (!a.burst && ageA < C.fadeInSec) ? ageA / C.fadeInSec : 1;

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

          // fade lines with dying particles
          alpha *= fadeA * dyFadeA * inA;
          const ageB  = now - b.bornAt;
          const leftB = b.life - ageB;
          if (leftB < C.fadeOutSec) alpha *= leftB / C.fadeOutSec;
          if (b.dying) alpha *= clamp(1 - (now - b.dyingAt) / C.forcedFadeSec, 0, 1);
          if (!b.burst && ageB < C.fadeInSec) alpha *= ageB / C.fadeInSec;

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

        // burst fade-in (only for burst particles, instant appearance)
        if (p.burst && p.burstAge < 0.1) alpha *= p.burstAge / 0.1;

        // fade-in for normal (non-burst) particles
        if (!p.burst) {
          const age = now - p.bornAt;
          if (age < C.fadeInSec) alpha *= age / C.fadeInSec;
        }

        // smooth fade-out before death
        const timeLeft = p.life - (now - p.bornAt);
        if (timeLeft < C.fadeOutSec) {
          alpha *= clamp(timeLeft / C.fadeOutSec, 0, 1);
        }

        // forced fade-out (overcrowding)
        if (p.dying) {
          const dyingAge = now - p.dyingAt;
          alpha *= clamp(1 - dyingAge / C.forcedFadeSec, 0, 1);
        }

        if (alpha < 0.002) continue;

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, TAU);
        ctx.fillStyle = hsla(p, alpha);
        ctx.fill();
      }
    }

    frameId = requestAnimationFrame(frame);
    console.log('✦ particles v2.2 ·', location.pathname);
  }

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
