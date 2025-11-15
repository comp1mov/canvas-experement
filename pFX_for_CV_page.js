(() => {
  'use strict';
  
  // Глобальные переменные для всего скрипта
  let canvas, ctx, dpr, w, h;
  let particles = [];
  let pointer = {};
  let isActive = false;
  let stopLoop = false;
  let cleanup, resize, onPointerMove, triggerTapSequence;
  
  // === СПИСОК РАЗРЕШЁННЫХ СТРАНИЦ ===
  const allowedPages = [
    'grisha-tsvetkov.com/cv',
    'grisha-tsvetkov.com/contacts',
    'grisha-tsvetkov.com/portfolio'
  ];
  
  // Функция проверки
  function isOnAllowedPage() {
    return allowedPages.some(page => window.location.href.includes(page));
  }
  
  // === ДЕТЕКТ МОБИЛЬНЫХ УСТРОЙСТВ ===
  function isMobileDevice() {
    // iOS/iPadOS/Android detection
    const ua = navigator.userAgent || '';
    const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
    const isTouchOnly = matchMedia('(pointer: coarse)').matches;
    return isMobile || isTouchOnly;
  }
  
  // Функция инициализации
  function initParticles() {
    // Проверяем: уже запущены или не на той странице
    if (window.__particleSystemActive) return;
    if (!isOnAllowedPage()) return;
    
    window.__particleSystemActive = true;
    isActive = true;
    stopLoop = false;
    console.log('Particles started on:', window.location.href);

  // =============== CONFIG ===============
  const CONFIG = {
    // --- количество частиц ---
    densityByArea: true,
    numParticles: 190,
    densityK: 0.00009,
    pixelRatioClamp: 1,

    // --- геометрия частицы ---
    sizeMin: 0.3,
    sizeMax: 1.5,
    baseColor: [255, 255, 255],
    particleBlend: 'difference',

    // --- stroke частицы ---
    particleStrokeBase: 1.5,
    particleStrokePeak: 200.0,
    particleStrokeEnd: 0.1,

    // --- жизненный цикл и прозрачность ---
    lifeMean: 60.0,
    lifeJitter: 4.0,
    fadeInSec: 3.0,
    fadeOutSec: 3.0,
    globalOpacity: 0.95,
    minAlpha: 1,

    // --- базовая динамика поля ---
    friction: 0.98,
    baseReturn: 0.000005,
    jitterAmp: 0.12,
    jitterFreq: 0.1,
    
    // === НОВОЕ: Постоянный ветер вверх с параллакс-эффектом ===
    constantWindY: -0.005,               // базовая сила ветра (отрицательное = вверх)
    windParallaxMultiplier: 1.5,       // множитель для дальних слоёв
    windAffectedThreshold: 0.3,        // 0.6 = нижние 60% частиц не двигаются (диапазон 0.0-1.0)



    // --- влияние указателя ---
    pointerInfluenceRadius: 500,
    enablePointerSwirl: true,
    pointerSwirlStrength: 1.0,
    pointerSwirlFalloffExp: 3.0,
    enablePointerAttraction: true,
    pointerAttractionStrength: 0.055,
    enablePointerNoise: true,
    pointerNoiseAmp: 4.0,
    pointerNoiseHz: 0.2,
    pointerNoiseSmooth: 0.9,

    // --- клик: pull -> burst ---
    clickAffectsAll: false,
    clickRadius: 150,
    
    // === НОВОЕ: Слабое притяжение вместо полного стягивания ===
    prePullSec: 1.4,           // длительность фазы притяжения (0 = мгновенный burst)
    pullStrength: 0.9,         // сила притяжения к точке клика (0.9 = 90% расстояния)
    pullGrowFactor: 1,
    
    burstLife: 3.8,
    explodeTimeJitter: 0.35,
    explosionPower: 40,
    explosionPowerJitter: 0.2,
    explosionAngleJitter: 0.25,
    frictionBurst: 0.8,
    explodeGrowMul: 100.0,
    explodeNoiseHz: 0.02,
    explodeNoiseAmp: 152.0,
    explodeNoiseSmooth: 0.99,
    explodeAlphaBoost: 1.0,
    explodeStartJitterFramesMin: 1,
    explodeStartJitterFramesMax: 10,

    // --- линии между точками ---
    linkLines: true,
    lineComposite: 'screen',
    lineMode: 'tiers',
    connectionDist: 160,
    maxEdgesPerNode: 2,
    shortRadius: 50,
    midRadius: 680,
    longRadius: 1820,
    shortCount: 3,
    midCount: 0,
    longCount: 0,
    lineWidthPx: 0.4,
    lineOpacity: 0.6,
    lineColorA: [255,255,255],
    lineColorB: [200,200,200],
    lineGradientMode: 'autoCenter',
    lineGradientCenter: 'screen',
    lineGradientInvert: true,
    lineFadeDistPx: 30,

    // --- кривые от указателя ---
    pointerCurves: true,
    pointerCurveComposite: 'screen',
    pointerCurveCount: 30,
    pointerCurveMaxDist: 260,
    pointerCurveBend: 0,
    pointerCurveWidthPx: 3,
    pointerCurveOpacity: 0.85,
    pointerCurveColorA: [255,255,255],
    pointerCurveColorB: [0,0,0],
    pointerCurveInvertByDistance: true,

    // --- кадровая частота ---
    capFPS: 60,

    // ===== параллакс слоя =====
    parallaxEnable: true,
    parallaxRangeMin: 0.01,
    parallaxRangeMax: 0.25,
    parallaxShuffle: 0.25,
    parallaxStrengthY: 0.5,
    parallaxStrengthX: 0.0,
    parallaxStiffness: 0.0,
    parallaxDamping: 2.4,
    parallaxVelGain: 3.0,
    parallaxMaxScrollVel: 4000,
    parallaxMaxLayerVel: 2000,
    parallaxMaxOffset: 2000,

    scrollRootSelector: '',
    canvasBlendMode: 'difference',
    canvasOpacity: 1
  };

    // =============== Canvas ===============
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d', { alpha: true });
    document.body.appendChild(canvas);
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: 0,
      width: '100%',
      height: '100%',
      zIndex: '9999',
      pointerEvents: 'none',
      background: 'transparent',
      mixBlendMode: CONFIG.canvasBlendMode,
      opacity: '0',
      transition: 'opacity 1s ease-in-out'
    });
    
    // === НОВОЕ: Fade in при загрузке ===
    setTimeout(() => {
      canvas.style.opacity = String(CONFIG.canvasOpacity);
    }, 50);

    dpr = 1; w = 0; h = 0;
    resize = function() {
      dpr = Math.min(window.devicePixelRatio || 1, CONFIG.pixelRatioClamp);
      w = Math.floor(window.innerWidth * dpr);
      h = Math.floor(window.innerHeight * dpr);
      canvas.width = w;
      canvas.height = h;
    };
    resize();
    addEventListener('resize', resize, { passive: true });

    // =============== Utils ===============
    const rand = Math.random, TAU = Math.PI * 2;
    const mix = (a, b, t) => a + (b - a) * t;
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
    const nowSec = () => performance.now() / 1000;
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
    const easeInOutQuad = t => (t < 0.5) ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;
    const rgbaArr = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;

  // =============== Scroll root autodetect ===============
  let scrollRoot = null;
  let scrollRootIsWindow = true;

  function resolveInitialScrollRoot() {
    if (CONFIG.scrollRootSelector) {
      const el = document.querySelector(CONFIG.scrollRootSelector);
      if (el) { scrollRoot = el; scrollRootIsWindow = false; return; }
    }
    scrollRoot = document.scrollingElement || document.documentElement || document.body || window;
    scrollRootIsWindow = (scrollRoot === document.scrollingElement) || (scrollRoot === document.documentElement) || (scrollRoot === document.body) || (scrollRoot === window);
  }
  resolveInitialScrollRoot();

  addEventListener('scroll', (e) => {
    if (!scrollRoot || scrollRootIsWindow) {
      const t = e.target;
      if (t && t !== document && t !== window && t.scrollHeight && (t.scrollHeight - t.clientHeight > 1)) {
        scrollRoot = t;
        scrollRootIsWindow = false;
      }
    }
  }, { capture: true, passive: true });

  function getScrollXY() {
    if (!scrollRoot || scrollRootIsWindow) {
      const x = window.pageXOffset ?? window.scrollX ?? 0;
      const y = window.pageYOffset ?? window.scrollY ?? 0;
      return [x, y];
    } else {
      return [scrollRoot.scrollLeft, scrollRoot.scrollTop];
    }
  }

  // =============== Particles ===============
  let count = CONFIG.numParticles;
  if (CONFIG.densityByArea) count = Math.max(80, Math.floor(innerWidth * innerHeight * CONFIG.densityK));

  function buildParallaxArray(n) {
    const arr = new Array(n);
    const min = CONFIG.parallaxRangeMin;
    const max = CONFIG.parallaxRangeMax;
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : 0;
      let val = mix(min, max, t);
      val += (rand() - 0.5) * (max - min) * CONFIG.parallaxShuffle;
      arr[i] = clamp(val, min, max);
    }
    for (let i = n - 1; i > 0; i--) {
      const j = (rand() * (i + 1)) | 0;
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }
  const parArray = buildParallaxArray(count);

  const particles = [];
  function makeParticle(i = (particles.length % count)) {
    const bx0 = rand() * w;
    const by0 = rand() * h;
    const life = Math.max(1.0, CONFIG.lifeMean + (rand() * 2 - 1) * CONFIG.lifeJitter);
    const t0 = nowSec() - rand() * life;
    return {
      x: bx0, y: by0,
      bx0, by0,
      vx: (rand() - 0.5) * 0.3,
      vy: (rand() - 0.5) * 0.3,
      size: mix(CONFIG.sizeMin, CONFIG.sizeMax, rand()),
      born: t0,
      life,
      pulse: rand() * TAU,
      mode: 0,
      tapX: 0, tapY: 0,
      pullStart: 0,
      pullFromX: 0, pullFromY: 0,
      burstStart: 0,
      burstDelay: 0,
      burstDur: CONFIG.burstLife,
      seedX: rand() * 1000,
      seedY: rand() * 1000,
      pnPhaseX: rand() * 1000, pnPhaseY: rand() * 1000,
      pnVX: 0, pnVY: 0,
      bnPhaseX: 0, bnPhaseY: 0,
      bnVX: 0, bnVY: 0,
      par: parArray[i] || CONFIG.parallaxRangeMin
    };
  }
  for (let i = 0; i < count; i++) particles.push(makeParticle(i));

  // =============== Pointer ===============
  const pointer = { x: w*0.5, y: h*0.5, vx:0, vy:0, tPrev: nowSec() };
  function pageToCanvas(px, py) { return [px * dpr, py * dpr]; }

  function onPointerMove(e) {
    const t = nowSec();
    const dt = Math.max(1/120, t - pointer.tPrev);
    const [mx, my] = pageToCanvas(e.clientX, e.clientY);
    const vx = (mx - pointer.x) / dt;
    const vy = (my - pointer.y) / dt;
    const k = Math.pow(0.5, dt / 5.0);
    pointer.vx = pointer.vx * k + vx * (1 - k);
    pointer.vy = pointer.vy * k + vy * (1 - k);
    pointer.x = mx; pointer.y = my; pointer.tPrev = t;
  }

  function triggerTapSequence(screenX, screenY) {
    const tnow = nowSec();
    const r = CONFIG.clickRadius * dpr;
    const r2 = r*r;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      if (!CONFIG.clickAffectsAll) {
        const drawX = p.x + parOffX * p.par;
        const drawY = p.y + parOffY * p.par;
        const dxS = drawX - screenX, dyS = drawY - screenY;
        if (dxS*dxS + dyS*dyS > r2) continue;
      }

      p.tapX = screenX - parOffX * p.par;
      p.tapY = screenY - parOffY * p.par;
      p.mode = 1;
      p.pullStart = tnow;
      p.pullFromX = p.x; p.pullFromY = p.y;

      const j = (Math.random()*2 - 1) * CONFIG.explodeTimeJitter;
      p.burstDur = Math.max(0.35, CONFIG.burstLife * (1 + j));

      const fps = CONFIG.capFPS || 60;
      const frames = Math.floor(mix(CONFIG.explodeStartJitterFramesMin, CONFIG.explodeStartJitterFramesMax, rand()));
      p.burstDelay = frames / fps;

      p.vx = 0; p.vy = 0;
    }
  }

  // === DOUBLE TAP DETECTION ДЛЯ МОБИЛЬНЫХ ===
  let lastTapTime = 0;
  const DOUBLE_TAP_DELAY = 300; // мс между тапами
  const isMobile = isMobileDevice();

  addEventListener('pointermove', onPointerMove, { passive: true });
  
  addEventListener('pointerdown', e => {
    const [cx, cy] = pageToCanvas(e.clientX, e.clientY);
    
    if (isMobile) {
      // На мобильных - только double tap
      const now = Date.now();
      if (now - lastTapTime < DOUBLE_TAP_DELAY) {
        triggerTapSequence(cx, cy);
        lastTapTime = 0; // сбрасываем после двойного тапа
      } else {
        lastTapTime = now;
      }
    } else {
      // На десктопе - обычный клик
      triggerTapSequence(cx, cy);
    }
  }, { passive: true });
  
  addEventListener('click', e => {
    if (isMobile) return; // на мобильных игнорируем click, используем только pointerdown
    const [cx, cy] = pageToCanvas(e.clientX, e.clientY);
    triggerTapSequence(cx, cy);
  }, { passive: true });

// =============== Parallax spring state ===============
  let [prevScrollX, prevScrollY] = getScrollXY();
  let parOffX = 0, parOffY = 0;
  let parVelX = 0, parVelY = 0;

  // =============== Render loop ===============
  let acc = 0, prevT = performance.now();
  const frameInterval = CONFIG.capFPS ? 1000 / CONFIG.capFPS : 0;
  const baseColor = CONFIG.baseColor;

  function step() {
    if (stopLoop) return;
    const tMs = performance.now();
    const dtMs = tMs - prevT;
    prevT = tMs;

    if (frameInterval) {
      acc += dtMs;
      if (acc < frameInterval) { requestAnimationFrame(step); return; }
      acc = 0;
    }
    const t = nowSec();
    const dt = Math.max(0.001, Math.min(0.05, dtMs / 1000));

    const [curSX, curSY] = getScrollXY();
    let vScrollX = (curSX - prevScrollX) / dt;
    let vScrollY = (curSY - prevScrollY) / dt;
    prevScrollX = curSX; prevScrollY = curSY;

    const vmax = CONFIG.parallaxMaxScrollVel;
    if (isFinite(vmax) && vmax > 0) {
      vScrollX = clamp(vScrollX, -vmax, vmax);
      vScrollY = clamp(vScrollY, -vmax, vmax);
    }

    const ax = -(vScrollX * CONFIG.parallaxStrengthX) * CONFIG.parallaxVelGain;
    const ay = -(vScrollY * CONFIG.parallaxStrengthY) * CONFIG.parallaxVelGain;

    parVelX += (ax - CONFIG.parallaxStiffness * parOffX - CONFIG.parallaxDamping * parVelX) * dt;
    parVelY += (ay - CONFIG.parallaxStiffness * parOffY - CONFIG.parallaxDamping * parVelY) * dt;

    const vLim = CONFIG.parallaxMaxLayerVel;
    if (isFinite(vLim) && vLim > 0) {
      parVelX = clamp(parVelX, -vLim, vLim);
      parVelY = clamp(parVelY, -vLim, vLim);
    }

    parOffX += parVelX * dt;
    parOffY += parVelY * dt;

    const xLim = CONFIG.parallaxMaxOffset;
    if (isFinite(xLim) && xLim > 0) {
      parOffX = clamp(parOffX, -xLim, xLim);
      parOffY = clamp(parOffY, -xLim, xLim);
    }

    ctx.setTransform(1,0,0,1,0,0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);

    ctx.globalCompositeOperation = CONFIG.particleBlend;

    for (let i = 0; i < particles.length; i++) {
      let p = particles[i];

      let age = t - p.born;
      if (p.mode === 0 && age >= p.life) {
        const delay = 0.02;
        particles[i] = p = makeParticle(i);
        p.born = t - rand() * delay;
        age = t - p.born;
      }

      const aIn = clamp(age / CONFIG.fadeInSec, 0, 1);
      const aOut = clamp((p.life - age) / CONFIG.fadeOutSec, 0, 1);
      let alpha = Math.min(aIn, aOut) * CONFIG.globalOpacity;
      alpha = Math.max(alpha, CONFIG.minAlpha / 255);

      let sizeNow = p.size;
      let strokeW = CONFIG.particleStrokeBase * dpr;

      if (p.mode === 0) {
        p.vx += (p.bx0 - p.x) * CONFIG.baseReturn;
        p.vy += (p.by0 - p.y) * CONFIG.baseReturn;

        // === НОВОЕ: Постоянный ветер вверх с параллакс-эффектом ===
        // windAffectedThreshold = 0.4 означает что 40% ближних частиц не двигаются
        if (CONFIG.constantWindY) {
          // Вычисляем граничное значение par (40% от диапазона)
          const parThreshold = CONFIG.parallaxRangeMin + (CONFIG.parallaxRangeMax - CONFIG.parallaxRangeMin) * CONFIG.windAffectedThreshold;
          
          if (p.par > parThreshold) {
            // Нормализуем par в диапазоне [parThreshold, max] -> [0, 1]
            const parNorm = (p.par - parThreshold) / (CONFIG.parallaxRangeMax - parThreshold);
            // Применяем ветер с нелинейным ростом (степень 1.5 для плавности)
            const windStrength = CONFIG.constantWindY * Math.pow(parNorm, 1.5) * CONFIG.windParallaxMultiplier;
            p.vy += windStrength;
          }
        }

        p.pulse += CONFIG.jitterFreq * 0.016;
        p.vx += Math.sin(p.pulse + i) * CONFIG.jitterAmp * 0.02;
        p.vy += Math.cos(p.pulse * 1.23 + i) * CONFIG.jitterAmp * 0.02;

        const dxm = pointer.x - (p.x + parOffX * p.par);
        const dym = pointer.y - (p.y + parOffY * p.par);
        const d2 = dxm*dxm + dym*dym;
        const prR = CONFIG.pointerInfluenceRadius * dpr;
        if (d2 < prR*prR) {
          const dlen = Math.sqrt(d2) || 1;
          const fall = Math.pow(1 - clamp(dlen / prR, 0, 1), CONFIG.pointerSwirlFalloffExp);
          const speed = Math.hypot(pointer.vx, pointer.vy) / 1000;

          if (CONFIG.enablePointerSwirl) {
            const swirl = CONFIG.pointerSwirlStrength * fall * speed;
            p.vx += (-dym / dlen) * swirl;
            p.vy += ( dxm / dlen) * swirl;
          }

          if (CONFIG.enablePointerAttraction) {
            const attract = CONFIG.pointerAttractionStrength * fall;
            p.vx += (dxm / dlen) * attract;
            p.vy += (dym / dlen) * attract;
          }

          if (CONFIG.enablePointerNoise) {
            const twoPi = TAU;
            p.pnPhaseX += CONFIG.pointerNoiseHz * twoPi * dt;
            p.pnPhaseY += CONFIG.pointerNoiseHz * twoPi * dt;
            const nxRaw = Math.sin(p.seedX + p.pnPhaseX);
            const nyRaw = Math.cos(p.seedY + p.pnPhaseY * 0.91);
            const sm = clamp(CONFIG.pointerNoiseSmooth, 0, 0.999);
            p.pnVX = p.pnVX * sm + nxRaw * (1 - sm);
            p.pnVY = p.pnVY * sm + nyRaw * (1 - sm);
            p.vx += p.pnVX * CONFIG.pointerNoiseAmp * fall * dt;
            p.vy += p.pnVY * CONFIG.pointerNoiseAmp * fall * dt;
          }
        }

        p.vx *= CONFIG.friction;
        p.vy *= CONFIG.friction;
        p.x += p.vx;
        p.y += p.vy;

      } else if (p.mode === 1) {
        // === НОВОЕ: Слабое притяжение вместо полного стягивания ===
        const k = clamp((t - p.pullStart) / CONFIG.prePullSec, 0, 1);
        const kk = easeOutCubic(k);
        
        // Притягиваем только на pullStrength% расстояния
        const targetX = mix(p.pullFromX, p.tapX, CONFIG.pullStrength);
        const targetY = mix(p.pullFromY, p.tapY, CONFIG.pullStrength);
        
        p.x = mix(p.pullFromX, targetX, kk);
        p.y = mix(p.pullFromY, targetY, kk);
        sizeNow = p.size * mix(1, CONFIG.pullGrowFactor, kk);
        p.vx = 0; p.vy = 0;

        if (k >= 1) {
          if (!p.__delayStamp) p.__delayStamp = t;
          if (t - p.__delayStamp >= p.burstDelay) {
            p.mode = 2;
            p.__delayStamp = 0;
            p.burstStart = t;

            const baseAng = Math.atan2(p.pullFromY - p.tapY, p.pullFromX - p.tapX);
            const ang = baseAng + (rand() - 0.5) * CONFIG.explosionAngleJitter;
            const powMul = 1 + (rand()*2 - 1) * CONFIG.explosionPowerJitter;
            p.vx = Math.cos(ang) * CONFIG.explosionPower * powMul;
            p.vy = Math.sin(ang) * CONFIG.explosionPower * powMul;

            p.bnPhaseX = 0; p.bnPhaseY = 0;
          }
        }

        alpha = CONFIG.explodeAlphaBoost;

      } else if (p.mode === 2) {
        const k = clamp((t - p.burstStart) / p.burstDur, 0, 1);

        const grow = (k <= 0.5)
          ? mix(CONFIG.pullGrowFactor, CONFIG.explodeGrowMul, easeInOutQuad(k / 0.5))
          : mix(CONFIG.explodeGrowMul, 1, easeInOutQuad((k - 0.5) / 0.5));
        sizeNow = p.size * grow;

        const twoPi = TAU;
        p.bnPhaseX += CONFIG.explodeNoiseHz * twoPi * dt;
        p.bnPhaseY += CONFIG.explodeNoiseHz * twoPi * dt;
        const nxRaw = Math.sin(p.seedX + p.bnPhaseX);
        const nyRaw = Math.sin(p.seedY + p.bnPhaseY * 0.87);
        const sm = clamp(CONFIG.explodeNoiseSmooth, 0, 0.999);
        p.bnVX = p.bnVX * sm + nxRaw * (1 - sm);
        p.bnVY = p.bnVY * sm + nyRaw * (1 - sm);
        p.vx += p.bnVX * CONFIG.explodeNoiseAmp * dt;
        p.vy += p.bnVY * CONFIG.explodeNoiseAmp * dt;

        p.vx *= CONFIG.frictionBurst;
        p.vy *= CONFIG.frictionBurst;
        p.x += p.vx;
        p.y += p.vy;

        if (k < 0.5) strokeW = mix(CONFIG.particleStrokeBase, CONFIG.particleStrokePeak, k / 0.5) * dpr;
        else          strokeW = mix(CONFIG.particleStrokePeak, CONFIG.particleStrokeEnd, (k - 0.5) / 0.5) * dpr;

        alpha = CONFIG.explodeAlphaBoost;

        if (k >= 1) {
          p.mode = 0;
          p.bx0 = p.x;
          p.by0 = p.y;
        }
      }

      const drawX = p.x + parOffX * p.par;
      const drawY = p.y + parOffY * p.par;

      ctx.beginPath();
      ctx.arc(drawX, drawY, sizeNow, 0, TAU);
      ctx.strokeStyle = rgbaArr(baseColor, alpha);
      ctx.lineWidth = strokeW;
      ctx.stroke();
    }

    // линии (сокращённый код для экономии места)
    if (CONFIG.linkLines) {
      ctx.globalCompositeOperation = CONFIG.lineComposite;
      const lw = CONFIG.lineWidthPx * dpr;
      let cx, cy;
      if (CONFIG.lineGradientCenter === 'pointer') { cx = pointer.x; cy = pointer.y; }
      else { cx = w * 0.5; cy = h * 0.5; }
      const fadeZone = Math.max(0, CONFIG.lineFadeDistPx) * dpr;
      function taperedWidthByDistance(d, maxD) {
        if (fadeZone <= 0) return lw;
        if (d <= maxD) return lw;
        if (d >= maxD + fadeZone) return 0;
        const t = 1 - (d - maxD) / fadeZone;
        return lw * t;
      }

      const Rshort = CONFIG.shortRadius * dpr;
      const Rmid = CONFIG.midRadius * dpr;
      const Rlong = CONFIG.longRadius * dpr;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const px = p.x + parOffX * p.par;
        const py = p.y + parOffY * p.par;
        const cand = [];
        for (let j = 0; j < particles.length; j++) {
          if (i === j) continue;
          const q = particles[j];
          const qx = q.x + parOffX * q.par;
          const qy = q.y + parOffY * q.par;
          const d = Math.hypot(qx - px, qy - py);
          if (d > 1 && d <= Rlong + fadeZone) cand.push({ qx, qy, d });
        }
        if (!cand.length) continue;
        const shortArr = [], midArr = [], longArr = [];
        for (let k = 0; k < cand.length; k++) {
          const c = cand[k];
          if (c.d <= Rshort + fadeZone) shortArr.push(c);
          else if (c.d <= Rmid + fadeZone) midArr.push(c);
          else if (c.d <= Rlong + fadeZone) longArr.push(c);
        }
        shortArr.sort((a,b)=>a.d-b.d);
        midArr.sort((a,b)=>a.d-b.d);
        longArr.sort((a,b)=>b.d-a.d);
        const pick = [];
        for (let s = 0; s < Math.min(CONFIG.shortCount, shortArr.length); s++) pick.push(shortArr[s]);
        for (let m = 0; m < Math.min(CONFIG.midCount, midArr.length); m++) pick.push(midArr[m]);
        for (let l = 0; l < Math.min(CONFIG.longCount, longArr.length); l++) pick.push(longArr[l]);
        for (let k = 0; k < pick.length; k++) {
          const { qx, qy, d } = pick[k];
          let basketR = Rshort;
          if (d > Rshort + fadeZone && d <= Rmid + fadeZone) basketR = Rmid;
          if (d > Rmid + fadeZone) basketR = Rlong;
          const norm = clamp(1 - d / (basketR + fadeZone), 0, 1);
          const a = norm * CONFIG.lineOpacity;
          let invert = CONFIG.lineGradientInvert;
          if (CONFIG.lineGradientMode === 'autoCenter') {
            const d1 = Math.hypot(px - cx, py - cy);
            const d2 = Math.hypot(qx - cx, qy - cy);
            invert = d1 > d2;
          }
          const wpx = taperedWidthByDistance(d, basketR);
          if (wpx > 0.001) {
            const grad = ctx.createLinearGradient(px, py, qx, qy);
            const colA = CONFIG.lineColorA, colB = CONFIG.lineColorB;
            if (!invert) { grad.addColorStop(0, rgbaArr(colA, a)); grad.addColorStop(1, rgbaArr(colB, a)); }
            else          { grad.addColorStop(0, rgbaArr(colB, a)); grad.addColorStop(1, rgbaArr(colA, a)); }
            ctx.strokeStyle = grad;
            ctx.lineWidth = Math.max(0.001, wpx);
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(qx, qy);
            ctx.stroke();
          }
        }
      }
    }

    // кривые к указателю
    if (CONFIG.pointerCurves) {
      ctx.globalCompositeOperation = CONFIG.pointerCurveComposite;
      const maxD = CONFIG.pointerCurveMaxDist * dpr;
      const wpx = CONFIG.pointerCurveWidthPx * dpr;
      const candidates = [];
      for (let i = 0; i < particles.length; i++) {
        const q = particles[i];
        const qx = q.x + parOffX * q.par;
        const qy = q.y + parOffY * q.par;
        const d = Math.hypot(qx - pointer.x, qy - pointer.y);
        if (d > 1 && d <= maxD) candidates.push({ qx, qy, d });
      }
      candidates.sort((a,b)=>a.d-b.d);
      const cnt = Math.min(CONFIG.pointerCurveCount, candidates.length);
      for (let k = 0; k < cnt; k++) {
        const { qx, qy, d } = candidates[k];
        const tNorm = clamp(1 - d / maxD, 0, 1);
        const alpha = tNorm * CONFIG.pointerCurveOpacity;
        let invert = false;
        if (CONFIG.pointerCurveInvertByDistance) {
          const cx = w * 0.5, cy = h * 0.5;
          const dP = Math.hypot(pointer.x - cx, pointer.y - cy);
          const dQ = Math.hypot(qx - cx, qy - cy);
          invert = dQ > dP;
        }
        const dx = qx - pointer.x, dy = qy - pointer.y;
        const dLen = Math.hypot(dx, dy) || 1;
        const nx = -dy / dLen, ny = dx / dLen;
        const cx1 = pointer.x + dx * 0.5 + nx * dLen * CONFIG.pointerCurveBend;
        const cy1 = pointer.y + dy * 0.5 + ny * dLen * CONFIG.pointerCurveBend;
        const grad = ctx.createLinearGradient(pointer.x, pointer.y, qx, qy);
        const colA = CONFIG.pointerCurveColorA, colB = CONFIG.pointerCurveColorB;
        if (!invert) { grad.addColorStop(0, rgbaArr(colA, alpha)); grad.addColorStop(1, rgbaArr(colB, alpha*0.95)); }
        else          { grad.addColorStop(0, rgbaArr(colB, alpha)); grad.addColorStop(1, rgbaArr(colA, alpha*0.95)); }
        ctx.strokeStyle = grad;
        ctx.lineWidth = Math.max(0.001, wpx);
        ctx.beginPath();
        ctx.moveTo(pointer.x, pointer.y);
        ctx.quadraticCurveTo(cx1, cy1, qx, qy);
        ctx.stroke();
      }
    }

    requestAnimationFrame(step);
  }
  
  step();
  }
  
  cleanup = function() {
    if (!isActive) return;
    isActive = false;
    window.__particleSystemActive = false;
    stopLoop = true;
    
    // === НОВОЕ: Fade out при выгрузке ===
    if (canvas && canvas.parentNode) {
      canvas.style.opacity = '0';
      setTimeout(() => {
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
      }, 1000);
    }
    
    console.log('Particles stopped');
  };
  
  initParticles();
  
  document.addEventListener('click', (e) => {
    if (e.target === canvas) return;
    setTimeout(() => {
      if (!isOnAllowedPage()) {
        cleanup();
      } else if (!window.__particleSystemActive) {
        initParticles();
      }
    }, 300);
  }, { capture: true });
  
  window.addEventListener('popstate', () => {
    setTimeout(() => {
      if (!isOnAllowedPage()) {
        cleanup();
      } else if (!window.__particleSystemActive) {
        initParticles();
      }
    }, 300);
  });
  
  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      setTimeout(() => {
        if (!isOnAllowedPage()) {
          cleanup();
        } else if (!window.__particleSystemActive) {
          initParticles();
        }
      }, 100);
    }
  }, 500);
  
})();
