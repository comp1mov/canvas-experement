<script>
(() => {
  if (window.__particleSystemActive) return;
  window.__particleSystemActive = true;

  // ===== CONFIG =====
  const CONFIG = {
    // Количество и масштаб
    densityByArea: true,
    numParticles: 220,
    densityK: 0.00012,
    pixelRatioClamp: 1.5,

    // Размер и визуал
    sizeMin: 0.3,
    sizeMax: 1.5,
    baseColor: [255, 255, 255],
    particleBlend: 'difference',
    linkLines: true,
    connectionDist: 120,
    lineOpacity: 0.85,
    lineWidth: 0.4,

    // Контур точки
    particleStrokeBase: 1.5,
    particleStrokePeak: 120.0,
    particleStrokeEnd: 0.0,

    // Жизненный цикл
    lifeMean: 60.0,
    lifeJitter: 4.0,
    fadeInSec: 3.0,
    fadeOutSec: 3.0,
    globalOpacity: 0.95,
    minAlpha: 1, // 1/255

    // Динамика
    friction: 0.95,          // 0.98-0.995 более вязко, 0.997-0.999 более инерционно
    baseReturn: 0.000002,
    jitterAmp: 0.30,
    jitterFreq: 0.8,

    // Скролл-импульс
    scrollKickStrength: 0.1, // 0.2-0.6 сила пинка против скролла
    scrollKickHalflife: 0.5, // сек, за сколько ослабевает вдвое
    // старый параллакс отключаем
    useParallax: false,

    // Мышь/тач
    mouseAttractRadius: 760,
    mouseAttractForce: 0.04,
    mouseSwirlStrength: 2.0,
    mouseSwirlFalloff: 1.0,
    mouseTrailHalflife: 5.0,

    // Взрывная система - 3 фазы
    prePullSec: 1,          // подтяжка к центру
    burstLife: 6.2,           // длительность активного разлёта
    explodeTimeJitter: .85,  // +/-25% к длительности
    clickRadius: 100,
    explosionPower: 20,       // импульс на старте
    explodeGrowMul: 160.0,    // пик масштабирования радиуса
    respawnDelay: 0.02,

    // Нойз-дрейф во время разлёта
    explodeNoiseHz: 0.08,
    explodeNoiseAmp: 20.0,    // px/сек
    explodeNoiseSmooth: 0.93,

    // Во взрыве альфа держим на пике
    explodeAlphaBoost: 1.0,

    // FPS
    capFPS: 60
  };

  // ===== Canvas =====
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  document.body.appendChild(canvas);
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: 0,
    width: '100%',
    height: '100%',
    zIndex: '-1',
    pointerEvents: 'none',
    background: 'transparent'
  });

  let dpr = 1, w = 0, h = 0;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, CONFIG.pixelRatioClamp);
    w = Math.floor(window.innerWidth * dpr);
    h = Math.floor(window.innerHeight * dpr);
    canvas.width = w;
    canvas.height = h;
  }
  resize();
  addEventListener('resize', resize, { passive: true });

  // ===== Utils =====
  const rand = Math.random, TAU = Math.PI * 2;
  const mix = (a, b, t) => a + (b - a) * t;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const nowSec = () => performance.now() / 1000;
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const easeInOutQuad = t => (t < 0.5) ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;

  // ===== Particles =====
  let count = CONFIG.numParticles;
  if (CONFIG.densityByArea) {
    count = Math.max(80, Math.floor(innerWidth * innerHeight * CONFIG.densityK));
  }

  const particles = [];
  function makeParticle() {
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

      // состояния взрыва
      state: 0,                 // 0 - норм, 1 - prePull, 2 - burst
      tapX: 0, tapY: 0,
      preStart: 0,
      burstStart: 0,
      burstDur: CONFIG.burstLife,

      // семена нойза
      nSeedX: rand() * 1000,
      nSeedY: rand() * 1000,
      nPhaseX: 0,
      nPhaseY: 0,
      nVX: 0,
      nVY: 0
    };
  }
  for (let i = 0; i < count; i++) particles.push(makeParticle());

  // ===== Pointer unified (mouse + touch) =====
  const pointer = { x: w*0.5, y: h*0.5, vx:0, vy:0, tPrev: nowSec(), down:false };
  function pageToCanvas(px, py) { return [px * dpr, py * dpr]; }

  function onPointerMove(e) {
    const t = nowSec();
    const dt = Math.max(1/120, t - pointer.tPrev);
    const [mx, my] = pageToCanvas(e.clientX, e.clientY);
    const vx = (mx - pointer.x) / dt;
    const vy = (my - pointer.y) / dt;
    const k = Math.pow(0.5, dt / CONFIG.mouseTrailHalflife);
    pointer.vx = pointer.vx * k + vx * (1 - k);
    pointer.vy = pointer.vy * k + vy * (1 - k);
    pointer.x = mx; pointer.y = my; pointer.tPrev = t;
  }

  function triggerTapSequence(cx, cy) {
    const r = CONFIG.clickRadius * dpr, r2 = r*r;
    const tnow = nowSec();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const dx = p.x - cx, dy = p.y - cy;
      const d2 = dx*dx + dy*dy;
      if (d2 < r2) {
        // 1) pre-pull
        p.state = 1;
        p.tapX = cx; p.tapY = cy;
        p.preStart = tnow;

        // индивидуальная длительность разлёта
        const j = (rand()*2 - 1) * CONFIG.explodeTimeJitter;
        p.burstDur = Math.max(0.4, CONFIG.burstLife * (1 + j));

        // начальный импульс будем давать в момент старта burst
      }
    }
  }

  addEventListener('pointermove', onPointerMove, { passive: true });
  addEventListener('pointerdown', e => {
    pointer.down = true;
    const [cx, cy] = pageToCanvas(e.clientX, e.clientY);
    triggerTapSequence(cx, cy);
  }, { passive: true });
  addEventListener('pointerup', e => {
    pointer.down = false;
    // финальный щелчок не обязателен - взрыв стартует после prePull
  }, { passive: true });
  // На случай клика по ссылкам - тоже триггер
  addEventListener('click', e => {
    const [cx, cy] = pageToCanvas(e.clientX, e.clientY);
    triggerTapSequence(cx, cy);
  }, { passive: true });

  // ===== Scroll kick =====
  let lastScrollY = scrollY;
  let scrollKickY = 0; // скорость от скролла
  addEventListener('scroll', () => {
    const dy = scrollY - lastScrollY;
    lastScrollY = scrollY;
    // пинок в противоположную сторону
    scrollKickY += -dy * CONFIG.scrollKickStrength * dpr;
  }, { passive: true });

  // ===== Loop =====
  let acc = 0, prevT = performance.now();
  const frameInterval = CONFIG.capFPS ? 1000 / CONFIG.capFPS : 0;
  const baseColor = CONFIG.baseColor;

  function step() {
    const tMs = performance.now();
    const dtMs = tMs - prevT;
    prevT = tMs;

    if (frameInterval) {
      acc += dtMs;
      if (acc < frameInterval) { requestAnimationFrame(step); return; }
      acc = 0;
    }
    const t = nowSec();
    const dt = Math.min(0.05, dtMs / 1000);

    // затухание скролл-пинка
    const kKick = Math.pow(0.5, dt / CONFIG.scrollKickHalflife);
    scrollKickY *= kKick;

    // очистка
    ctx.setTransform(1,0,0,1,0,0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);

    // blend для точек
    ctx.globalCompositeOperation = CONFIG.particleBlend;

    const attR = CONFIG.mouseAttractRadius * dpr;
    const attR2 = attR * attR;

    for (let i = 0; i < particles.length; i++) {
      let p = particles[i];

      // жизнь и базовый fade
      let age = t - p.born;
      if (p.state === 0 && age >= p.life) {
        // мягкий респавн
        const delay = CONFIG.respawnDelay;
        particles[i] = p = makeParticle();
        p.born = t - rand() * delay;
        age = t - p.born;
      }

      const aIn = clamp(age / CONFIG.fadeInSec, 0, 1);
      const aOut = clamp((p.life - age) / CONFIG.fadeOutSec, 0, 1);
      let alpha = Math.min(aIn, aOut) * CONFIG.globalOpacity;
      alpha = Math.max(alpha, CONFIG.minAlpha / 255);

      // мышь - вихрь и притяжение при удержании
      const dxm = pointer.x - p.x;
      const dym = pointer.y - p.y;
      const d2 = dxm*dxm + dym*dym;
      if (pointer.down && d2 < attR2 && p.state === 0) {
        const d = Math.sqrt(d2) || 1;
        const fall = 1 - d / attR;
        const f = CONFIG.mouseAttractForce * fall;
        p.vx += (dxm / d) * f;
        p.vy += (dym / d) * f;
      }
      if (d2 < (attR2 * 2.25)) {
        const d = Math.sqrt(d2) || 1;
        const fall = Math.pow(1 - clamp(d / (attR * 1.5), 0, 1), CONFIG.mouseSwirlFalloff);
        const mv = Math.hypot(pointer.vx, pointer.vy);
        const swirl = CONFIG.mouseSwirlStrength * fall * (mv / 2000);
        p.vx += (-dym / d) * swirl;
        p.vy += ( dxm / d) * swirl;
      }

      // возврат к базовой точке - лёгкая пружина
      // параллакс отключён, работает только scrollKick
      p.vy += scrollKickY * 0.001; // распределяем пинок понемногу

      p.vx += (p.bx0 - p.x) * CONFIG.baseReturn;
      p.vy += (p.by0 - p.y) * CONFIG.baseReturn;

      // джиттер
      p.pulse += CONFIG.jitterFreq * 0.016;
      p.vx += Math.sin(p.pulse + i) * CONFIG.jitterAmp * 0.02;
      p.vy += Math.cos(p.pulse * 1.23 + i) * CONFIG.jitterAmp * 0.02;

      // --- Состояния взрыва ---
      let sizeNow = p.size;
      let strokeW = CONFIG.particleStrokeBase * dpr;

      if (p.state === 1) {
        // prePull - плавная подтяжка к центру
        const k = clamp((t - p.preStart) / CONFIG.prePullSec, 0, 1);
        const kk = easeOutCubic(k);
        const dx = p.tapX - p.x;
        const dy = p.tapY - p.y;
        p.vx += dx * 0.015 * (1 - k);
        p.vy += dy * 0.015 * (1 - k);
        strokeW = mix(CONFIG.particleStrokeBase, CONFIG.particleStrokeBase * 2, kk) * dpr;

        if (k >= 1) {
          // старт burst
          p.state = 2;
          p.burstStart = t;

          // стартовый импульс наружу
          const dx0 = p.x - p.tapX, dy0 = p.y - p.tapY;
          const d0 = Math.hypot(dx0, dy0) || 1;
          const outx = dx0 / d0, outy = dy0 / d0;
          const power = CONFIG.explosionPower;
          p.vx += outx * power;
          p.vy += outy * power;

          // сброс фаз нойза
          p.nPhaseX = 0; p.nPhaseY = 0;
        }
      } else if (p.state === 2) {
        // burst - разлёт с нойз-дрифтом, рост -> сжатие
        const k = clamp((t - p.burstStart) / p.burstDur, 0, 1);

        // форма радиуса - колокол: растём до середины, затем возвращаемся к 1
        const grow = (k <= 0.5)
          ? mix(1, CONFIG.explodeGrowMul, easeInOutQuad(k / 0.5))
          : mix(CONFIG.explodeGrowMul, 1, easeInOutQuad((k - 0.5) / 0.5));
        sizeNow = p.size * grow;

        // альфа держим в пике
        alpha = CONFIG.explodeAlphaBoost;

        // обводка: пик на середине, к концу - к базе
        if (k < 0.5) {
          strokeW = mix(CONFIG.particleStrokeBase, CONFIG.particleStrokePeak, k / 0.5) * dpr;
        } else {
          strokeW = mix(CONFIG.particleStrokePeak, CONFIG.particleStrokeEnd, (k - 0.5) / 0.5) * dpr;
        }

        // плавный нойз-ветер
        const twoPi = TAU;
        p.nPhaseX += CONFIG.explodeNoiseHz * twoPi * dt;
        p.nPhaseY += CONFIG.explodeNoiseHz * twoPi * dt;
        const nxRaw = Math.sin(p.nSeedX + p.nPhaseX);
        const nyRaw = Math.sin(p.nSeedY + p.nPhaseY * 0.87);
        const smooth = clamp(CONFIG.explodeNoiseSmooth, 0, 0.999);
        p.nVX = p.nVX * smooth + nxRaw * (1 - smooth);
        p.nVY = p.nVY * smooth + nyRaw * (1 - smooth);
        p.vx += p.nVX * CONFIG.explodeNoiseAmp * dt;
        p.vy += p.nVY * CONFIG.explodeNoiseAmp * dt;

        if (k >= 1) {
          // завершаем - частица становится обычной в новом месте
          p.state = 0;
          // чуть сдвинем якорь, чтобы шлейфы не повторялись
          p.bx0 = p.x;
          p.by0 = p.y;
        }
      }

      // интеграция и трение
      p.vx *= CONFIG.friction;
      p.vy *= CONFIG.friction;
      p.x += p.vx;
      p.y += p.vy;

      // рендер контура
      ctx.beginPath();
      ctx.arc(p.x, p.y, sizeNow, 0, TAU);
      ctx.strokeStyle = `rgba(${baseColor[0]},${baseColor[1]},${baseColor[2]},${alpha})`;
      ctx.lineWidth = strokeW;
      ctx.stroke();
    }

    // линии связей
    if (CONFIG.linkLines) {
      ctx.globalCompositeOperation = 'screen';
      ctx.lineWidth = CONFIG.lineWidth * dpr;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = q.x - p.x, dy = q.y - p.y;
          const d = Math.hypot(dx, dy);
          if (d < CONFIG.connectionDist * dpr) {
            const a = (1 - d / (CONFIG.connectionDist * dpr)) * CONFIG.lineOpacity;
            ctx.strokeStyle = `rgba(255,255,255,${a})`;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
    }

    requestAnimationFrame(step);
  }
  step();
})();
</script>

