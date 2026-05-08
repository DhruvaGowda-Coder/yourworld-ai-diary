let particleRebuildTimer = null;

/* ── Performance detection for adaptive particle counts ── */
const _perfLevel = (() => {
  const nav = navigator;
  const cores = nav.hardwareConcurrency || 2;
  const mem = nav.deviceMemory || 4;
  if (cores <= 2 || mem <= 2) return 'low';
  if (cores <= 4 || mem <= 4) return 'mid';
  return 'high';
})();
const _particleScale = _perfLevel === 'low' ? 0.35 : (_perfLevel === 'mid' ? 0.65 : 1);

const particleConfig = {
  water: { count: Math.round(18 * _particleScale), minSize: 3, maxSize: 8, minDur: 8, maxDur: 16, drift: 90, spin: 90 },
  wind: { count: Math.round(18 * _particleScale), minSize: 1.6, maxSize: 4.2, minDur: 8, maxDur: 16, drift: 190, spin: 70 },
  earth: { count: Math.round(12 * _particleScale), minSize: 3, maxSize: 7, minDur: 10, maxDur: 18, drift: 80, spin: 40 },
  ice: { count: Math.round(12 * _particleScale), minSize: 2, maxSize: 6, minDur: 10, maxDur: 20, drift: 100, spin: 140 },
  storm: { count: Math.round(14 * _particleScale), minSize: 2, maxSize: 6, minDur: 5, maxDur: 10, drift: 130, spin: 80 },
  space: { count: Math.round(20 * _particleScale), minSize: 1, maxSize: 4, minDur: 12, maxDur: 24, drift: 60, spin: 180 },
  garden: { count: Math.round(14 * _particleScale), minSize: 3, maxSize: 7, minDur: 9, maxDur: 17, drift: 95, spin: 150 },
  cherry: { count: Math.round(25 * _particleScale), minSize: 2, maxSize: 7, minDur: 8, maxDur: 16, drift: 120, spin: 180 },
};

const rebuildThemeParticles = (theme = activeTheme) => {
  if (!themeParticleLayer) return;
  themeParticleLayer.innerHTML = '';
  if (reducedMotion || !particleThemes.has(theme)) return;
  const cfg = particleConfig[theme];
  if (!cfg) return;
  for (let i = 0; i < cfg.count; i += 1) {
    const node = document.createElement('span');
    const size = cfg.minSize + (Math.random() * (cfg.maxSize - cfg.minSize));
    const duration = cfg.minDur + (Math.random() * (cfg.maxDur - cfg.minDur));
    const delay = -Math.random() * duration;
    const left = Math.random() * 100;
    const drift = (Math.random() * cfg.drift) - (cfg.drift / 2);
    const spin = (Math.random() * cfg.spin) - (cfg.spin / 2);
    node.className = `theme-particle theme-${theme}`;
    node.style.left = `${left}%`;
    node.style.setProperty('--size', `${size.toFixed(2)}px`);
    node.style.setProperty('--drift-x', `${drift.toFixed(2)}px`);
    node.style.setProperty('--spin', `${spin.toFixed(2)}deg`);
    node.style.animationDuration = `${duration.toFixed(2)}s`;
    node.style.animationDelay = `${delay.toFixed(2)}s`;
    themeParticleLayer.appendChild(node);
  }
};

const queueParticleRebuild = (theme = activeTheme) => {
  window.clearTimeout(particleRebuildTimer);
  particleRebuildTimer = window.setTimeout(() => rebuildThemeParticles(theme), 40);
};

setThemeState(activeTheme);
queueParticleRebuild(activeTheme);
window.addEventListener('resize', () => queueParticleRebuild(activeTheme));
 
/* Water bubbles (CSS-driven elements injected into theme-motion-a).
   These are lightweight, only created when the water theme is active. */
const themeMotionA = document.querySelector('.theme-motion.theme-motion-a');
let _waterBubbleTimer = null;
const clearWaterBubbles = () => {
  if (_waterBubbleTimer) { clearInterval(_waterBubbleTimer); _waterBubbleTimer = null; }
  if (!themeMotionA) return;
  const existing = themeMotionA.querySelectorAll('.water-bubble');
  existing.forEach(n => n.remove());
};

const createWaterBubbles = () => {
  clearWaterBubbles();
  if (!themeMotionA) return;
  const count = Math.min(18, Math.max(6, Math.floor(window.innerWidth / 90)));
  for (let i = 0; i < count; i += 1) {
    const b = document.createElement('span');
    b.className = 'water-bubble';
    const size = Math.random() * 18 + 6;
    b.style.width = `${size}px`;
    b.style.height = `${size}px`;
    b.style.left = `${Math.random() * 100}%`;
    b.style.bottom = `${-8 - Math.random() * 6}%`;
    b.style.animationDuration = `${5 + Math.random() * 7}s`;
    b.style.animationDelay = `${Math.random() * 6}s`;
    // slightly vary opacity per bubble for a natural look
    b.style.opacity = (0.35 + Math.random() * 0.25).toString();
    // scale transform origin for variety
    b.style.transform = `translateY(0) scale(${0.7 + Math.random() * 1.2})`;
    themeMotionA.appendChild(b);
  }
  // refresh bubbles periodically to vary positions
  _waterBubbleTimer = setInterval(() => { createWaterBubbles(); }, 12000);
};

/* Tide lines: inject layered horizontal SVG wave spans into .theme-motion-b
   with varied sizes, opacities and animation speeds. */
const themeMotionB = document.querySelector('.theme-motion.theme-motion-b');
let _tideLineTimer = null;
const clearTideLines = () => {
  if (_tideLineTimer) { clearInterval(_tideLineTimer); _tideLineTimer = null; }
  if (!themeMotionB) return;
  const existing = themeMotionB.querySelectorAll('.tide-line');
  existing.forEach(n => n.remove());
};

const createTideLines = () => {
  clearTideLines();
  if (!themeMotionB) return;
  const lines = 4; // number of visible horizontal lines
  const svgs = [
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 60' preserveAspectRatio='none'><path d='M0 30 C120 0 240 60 360 30 C480 0 600 60 720 30' stroke='rgba(255,255,255,0.06)' stroke-width='2' fill='none' stroke-linecap='round'/></svg>",
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 40' preserveAspectRatio='none'><path d='M0 20 C90 0 180 40 270 20 C360 0 450 40 540 20 C630 0 720 40 810 20' stroke='rgba(255,255,255,0.045)' stroke-width='1.6' fill='none' stroke-linecap='round'/></svg>",
  ];
  for (let i = 0; i < lines; i += 1) {
    const line = document.createElement('span');
    line.className = 'tide-line';
    // pick svg variant
    const svg = svgs[i % svgs.length];
    const size = 240 + Math.floor(Math.random() * 360); // background-size width
    const height = (i % 2 === 0) ? 36 : 24;
    const opacity = 0.18 - (i * 0.03);
    const bottom = 8 + (i * 3); // stack vertically
    const duration = 8 + Math.random() * 14; // 8s - 22s
    const reverse = Math.random() < 0.45;
    line.style.backgroundImage = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
    line.style.backgroundRepeat = 'repeat-x';
    line.style.backgroundSize = `${size}px ${height}px`;
    line.style.height = `${height}px`;
    line.style.bottom = `${bottom}%`;
    line.style.opacity = opacity.toString();
    line.style.filter = 'blur(0.35px)';
    line.style.animation = `tideLinesShift ${duration}s linear infinite ${reverse ? 'reverse' : 'normal'}`;
    themeMotionB.appendChild(line);
  }
  // refresh occasionally to shuffle positions
  _tideLineTimer = setInterval(() => { createTideLines(); }, 20000);
};

// Manage tide lines on theme change
window.addEventListener('yw:themechange', (event) => {
  const nextTheme = event && event.detail ? event.detail.theme : activeTheme;
  if (nextTheme === 'water') {
    createTideLines();
    createWaterBubbles();
  } else {
    clearTideLines();
    clearWaterBubbles();
  }
});

// Create initially if starting on water theme
if (activeTheme === 'water') { createTideLines(); createWaterBubbles(); }

/* Fire spark system for `campfire` and `earth` themes. Sparks rise from near
   the bottom center and drift across the page. Managed on theme changes. */
const SPARK_THEMES = new Set(['campfire', 'earth']);
let _sparkInterval = null;
let sparkLayer = null;

const ensureSparkLayer = () => {
  if (!sparkLayer) {
    sparkLayer = document.createElement('div');
    sparkLayer.className = 'fire-spark-layer';
    document.body.appendChild(sparkLayer);
  }
  return sparkLayer;
};

const clearSparks = () => {
  if (_sparkInterval) { clearInterval(_sparkInterval); _sparkInterval = null; }
  if (!sparkLayer) return;
  sparkLayer.innerHTML = '';
};

const spawnSpark = () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = ensureSparkLayer();
  // create many tiny sparks spread evenly across width
  const s = document.createElement('span');
  s.className = 'fire-spark';
  // tiny sizes 2px - 7px, keeps visible but small
  const size = Math.round(2 + Math.random() * 5);
  s.style.setProperty('--size', `${size}px`);
  // spread evenly across full width
  const leftPct = Math.random() * 100;
  s.style.left = `${leftPct}%`;
  // bottom near fire but vary slightly
  const bottomPct = 4 + Math.random() * 6; // 4% - 10%
  s.style.bottom = `${bottomPct}%`;
  // shorter durations for quick sparks (900ms - 1800ms)
  const dur = 900 + Math.random() * 900;
  s.style.setProperty('--dur', `${Math.round(dur)}ms`);
  // small drift left/right for subtle movement
  const drift = (Math.random() - 0.5) * 120; // -60 to +60px
  s.style.setProperty('--drift', `${Math.round(drift)}px`);
  // slight initial horizontal jitter
  s.style.transform = `translateX(${(Math.random() - 0.5) * 6}px) translateY(0)`;
  // subtle opacity variation
  s.style.opacity = (0.6 + Math.random() * 0.35).toString();
  layer.appendChild(s);
  // remove after animation ends
  window.setTimeout(() => { s.remove(); }, dur + 120);
};

const startSparks = () => {
  ensureSparkLayer();
  if (_sparkInterval) clearInterval(_sparkInterval);
  // spawn small sparks frequently to create an even spread across the page
  _sparkInterval = setInterval(() => {
    // each tick spawn 1-3 tiny sparks
    const count = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      window.setTimeout(spawnSpark, Math.random() * 220);
    }
  }, 140);
};

// manage on theme changes
window.addEventListener('yw:themechange', (ev) => {
  const next = ev && ev.detail ? ev.detail.theme : activeTheme;
  if (SPARK_THEMES.has(next)) startSparks();
  else clearSparks();
});

// start initially if current theme matches
if (SPARK_THEMES.has(activeTheme)) startSparks();

// Manage bubbles on theme change
window.addEventListener('yw:themechange', (event) => {
  const nextTheme = event && event.detail ? event.detail.theme : activeTheme;
  if (nextTheme === 'water') createWaterBubbles();
  else clearWaterBubbles();
});

// Create bubbles initially if starting on water theme
if (activeTheme === 'water') createWaterBubbles();
document.querySelectorAll('[data-password-toggle]').forEach((button) => {
  if (button.dataset.passwordToggleBound === '1') return;
  button.dataset.passwordToggleBound = '1';

  const targetId = button.getAttribute('data-target');
  if (!targetId) return;
  const input = document.getElementById(targetId);
  if (!input) return;

  button.innerHTML = `<svg class="eye-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><line class="eye-slash" x1="4" y1="20" x2="20" y2="4" /></svg>`;
  const slash = button.querySelector('.eye-slash');

  const updateState = () => {
    const isVisible = input.type === 'text';
    if (slash) slash.style.opacity = isVisible ? '1' : '0';
    const actionLabel = isVisible ? 'Hide password' : 'Show password';
    button.setAttribute('aria-label', actionLabel);
    button.setAttribute('title', actionLabel);
    button.setAttribute('aria-pressed', isVisible ? 'true' : 'false');
  };

  button.setAttribute('type', 'button');
  button.setAttribute('aria-controls', targetId);
  button.addEventListener('mousedown', (event) => {
    // Keep focus on input while toggling to avoid cursor jumps.
    event.preventDefault();
  });

  // Initialize
  updateState();

  button.addEventListener('click', (event) => {
    event.preventDefault();
    const shouldShow = input.type === 'password';
    input.type = shouldShow ? 'text' : 'password';
    updateState();
    input.focus({ preventScroll: true });
  });
});

const emberFieldCanvas = document.getElementById('emberFieldCanvas');
const fireBandCanvas = document.getElementById('fireBandCanvas');

if (
  emberFieldCanvas &&
  fireBandCanvas &&
  ENABLE_CAMPFIRE_CANVAS &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches
) {
  const emberCtx = emberFieldCanvas.getContext('2d');
  const fireCtx = fireBandCanvas.getContext('2d');

  if (emberCtx && fireCtx) {
    let viewportWidth = 0;
    let viewportHeight = 0;
    let fireHeight = 0;
    let dpr = 1;
    let lastFrame = 0;
    let windPhase = 0;

    let quality = 1;
    let slowFrames = 0;
    const qualityClamp = (value) => Math.max(0.55, Math.min(value, 1));

    let fireAnimId = null;
    let fireRunning = false;

    const flameSprite = document.createElement('canvas');
    const emberSprite = document.createElement('canvas');
    let flameSpriteReady = false;
    let emberSpriteReady = false;

    const rgba = (rgb, a) => `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;

    const parseCssColor = (value, fallback) => {
      if (!value) return fallback;
      const v = value.trim();
      if (!v) return fallback;

      if (v[0] === '#') {
        let hex = v.slice(1).trim();
        if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
        if (hex.length !== 6) return fallback;
        const int = Number.parseInt(hex, 16);
        if (Number.isNaN(int)) return fallback;
        return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
      }

      const match = v.match(/^rgba?\(([^)]+)\)$/i);
      if (!match) return fallback;
      const parts = match[1].split(',').map((p) => p.trim());
      if (parts.length < 3) return fallback;
      const r = Math.round(Number.parseFloat(parts[0]));
      const g = Math.round(Number.parseFloat(parts[1]));
      const b = Math.round(Number.parseFloat(parts[2]));
      if ([r, g, b].some((n) => Number.isNaN(n))) return fallback;
      return { r, g, b };
    };

    const mixRgb = (from, to, t) => ({
      r: Math.round(from.r + (to.r - from.r) * t),
      g: Math.round(from.g + (to.g - from.g) * t),
      b: Math.round(from.b + (to.b - from.b) * t),
    });

    const computeFirePalette = () => {
      const warmBase = { r: 255, g: 244, b: 206 };
      const styles = getComputedStyle(document.body);
      const accent = parseCssColor(styles.getPropertyValue('--theme-accent'), { r: 255, g: 157, b: 86 });
      const accent2 = parseCssColor(styles.getPropertyValue('--theme-accent-2'), { r: 255, g: 125, b: 47 });

      return {
        accent,
        accent2,
        core: mixRgb(warmBase, accent2, 0.25),
        ember: mixRgb(warmBase, accent2, 0.4),
        spark: mixRgb(warmBase, accent2, 0.35),
      };
    };

    let firePalette = null;

    const buildSprites = () => {
      const palette = firePalette || (firePalette = computeFirePalette());
      if (!flameSpriteReady) {
        const size = 64;
        flameSprite.width = size;
        flameSprite.height = size;
        const ctx = flameSprite.getContext('2d');
        if (ctx) {
          const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
          g.addColorStop(0, rgba(palette.core, 0.95));
          g.addColorStop(0.5, rgba(palette.accent2, 0.35));
          g.addColorStop(1, rgba(palette.accent, 0));
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, size, size);
          flameSpriteReady = true;
        }
      }

      if (!emberSpriteReady) {
        const w = 160;
        const h = 24;
        emberSprite.width = w;
        emberSprite.height = h;
        const ctx = emberSprite.getContext('2d');
        if (ctx) {
          const g = ctx.createLinearGradient(0, 0, w, 0);
          g.addColorStop(0, rgba(palette.accent2, 0));
          g.addColorStop(0.3, rgba(palette.accent2, 0.35));
          g.addColorStop(0.5, rgba(palette.ember, 1));
          g.addColorStop(0.7, rgba(palette.accent, 0.35));
          g.addColorStop(1, rgba(palette.accent, 0));
          ctx.fillStyle = g;
          ctx.fillRect(0, h * 0.35, w, h * 0.3);
          emberSpriteReady = true;
        }
      }
    };

    const flameParticles = [];
    const emberParticles = [];
    const sparkParticles = [];

    let fireGlowGradient = null;
    let fireLayerGradients = [];

    const rebuildFireGradients = () => {
      const palette = firePalette || (firePalette = computeFirePalette());

      fireGlowGradient = fireCtx.createLinearGradient(0, fireHeight, 0, 0);
      fireGlowGradient.addColorStop(0, rgba(palette.accent2, 0.56));
      fireGlowGradient.addColorStop(0.28, rgba(palette.accent, 0.28));
      fireGlowGradient.addColorStop(1, rgba(palette.accent, 0));

      fireLayerGradients = [
        fireCtx.createLinearGradient(0, fireHeight, 0, (fireHeight - 26) - 100),
        fireCtx.createLinearGradient(0, fireHeight, 0, (fireHeight - 44) - 100),
        fireCtx.createLinearGradient(0, fireHeight, 0, (fireHeight - 62) - 100),
      ];
      fireLayerGradients[0].addColorStop(0, rgba(palette.accent2, 0.6));
      fireLayerGradients[0].addColorStop(1, rgba(palette.accent, 0.48));
      fireLayerGradients[1].addColorStop(0, rgba(palette.accent2, 0.46));
      fireLayerGradients[1].addColorStop(1, rgba(palette.accent, 0.34));
      fireLayerGradients[2].addColorStop(0, rgba(palette.core, 0.28));
      fireLayerGradients[2].addColorStop(1, rgba(palette.accent, 0.2));
    };

    const syncFirePalette = () => {
      firePalette = computeFirePalette();
      flameSpriteReady = false;
      emberSpriteReady = false;
      rebuildFireGradients();
    };

    const resizeFireCanvases = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      fireHeight = Math.min(280, Math.max(180, Math.floor(viewportHeight * 0.28)));

      if (ENABLE_CAMPFIRE_EMBER_FIELD) {
        emberFieldCanvas.width = Math.floor(viewportWidth * dpr);
        emberFieldCanvas.height = Math.floor(viewportHeight * dpr);
        emberFieldCanvas.style.width = `${viewportWidth}px`;
        emberFieldCanvas.style.height = `${viewportHeight}px`;
        emberCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      } else {
        emberFieldCanvas.width = 1;
        emberFieldCanvas.height = 1;
        emberCtx.setTransform(1, 0, 0, 1, 0, 0);
      }

      fireBandCanvas.style.height = `${fireHeight}px`;
      fireBandCanvas.style.width = `${viewportWidth}px`;
      fireBandCanvas.width = Math.floor(viewportWidth * dpr);
      fireBandCanvas.height = Math.floor(fireHeight * dpr);
      fireCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuildFireGradients();
    };

    const spawnFlame = () => {
      flameParticles.push({
        x: Math.random() * viewportWidth,
        y: fireHeight + Math.random() * 34,
        vx: (Math.random() - 0.5) * 0.55,
        vy: -(Math.random() * 1.9 + 1.2),
        life: 0,
        ttl: Math.random() * 54 + 38,
        size: Math.random() * 22 + 14,
      });
    };

    const spawnEmber = () => {
      const fromBottom = Math.random() < 0.6;
      let x = Math.random() * viewportWidth;
      let y = viewportHeight - Math.random() * Math.min(120, fireHeight * 0.8);

      if (fromBottom) {
        // Most embers rise from the fire area
        x = viewportWidth * 0.3 + Math.random() * (viewportWidth * 0.4);
        y = viewportHeight - fireHeight - Math.random() * 50;
      } else {
        // Some embers from sides of fire pit
        const fromLeft = Math.random() < 0.5;
        if (fromLeft) {
          x = Math.random() * (viewportWidth * 0.25);
        } else {
          x = viewportWidth * 0.75 + Math.random() * (viewportWidth * 0.25);
        }
        y = viewportHeight - fireHeight + Math.random() * 30;
      }

      emberParticles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 1.1,
        vy: -(Math.random() * 2.8 + 1.5),
        size: Math.random() * 1.6 + 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.08,
        life: 0,
        ttl: Math.random() * 220 + 90,
        streak: Math.random() < 0.7,
      });
    };

    const drawFireBackdrop = (time, wind) => {
      const palette = firePalette || (firePalette = computeFirePalette());
      fireCtx.clearRect(0, 0, viewportWidth, fireHeight);

      fireCtx.fillStyle = fireGlowGradient || rgba(palette.accent2, 0.3);
      fireCtx.fillRect(0, 0, viewportWidth, fireHeight);

      const layers = [
        { base: fireHeight - 26, ampA: 22, ampB: 12, speedA: 0.0044, speedB: 0.0072, colorA: rgba(palette.accent2, 0.6), colorB: rgba(palette.accent, 0.48) },
        { base: fireHeight - 44, ampA: 26, ampB: 15, speedA: 0.004, speedB: 0.0064, colorA: rgba(palette.accent2, 0.46), colorB: rgba(palette.accent, 0.34) },
        { base: fireHeight - 62, ampA: 19, ampB: 10, speedA: 0.0034, speedB: 0.0052, colorA: rgba(palette.core, 0.28), colorB: rgba(palette.accent, 0.2) },
      ];

      layers.forEach((layer, idx) => {
        fireCtx.beginPath();
        fireCtx.moveTo(0, fireHeight);
        const step = 22;
        for (let x = 0; x <= viewportWidth + step; x += step) {
          const waveA = Math.sin((x * layer.speedA) + (time * 0.0023) + (idx * 1.7));
          const waveB = Math.cos((x * layer.speedB) - (time * 0.0028) + (idx * 1.1));
          const y = layer.base - (waveA * layer.ampA) - (waveB * layer.ampB) - (wind * 12);
          fireCtx.lineTo(x, y);
        }
        fireCtx.lineTo(viewportWidth, fireHeight);
        fireCtx.closePath();

        const layerGradient = fireLayerGradients[idx];
        fireCtx.fillStyle = layerGradient || layer.colorA;
        fireCtx.fill();
      });
    };

    const updateAndDrawFlames = (wind) => {
      const palette = firePalette || (firePalette = computeFirePalette());
      const spawnCount = Math.max(6, Math.floor((viewportWidth / 120) * quality));
      const maxFlames = Math.floor(360 * quality);
      for (let i = 0; i < spawnCount; i += 1) {
        if (flameParticles.length < maxFlames) spawnFlame();
      }

      fireCtx.globalCompositeOperation = 'lighter';
      for (let i = flameParticles.length - 1; i >= 0; i -= 1) {
        const p = flameParticles[i];
        p.life += 1;
        p.x += p.vx + (wind * 0.22);
        p.y += p.vy;
        p.vy += 0.018;

        const t = p.life / p.ttl;
        const alpha = Math.max(0, 1 - t);
        const radius = p.size * (1 - (t * 0.65));

        if (radius <= 0 || alpha <= 0 || p.y < -radius) {
          flameParticles.splice(i, 1);
          continue;
        }

        if (flameSpriteReady) {
          const spriteSize = radius * 2;
          fireCtx.globalAlpha = alpha;
          fireCtx.drawImage(flameSprite, p.x - spriteSize / 2, p.y - spriteSize / 2, spriteSize, spriteSize);
          fireCtx.globalAlpha = 1;
        } else {
          fireCtx.fillStyle = rgba(palette.accent2, alpha * 0.14);
          fireCtx.beginPath();
          fireCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          fireCtx.fill();
        }
      }
      fireCtx.globalCompositeOperation = 'source-over';
    };

    const updateAndDrawEmbers = (wind) => {
      const palette = firePalette || (firePalette = computeFirePalette());
      if (!ENABLE_CAMPFIRE_EMBER_FIELD) return;
      emberCtx.clearRect(0, 0, viewportWidth, viewportHeight);
      const spawnCount = Math.max(1, Math.floor((viewportWidth / 520) * quality));
      const maxEmbers = Math.floor(220 * quality);
      for (let i = 0; i < spawnCount; i += 1) {
        if (emberParticles.length < maxEmbers) spawnEmber();
      }

      emberCtx.globalCompositeOperation = 'lighter';
      emberCtx.shadowBlur = 4 * quality;
      emberCtx.shadowColor = rgba(palette.accent2, 0.25);
      for (let i = emberParticles.length - 1; i >= 0; i -= 1) {
        const p = emberParticles[i];
        p.life += 1;
        p.rotation += 0.035;
        p.x += p.vx + (Math.sin((p.life * 0.05) + p.rotation) * 0.08) + (wind * 0.18);
        p.y += p.vy;
        p.vy += 0.0025;

        const t = p.life / p.ttl;
        const alpha = Math.max(0, 1 - t);
        if (alpha <= 0 || p.y < -24 || p.x < -40 || p.x > viewportWidth + 40) {
          emberParticles.splice(i, 1);
          continue;
        }

        emberCtx.save();
        emberCtx.translate(p.x, p.y);
        emberCtx.rotate(p.rotation);
        const length = p.streak ? (p.size * 4.8) : (p.size * 2.2);
        const thickness = p.streak ? (p.size * 0.8) : p.size;
        emberCtx.globalAlpha = alpha;
        if (emberSpriteReady) {
          emberCtx.drawImage(emberSprite, -length * 0.5, -thickness * 0.5, length, thickness);
        } else {
          emberCtx.fillStyle = rgba(palette.ember, alpha * 0.85);
          emberCtx.fillRect(-length * 0.5, -thickness * 0.5, length, thickness);
        }
        emberCtx.globalAlpha = 1;
        emberCtx.restore();
      }
      emberCtx.shadowBlur = 0;
      emberCtx.globalCompositeOperation = 'source-over';
    };

    const spawnSpark = () => {
      sparkParticles.push({
        x: viewportWidth * 0.35 + Math.random() * (viewportWidth * 0.3),
        y: fireHeight - (10 + Math.random() * 20),
        vx: (Math.random() - 0.5) * 0.9,
        vy: -(Math.random() * 2.4 + 1.6),
        size: Math.random() * 1.8 + 0.8,
        life: 0,
        ttl: Math.random() * 34 + 22,
      });
    };

    const updateAndDrawSparks = (wind) => {
      const palette = firePalette || (firePalette = computeFirePalette());
      const spawnCount = Math.max(1, Math.floor((viewportWidth / 520) * quality));
      const maxSparks = Math.floor(90 * quality);
      for (let i = 0; i < spawnCount; i += 1) {
        if (sparkParticles.length < maxSparks && Math.random() < 0.85) spawnSpark();
      }

      fireCtx.globalCompositeOperation = 'lighter';
      for (let i = sparkParticles.length - 1; i >= 0; i -= 1) {
        const p = sparkParticles[i];
        p.life += 1;
        p.x += p.vx + (wind * 0.25);
        p.y += p.vy;
        p.vy += 0.06;
        const t = p.life / p.ttl;
        const alpha = Math.max(0, 1 - t);
        if (alpha <= 0 || p.y < -30 || p.x < -40 || p.x > viewportWidth + 40) {
          sparkParticles.splice(i, 1);
          continue;
        }
        fireCtx.fillStyle = rgba(palette.spark, alpha * 0.85);
        fireCtx.beginPath();
        fireCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        fireCtx.fill();
      }
      fireCtx.globalCompositeOperation = 'source-over';
    };

    const animateFire = (timestamp) => {
      if (!fireRunning) return;
      if (!fireThemes.has(activeTheme) || document.hidden) {
        lastFrame = timestamp;
        fireAnimId = requestAnimationFrame(animateFire);
        return;
      }

      if (timestamp - lastFrame < 33) {
        fireAnimId = requestAnimationFrame(animateFire);
        return;
      }

      const frameDelta = timestamp - lastFrame;
      if (lastFrame !== 0) {
        if (frameDelta > 55) slowFrames += 1;
        else slowFrames = Math.max(0, slowFrames - 1);
        if (slowFrames >= 14) {
          quality = qualityClamp(quality - 0.08);
          slowFrames = 0;
        }
      }
      lastFrame = timestamp;
      windPhase += 0.012;
      const wind = Math.sin(windPhase) * 0.9;
      drawFireBackdrop(timestamp, wind);
      updateAndDrawFlames(wind);
      updateAndDrawEmbers(wind);
      updateAndDrawSparks(wind);
      fireAnimId = requestAnimationFrame(animateFire);
    };

    const startFire = () => {
      if (fireRunning) return;
      fireRunning = true;
      buildSprites();
      fireAnimId = requestAnimationFrame(animateFire);
    };

    const stopFire = () => {
      fireRunning = false;
      if (fireAnimId) cancelAnimationFrame(fireAnimId);
      fireAnimId = null;
      emberCtx.clearRect(0, 0, viewportWidth, viewportHeight);
      fireCtx.clearRect(0, 0, viewportWidth, fireHeight);
    };

    resizeFireCanvases();
    window.addEventListener('resize', resizeFireCanvases);
    if (fireThemes.has(activeTheme) && !document.hidden) startFire();
    window.addEventListener('yw:themechange', (event) => {
      const nextTheme = event && event.detail ? event.detail.theme : activeTheme;
      if (fireThemes.has(nextTheme)) {
        syncFirePalette();
        startFire();
      } else {
        stopFire();
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopFire();
      else if (fireThemes.has(activeTheme)) startFire();
    });
  }
}

// Water Theme Canvas Animation
const waterCanvas = document.getElementById('waterCanvas');
if (waterCanvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const waterCtx = waterCanvas.getContext('2d');
  if (waterCtx) {
    let viewportWidth = 0, viewportHeight = 0, dpr = 1, lastFrame = 0, wavePhase = 0;
    const waterParticles = [], bubbles = [];
    let waterRunning = false;
    let waterAnimId = null;

    let waterBaseGradient = null;
    let waveLayerGradients = [];

    const resizeWaterCanvas = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      waterCanvas.width = Math.floor(viewportWidth * dpr);
      waterCanvas.height = Math.floor(viewportHeight * dpr);
      waterCanvas.style.width = `${viewportWidth}px`;
      waterCanvas.style.height = `${viewportHeight}px`;
      waterCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      waterBaseGradient = waterCtx.createLinearGradient(0, viewportHeight * 0.74, 0, viewportHeight);
      waterBaseGradient.addColorStop(0, 'rgba(103, 191, 236, 0.1)');
      waterBaseGradient.addColorStop(0.4, 'rgba(86, 153, 220, 0.16)');
      waterBaseGradient.addColorStop(1, 'rgba(56, 118, 190, 0.22)');

      const layerBases = [viewportHeight * 0.85, viewportHeight * 0.885, viewportHeight * 0.92];
      waveLayerGradients = layerBases.map((base, idx) => {
        const g = waterCtx.createLinearGradient(0, base - 60, 0, viewportHeight);
        if (idx === 0) {
          g.addColorStop(0, 'rgba(103, 191, 236, 0.55)');
          g.addColorStop(1, 'rgba(103, 191, 236, 0.12)');
        } else if (idx === 1) {
          g.addColorStop(0, 'rgba(86, 153, 220, 0.45)');
          g.addColorStop(1, 'rgba(86, 153, 220, 0.12)');
        } else {
          g.addColorStop(0, 'rgba(123, 220, 255, 0.35)');
          g.addColorStop(1, 'rgba(123, 220, 255, 0.1)');
        }
        return g;
      });
    };

    const spawnWaterParticle = () => {
      waterParticles.push({
        x: Math.random() * viewportWidth,
        y: viewportHeight + 20,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -(Math.random() * 2.5 + 1.5),
        size: Math.random() * 3 + 1,
        life: 0,
        ttl: Math.random() * 120 + 180,
        opacity: Math.random() * 0.6 + 0.2,
      });
    };

    const spawnBubble = () => {
      bubbles.push({
        x: Math.random() * viewportWidth,
        y: viewportHeight + 10,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(Math.random() * 1.2 + 0.8),
        size: Math.random() * 4 + 2,
        life: 0,
        ttl: Math.random() * 150 + 200,
        wobble: Math.random() * Math.PI * 2,
      });
    };

    const drawWaterWaves = (time) => {
      waterCtx.clearRect(0, 0, viewportWidth, viewportHeight);

      waterCtx.fillStyle = waterBaseGradient || 'rgba(56, 118, 190, 0.12)';
      waterCtx.fillRect(0, viewportHeight * 0.74, viewportWidth, viewportHeight * 0.26);
      
      const waveLayers = [
        { base: viewportHeight * 0.85, amp: 38, freq: 0.008, speed: 0.0023, alpha: 0.55, color: 'rgba(103, 191, 236, ' },
        { base: viewportHeight * 0.885, amp: 30, freq: 0.01, speed: 0.0033, alpha: 0.42, color: 'rgba(86, 153, 220, ' },
        { base: viewportHeight * 0.92, amp: 24, freq: 0.012, speed: 0.0043, alpha: 0.33, color: 'rgba(123, 220, 255, ' },
      ];

      // Draw main wave layers
      waveLayers.forEach((layer, idx) => {
        waterCtx.beginPath();
        waterCtx.moveTo(0, viewportHeight);
        for (let x = 0; x <= viewportWidth; x += 14) {
          const y = layer.base + Math.sin((x * layer.freq) + (time * layer.speed) + (wavePhase * 0.9)) * layer.amp;
          waterCtx.lineTo(x, y);
        }
        waterCtx.lineTo(viewportWidth, viewportHeight);
        waterCtx.closePath();

        const gradient = waveLayerGradients[idx];
        waterCtx.fillStyle = gradient || (layer.color + layer.alpha + ')');
        waterCtx.fill();

        waterCtx.strokeStyle = `rgba(220, 250, 255, ${0.18 + idx * 0.04})`;
        waterCtx.lineWidth = 1;
        waterCtx.stroke();
      });

      // Add simple surface ripples
      for (let i = 0; i < 3; i++) {
        const rippleX = (viewportWidth / 4) * (i + 1) + Math.sin(time * 0.001 + i) * 30;
        const rippleY = viewportHeight * 0.86;
        const rippleRadius = 40 + Math.sin(time * 0.002 + i * 2) * 20;
        const rippleAlpha = 0.14 + (Math.sin(time * 0.003 + i) * 0.06);
        
        waterCtx.beginPath();
        waterCtx.arc(rippleX, rippleY, rippleRadius, 0, Math.PI * 2);
        waterCtx.strokeStyle = `rgba(206, 244, 255, ${rippleAlpha})`;
        waterCtx.lineWidth = 2;
        waterCtx.stroke();
      }
    };

    const updateWaterParticles = () => {
      const spawnCount = Math.max(2, Math.floor(viewportWidth / 160));
      for (let i = 0; i < spawnCount; i++) {
        if (waterParticles.length < 80) spawnWaterParticle();
        if (bubbles.length < 70 && Math.random() < 0.55) spawnBubble();
      }

      waterCtx.globalCompositeOperation = 'lighter';
      for (let i = waterParticles.length - 1; i >= 0; i--) {
        const p = waterParticles[i];
        p.life += 1; p.x += p.vx; p.y += p.vy; p.vy += 0.02;
        const t = p.life / p.ttl;
        const alpha = p.opacity * Math.max(0, 1 - t);
        if (alpha <= 0 || p.y < -20) { waterParticles.splice(i, 1); continue; }
        waterCtx.fillStyle = `rgba(204, 240, 255, ${alpha})`;
        waterCtx.beginPath();
        waterCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        waterCtx.fill();
      }

      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.life += 1; b.wobble += 0.05;
        b.x += b.vx + Math.sin(b.wobble) * 0.5;
        b.y += b.vy;
        const t = b.life / b.ttl;
        const alpha = Math.max(0, 1 - t) * 0.6;
        if (alpha <= 0 || b.y < -20) { bubbles.splice(i, 1); continue; }
        waterCtx.strokeStyle = `rgba(206, 244, 255, ${alpha})`;
        waterCtx.lineWidth = 1;
        waterCtx.beginPath();
        waterCtx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        waterCtx.stroke();
      }
      waterCtx.globalCompositeOperation = 'source-over';
    };

    const animateWater = (timestamp) => {
      if (!waterRunning) return;
      if (timestamp - lastFrame < 50) {
        waterAnimId = requestAnimationFrame(animateWater);
        return;
      }
      lastFrame = timestamp;
      wavePhase += 0.03;
      drawWaterWaves(timestamp);
      updateWaterParticles();
      waterAnimId = requestAnimationFrame(animateWater);
    };

    const startWater = () => {
      if (waterRunning) return;
      waterRunning = true;
      lastFrame = 0;
      waterAnimId = requestAnimationFrame(animateWater);
    };

    const stopWater = () => {
      waterRunning = false;
      if (waterAnimId) cancelAnimationFrame(waterAnimId);
      waterAnimId = null;
      waterParticles.length = 0;
      bubbles.length = 0;
      waterCtx.clearRect(0, 0, viewportWidth, viewportHeight);
    };

    resizeWaterCanvas();
    window.addEventListener('resize', resizeWaterCanvas);
    bindThemeLifecycle(waterThemes, startWater, stopWater);
  }
}

// Wind Theme Canvas Animation
const windCanvas = document.getElementById('windCanvas');
if (windCanvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const windCtx = windCanvas.getContext('2d');
  if (windCtx) {
    let viewportWidth = 0, viewportHeight = 0, dpr = 1, lastFrame = 0, windPhase = 0;
    const windParticles = [], windLines = [];
    let windRunning = false;
    let windAnimId = null;

    const resizeWindCanvas = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      windCanvas.width = Math.floor(viewportWidth * dpr);
      windCanvas.height = Math.floor(viewportHeight * dpr);
      windCanvas.style.width = `${viewportWidth}px`;
      windCanvas.style.height = `${viewportHeight}px`;
      windCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawnWindParticle = () => {
      const fromLeft = Math.random() < 0.5;
      windParticles.push({
        x: fromLeft ? -20 : viewportWidth + 20,
        y: Math.random() * viewportHeight,
        vx: fromLeft ? (Math.random() * 4 + 2) : -(Math.random() * 4 + 2),
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 0.5,
        life: 0,
        ttl: Math.random() * 100 + 150,
        opacity: Math.random() * 0.4 + 0.1,
      });
    };

    const spawnWindLine = () => {
      windLines.push({
        x: Math.random() * viewportWidth,
        y: Math.random() * viewportHeight,
        length: Math.random() * 80 + 40,
        angle: (Math.random() - 0.5) * 0.3,
        speed: Math.random() * 3 + 1,
        life: 0,
        ttl: Math.random() * 60 + 80,
        opacity: Math.random() * 0.2 + 0.05,
      });
    };

    const drawWindStreams = (time) => {
      windCtx.clearRect(0, 0, viewportWidth, viewportHeight);
      
      for (let i = 0; i < 3; i++) {
        windCtx.beginPath();
        windCtx.moveTo(0, (viewportHeight / 4) * (i + 1));
        
        for (let x = 0; x <= viewportWidth; x += 20) {
          const y = (viewportHeight / 4) * (i + 1) + 
                   Math.sin((x * 0.01) + (time * 0.001) + (i * 2)) * 30 +
                   Math.sin((x * 0.005) + (time * 0.002)) * 20;
          windCtx.lineTo(x, y);
        }
        
        windCtx.strokeStyle = `rgba(196, 236, 255, ${0.12 - (i * 0.02)})`;
        windCtx.lineWidth = 2.2 - (i * 0.55);
        windCtx.shadowBlur = 8;
        windCtx.shadowColor = 'rgba(198, 216, 238, 0.2)';
        windCtx.stroke();
        windCtx.shadowBlur = 0;
      }
    };

    const updateWindParticles = () => {
      const spawnCount = Math.max(2, Math.floor(viewportWidth / 150));
      for (let i = 0; i < spawnCount; i++) {
        if (windParticles.length < 60) spawnWindParticle();
        if (windLines.length < 20 && Math.random() < 0.4) spawnWindLine();
      }

      windCtx.globalCompositeOperation = 'lighter';
      
      for (let i = windParticles.length - 1; i >= 0; i--) {
        const p = windParticles[i];
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy + Math.sin(p.life * 0.1) * 0.2;

        const t = p.life / p.ttl;
        const alpha = p.opacity * Math.max(0, 1 - t);
        
        if (alpha <= 0 || p.x < -50 || p.x > viewportWidth + 50) {
          windParticles.splice(i, 1);
          continue;
        }

        windCtx.fillStyle = `rgba(236, 250, 255, ${alpha})`;
        windCtx.beginPath();
        windCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        windCtx.fill();
      }

      for (let i = windLines.length - 1; i >= 0; i--) {
        const line = windLines[i];
        line.life += 1;
        line.x += line.speed;

        const t = line.life / line.ttl;
        const alpha = line.opacity * Math.max(0, 1 - t);
        
        if (alpha <= 0 || line.x > viewportWidth + 100) {
          windLines.splice(i, 1);
          continue;
        }

        windCtx.save();
        windCtx.translate(line.x, line.y);
        windCtx.rotate(line.angle);
        windCtx.strokeStyle = `rgba(210, 240, 255, ${alpha})`;
        windCtx.lineWidth = 1;
        windCtx.beginPath();
        windCtx.moveTo(-line.length / 2, 0);
        windCtx.lineTo(line.length / 2, 0);
        windCtx.stroke();
        windCtx.restore();
      }
      
      windCtx.globalCompositeOperation = 'source-over';
    };

    const animateWind = (timestamp) => {
      if (!windRunning) return;
      if (timestamp - lastFrame < 25) {
        windAnimId = requestAnimationFrame(animateWind);
        return;
      }
      lastFrame = timestamp;
      windPhase += 0.015;
      drawWindStreams(timestamp);
      updateWindParticles();
      windAnimId = requestAnimationFrame(animateWind);
    };

    const startWind = () => {
      if (windRunning) return;
      windRunning = true;
      lastFrame = 0;
      windAnimId = requestAnimationFrame(animateWind);
    };

    const stopWind = () => {
      windRunning = false;
      if (windAnimId) cancelAnimationFrame(windAnimId);
      windAnimId = null;
      windParticles.length = 0;
      windLines.length = 0;
      windCtx.clearRect(0, 0, viewportWidth, viewportHeight);
    };

    resizeWindCanvas();
    window.addEventListener('resize', resizeWindCanvas);
    bindThemeLifecycle(windThemes, startWind, stopWind);
  }
}

// Earth Theme Canvas Animation
const earthCanvas = document.getElementById('earthCanvas');
if (earthCanvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const earthCtx = earthCanvas.getContext('2d');
  if (earthCtx) {
    let viewportWidth = 0, viewportHeight = 0, dpr = 1, lastFrame = 0;
    const earthParticles = [], roots = [];
    let earthRunning = false;
    let earthAnimId = null;

    const resizeEarthCanvas = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      earthCanvas.width = Math.floor(viewportWidth * dpr);
      earthCanvas.height = Math.floor(viewportHeight * dpr);
      earthCanvas.style.width = `${viewportWidth}px`;
      earthCanvas.style.height = `${viewportHeight}px`;
      earthCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawnEarthParticle = () => {
      earthParticles.push({
        x: Math.random() * viewportWidth,
        y: -20,
        vx: (Math.random() - 0.5) * 0.3,
        vy: Math.random() * 1.5 + 0.5,
        size: Math.random() * 4 + 2,
        life: 0,
        ttl: Math.random() * 200 + 300,
        opacity: Math.random() * 0.4 + 0.2,
        type: Math.random() < 0.5 ? 'soil' : 'rock',
      });
    };

    const spawnRoot = () => {
      roots.push({
        x: Math.random() * viewportWidth,
        y: viewportHeight,
        targetY: viewportHeight * (0.3 + Math.random() * 0.4),
        progress: 0,
        speed: Math.random() * 0.002 + 0.001,
        branches: [],
        thickness: Math.random() * 3 + 2,
        opacity: 1,
      });
    };

    const drawGroundLayers = () => {
      earthCtx.clearRect(0, 0, viewportWidth, viewportHeight);
      
      // Draw ground layers
      const groundHeight = viewportHeight * 0.15;
      const layers = [
        { y: viewportHeight - groundHeight, height: groundHeight, color: 'rgba(76, 55, 38, 0.3)' },
        { y: viewportHeight - groundHeight * 0.7, height: groundHeight * 0.7, color: 'rgba(126, 102, 71, 0.2)' },
        { y: viewportHeight - groundHeight * 0.4, height: groundHeight * 0.4, color: 'rgba(173, 140, 97, 0.15)' },
      ];

      layers.forEach((layer) => {
        earthCtx.fillStyle = layer.color;
        earthCtx.fillRect(0, layer.y, viewportWidth, layer.height);
      });
    };

    const updateEarthParticles = () => {
      const spawnCount = Math.max(1, Math.floor(viewportWidth / 300));
      for (let i = 0; i < spawnCount; i++) {
        if (earthParticles.length < 36) spawnEarthParticle();
        if (roots.length < 6 && Math.random() < 0.015) spawnRoot();
      }

      earthCtx.globalCompositeOperation = 'source-over';
      
      for (let i = earthParticles.length - 1; i >= 0; i--) {
        const p = earthParticles[i];
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.02;

        const t = p.life / p.ttl;
        const alpha = p.opacity * Math.max(0, 1 - t);
        
        if (alpha <= 0 || p.y > viewportHeight + 20) {
          earthParticles.splice(i, 1);
          continue;
        }

        const color = p.type === 'soil' ? 'rgba(199, 173, 133,' : 'rgba(136, 104, 69,';
        earthCtx.fillStyle = color + alpha + ')';
        earthCtx.beginPath();
        earthCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        earthCtx.fill();
      }

      // Draw roots
      for (const root of roots) {
        root.progress = Math.min(1, root.progress + root.speed);
        const currentY = viewportHeight - (viewportHeight - root.targetY) * root.progress;
        if (root.progress > 0.9) root.opacity *= 0.992;
        
        earthCtx.strokeStyle = `rgba(132, 190, 108, ${0.34 * (1 - root.progress * 0.55) * root.opacity})`;
        earthCtx.lineWidth = root.thickness * (1 - root.progress * 0.3);
        earthCtx.beginPath();
        earthCtx.moveTo(root.x, viewportHeight);
        
        // Create wavy root path
        const segments = 5;
        for (let i = 1; i <= segments; i++) {
          const segmentProgress = i / segments;
          const y = viewportHeight - (viewportHeight - currentY) * segmentProgress;
          const x = root.x + Math.sin(segmentProgress * Math.PI * 2 + root.progress * 2) * 20 * segmentProgress;
          earthCtx.lineTo(x, y);
        }
        earthCtx.stroke();
      }

      for (let i = roots.length - 1; i >= 0; i--) {
        if (roots[i].progress >= 1 && roots[i].opacity < 0.08) roots.splice(i, 1);
      }
      
      earthCtx.globalCompositeOperation = 'source-over';
    };

    const animateEarth = (timestamp) => {
      if (!earthRunning) return;
      if (timestamp - lastFrame < 40) {
        earthAnimId = requestAnimationFrame(animateEarth);
        return;
      }
      lastFrame = timestamp;
      drawGroundLayers();
      updateEarthParticles();
      earthAnimId = requestAnimationFrame(animateEarth);
    };

    const startEarth = () => {
      if (earthRunning) return;
      earthRunning = true;
      lastFrame = 0;
      earthAnimId = requestAnimationFrame(animateEarth);
    };

    const stopEarth = () => {
      earthRunning = false;
      if (earthAnimId) cancelAnimationFrame(earthAnimId);
      earthAnimId = null;
      earthParticles.length = 0;
      roots.length = 0;
      earthCtx.clearRect(0, 0, viewportWidth, viewportHeight);
    };

    resizeEarthCanvas();
    window.addEventListener('resize', resizeEarthCanvas);
    bindThemeLifecycle(earthThemes, startEarth, stopEarth);
  }
}

// Ice Cracking Animation System
const iceCrackCanvas = document.getElementById('iceCanvas');
if (iceCrackCanvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const iceCrackCtx = iceCrackCanvas.getContext('2d');
  if (iceCrackCtx) {
    let viewportWidth = 0, viewportHeight = 0, dpr = 1;
    const iceCracks = [];
    let lastCrackTime = 0;
    let lastIceFrame = 0;
    let nextIceCrackAt = 0;
    let iceCrackAnimationId = null;
    const isIceMobile = () => window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
    const scheduleNextIceCrack = (fromTime = performance.now()) => {
      const mobile = isIceMobile();
      nextIceCrackAt = fromTime + (mobile ? 4200 : 1500) + Math.random() * (mobile ? 4200 : 2000);
    };

    const resizeIceCrackCanvas = () => {
      dpr = Math.min(window.devicePixelRatio || 1, isIceMobile() ? 1 : 1.5);
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      iceCrackCanvas.width = Math.floor(viewportWidth * dpr);
      iceCrackCanvas.height = Math.floor(viewportHeight * dpr);
      iceCrackCanvas.style.width = `${viewportWidth}px`;
      iceCrackCanvas.style.height = `${viewportHeight}px`;
      iceCrackCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const createIceCrack = () => {
      const mobile = isIceMobile();
      const crack = {
        x: Math.random() * viewportWidth,
        y: Math.random() * viewportHeight,
        branches: [],
        life: 0,
        maxLife: mobile ? (120 + Math.random() * 60) : (200 + Math.random() * 100),
        opacity: 0,
        maxOpacity: mobile ? (0.38 + Math.random() * 0.18) : (0.7 + Math.random() * 0.25),
        spreadSpeed: mobile ? (0.5 + Math.random() * 0.25) : (0.3 + Math.random() * 0.3),
        growthPattern: Math.random() < 0.5 ? 'organic' : 'burst',
        mainDirection: Math.random() * Math.PI * 2,
        drawCrystals: !mobile
      };

      // Create main crack with realistic branching
      const numBranches = mobile ? (3 + Math.floor(Math.random() * 3)) : (6 + Math.floor(Math.random() * 7));
      for (let i = 0; i < numBranches; i++) {
        let angle, length;
        
        if (crack.growthPattern === 'organic') {
          // Organic growth - more natural angles
          angle = crack.mainDirection + (Math.random() - 0.5) * Math.PI * 0.8;
          length = 12 + Math.random() * 28; // 12-40px
        } else {
          // Burst pattern - more radial
          angle = (Math.PI * 2 / numBranches) * i + (Math.random() - 0.5) * 0.6;
          length = 18 + Math.random() * 22; // 18-40px
        }
        
        crack.branches.push({
          angle: angle,
          length: mobile ? length * 0.8 : length,
          currentLength: 0,
          subBranches: [],
          thickness: mobile ? (1 + Math.random() * 0.8) : (1.5 + Math.random() * 1.5),
          growthDelay: Math.random() * (mobile ? 10 : 20)
        });

        // Add realistic sub-branches
        if (Math.random() < (mobile ? 0.35 : 0.75)) {
          const numSubBranches = mobile ? 1 : (1 + Math.floor(Math.random() * 4));
          for (let j = 0; j < numSubBranches; j++) {
            const subAngle = angle + (Math.random() - 0.5) * 1.8;
            const subLength = length * (0.25 + Math.random() * 0.35);
            const subDelay = Math.random() * 15;
            
            crack.branches[i].subBranches.push({
              angle: subAngle,
              length: subLength,
              currentLength: 0,
              subSubBranches: [],
              thickness: 0.8 + Math.random() * 0.8,
              growthDelay: subDelay
            });

            // Add realistic sub-sub-branches
            if (!mobile && Math.random() < 0.6) {
              const numSubSubBranches = 1 + Math.floor(Math.random() * 2);
              for (let k = 0; k < numSubSubBranches; k++) {
                const subSubAngle = subAngle + (Math.random() - 0.5) * 1.0;
                const subSubLength = subLength * (0.3 + Math.random() * 0.4);
                const subSubDelay = subDelay + Math.random() * 10;
                
                crack.branches[i].subBranches[j].subSubBranches.push({
                  angle: subSubAngle,
                  length: subSubLength,
                  currentLength: 0,
                  thickness: 0.4 + Math.random() * 0.4,
                  growthDelay: subSubDelay
                });
              }
            }
          }
        }
      }

      iceCracks.push(crack);
    };

    const drawIceCrack = (crack) => {
      const progress = crack.life / crack.maxLife;
      
      // Fade in and out
      if (progress < 0.2) {
        crack.opacity = crack.maxOpacity * (progress / 0.2);
      } else if (progress > 0.8) {
        crack.opacity = crack.maxOpacity * ((1 - progress) / 0.2);
      } else {
        crack.opacity = crack.maxOpacity;
      }

      // Draw realistic ice cracks with variable thickness
      crack.branches.forEach(branch => {
        // Handle growth delay for realistic appearance
        if (branch.currentLength === 0 && crack.life < branch.growthDelay) {
          return; // Wait for growth delay
        }
        
        // Grow the branch
        if (branch.currentLength < branch.length) {
          branch.currentLength = Math.min(branch.length, branch.currentLength + crack.spreadSpeed);
        }

        const endX = crack.x + Math.cos(branch.angle) * branch.currentLength;
        const endY = crack.y + Math.sin(branch.angle) * branch.currentLength;

        // Draw main branch with realistic thickness
        iceCrackCtx.strokeStyle = `rgba(238, 252, 255, ${crack.opacity})`;
        iceCrackCtx.lineWidth = branch.thickness;
        iceCrackCtx.lineCap = 'round';
        iceCrackCtx.lineJoin = 'round';
        
        iceCrackCtx.beginPath();
        iceCrackCtx.moveTo(crack.x, crack.y);
        iceCrackCtx.lineTo(endX, endY);
        iceCrackCtx.stroke();

        // Add ice crystal texture to main branch
        if (crack.drawCrystals && branch.currentLength > 5) {
          const numCrystals = Math.floor(branch.currentLength / 8);
          for (let c = 0; c < numCrystals; c++) {
            const crystalX = crack.x + Math.cos(branch.angle) * (branch.currentLength * (c + 1) / (numCrystals + 1));
            const crystalY = crack.y + Math.sin(branch.angle) * (branch.currentLength * (c + 1) / (numCrystals + 1));
            const crystalSize = 1 + Math.random() * 2;
            
            iceCrackCtx.fillStyle = `rgba(255, 255, 255, ${crack.opacity * 0.3})`;
            iceCrackCtx.beginPath();
            iceCrackCtx.arc(crystalX, crystalY, crystalSize, 0, Math.PI * 2);
            iceCrackCtx.fill();
          }
        }

        // Draw sub-branches with realistic timing
        branch.subBranches.forEach(subBranch => {
          if (branch.currentLength > branch.length * 0.3 && crack.life > subBranch.growthDelay) {
            const subProgress = (branch.currentLength - branch.length * 0.3) / (branch.length * 0.7);
            subBranch.currentLength = Math.min(subBranch.length, subBranch.length * subProgress);

            const subEndX = endX + Math.cos(subBranch.angle) * subBranch.currentLength;
            const subEndY = endY + Math.sin(subBranch.angle) * subBranch.currentLength;

            iceCrackCtx.strokeStyle = `rgba(220, 248, 255, ${crack.opacity * 0.8})`;
            iceCrackCtx.lineWidth = subBranch.thickness;
            iceCrackCtx.lineCap = 'round';
            
            iceCrackCtx.beginPath();
            iceCrackCtx.moveTo(endX, endY);
            iceCrackCtx.lineTo(subEndX, subEndY);
            iceCrackCtx.stroke();

            // Add smaller crystals to sub-branches
            if (crack.drawCrystals && subBranch.currentLength > 3) {
              const numSubCrystals = Math.floor(subBranch.currentLength / 12);
              for (let c = 0; c < numSubCrystals; c++) {
                const subCrystalX = subEndX + Math.cos(subBranch.angle) * (subBranch.currentLength * (c + 1) / (numSubCrystals + 1));
                const subCrystalY = subEndY + Math.sin(subBranch.angle) * (subBranch.currentLength * (c + 1) / (numSubCrystals + 1));
                const subCrystalSize = 0.5 + Math.random() * 1;
                
                iceCrackCtx.fillStyle = `rgba(255, 255, 255, ${crack.opacity * 0.2})`;
                iceCrackCtx.beginPath();
                iceCrackCtx.arc(subCrystalX, subCrystalY, subCrystalSize, 0, Math.PI * 2);
                iceCrackCtx.fill();
              }
            }

            // Draw sub-sub-branches
            subBranch.subSubBranches.forEach(subSubBranch => {
              if (subBranch.currentLength > subBranch.length * 0.4 && crack.life > subSubBranch.growthDelay) {
                const subSubProgress = (subBranch.currentLength - subBranch.length * 0.4) / (subBranch.length * 0.6);
                subSubBranch.currentLength = Math.min(subSubBranch.length, subSubBranch.length * subSubProgress);

                const subSubEndX = subEndX + Math.cos(subSubBranch.angle) * subSubBranch.currentLength;
                const subSubEndY = subEndY + Math.sin(subSubBranch.angle) * subSubBranch.currentLength;

                iceCrackCtx.strokeStyle = `rgba(200, 240, 255, ${crack.opacity * 0.6})`;
                iceCrackCtx.lineWidth = subSubBranch.thickness;
                iceCrackCtx.lineCap = 'round';
                
                iceCrackCtx.beginPath();
                iceCrackCtx.moveTo(subEndX, subEndY);
                iceCrackCtx.lineTo(subSubEndX, subSubEndY);
                iceCrackCtx.stroke();
              }
            });
          }
        });
      });
    };

    const updateIceCracks = (timestamp) => {
      const mobile = isIceMobile();
      // Create new cracks less frequently
      if (timestamp >= nextIceCrackAt) {
        if (iceCracks.length < (mobile ? 1 : 4)) {
          createIceCrack();
          lastCrackTime = timestamp;
          scheduleNextIceCrack(timestamp);
        } else {
          scheduleNextIceCrack(timestamp);
        }
      }

      // Update and draw existing cracks
      if (mobile && iceCracks.length === 0) return;
      iceCrackCtx.clearRect(0, 0, viewportWidth, viewportHeight);
      
      for (let i = iceCracks.length - 1; i >= 0; i--) {
        const crack = iceCracks[i];
        crack.life += 1;

        if (crack.life > crack.maxLife) {
          iceCracks.splice(i, 1);
        } else {
          drawIceCrack(crack);
        }
      }
    };

    const animateIceCracks = (timestamp) => {
      if (!iceRunning) return;
      const frameDelay = isIceMobile() ? 120 : 33;
      if (timestamp - lastIceFrame < frameDelay) {
        iceCrackAnimationId = requestAnimationFrame(animateIceCracks);
        return;
      }
      lastIceFrame = timestamp;
      updateIceCracks(timestamp);
      iceCrackAnimationId = requestAnimationFrame(animateIceCracks);
    };

    let iceRunning = false;

    const startIceCracks = () => {
      if (iceRunning) return;
      iceRunning = true;
      lastCrackTime = performance.now();
      lastIceFrame = 0;
      scheduleNextIceCrack(lastCrackTime);
      window.setTimeout(() => {
        if (!iceRunning) return;
        if (iceCracks.length === 0) {
          createIceCrack();
          lastCrackTime = performance.now();
          scheduleNextIceCrack(lastCrackTime);
        }
      }, 700);
      iceCrackAnimationId = requestAnimationFrame(animateIceCracks);
    };

    const stopIceCracks = () => {
      iceRunning = false;
      if (iceCrackAnimationId) cancelAnimationFrame(iceCrackAnimationId);
      iceCrackAnimationId = null;
      lastCrackTime = 0;
      lastIceFrame = 0;
      nextIceCrackAt = 0;
      iceCracks.length = 0;
      iceCrackCtx.clearRect(0, 0, viewportWidth, viewportHeight);
    };

    resizeIceCrackCanvas();
    window.addEventListener('resize', resizeIceCrackCanvas);
    bindThemeLifecycle(
      iceThemes,
      () => {
        if (!iceRunning) startIceCracks();
      },
      stopIceCracks
    );
  }
}

// Cherry Blossom Canvas Animation System
const cherryCanvas = document.getElementById('cherryCanvas');
if (cherryCanvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const cherryCtx = cherryCanvas.getContext('2d');
  if (cherryCtx) {
    let cherryAnimationId = null;
    let viewportWidth = 0, viewportHeight = 0, dpr = 1;
    const cherryPetals = [];
    let lastPetalTime = 0;

    const resizeCherryCanvas = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      cherryCanvas.width = Math.floor(viewportWidth * dpr);
      cherryCanvas.height = Math.floor(viewportHeight * dpr);
      cherryCanvas.style.width = `${viewportWidth}px`;
      cherryCanvas.style.height = `${viewportHeight}px`;
      cherryCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const createCherryPetal = () => {
      const petal = {
        x: Math.random() * viewportWidth,
        y: -20,
        vx: (Math.random() - 0.5) * 1.5,
        vy: Math.random() * 1.5 + 0.8,
        size: Math.random() * 8 + 4,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.08,
        swaySpeed: Math.random() * 0.02 + 0.01,
        swayAmount: Math.random() * 30 + 20,
        life: 0,
        ttl: Math.random() * 200 + 300,
        opacity: Math.random() * 0.5 + 0.4,
        // Realistic sakura palette: mix of very pale (almost white) and soft pinks
        color: Math.random() < 0.3 ?
          `rgba(255, 240, 245, ` : // LavenderBlush (Very pale)
          (Math.random() < 0.6 ?
            `rgba(255, 183, 197, ` : // Classic Sakura Pink
            `rgba(255, 192, 203, `   // Soft Pink
          ),
        type: Math.floor(Math.random() * 3) // Different petal shapes
      };
      cherryPetals.push(petal);
    };

    const drawCherryPetal = (petal) => {
      cherryCtx.save();
      cherryCtx.translate(petal.x, petal.y);
      cherryCtx.rotate(petal.rotation);
      
      // Set color with opacity
      const alpha = petal.opacity * Math.max(0, 1 - petal.life / petal.ttl);
      cherryCtx.fillStyle = petal.color + alpha + ')';
      
      // Draw different petal shapes
      if (petal.type === 0) {
        // Heart-shaped petal
        cherryCtx.beginPath();
        cherryCtx.moveTo(0, -petal.size/2);
        cherryCtx.bezierCurveTo(
          -petal.size/2, -petal.size, -petal.size, -petal.size/2, -petal.size, 0
        );
        cherryCtx.bezierCurveTo(
          -petal.size, petal.size/2, -petal.size/2, petal.size, 0, petal.size
        );
        cherryCtx.bezierCurveTo(
          petal.size/2, petal.size, petal.size, petal.size/2, petal.size, 0
        );
        cherryCtx.bezierCurveTo(
          petal.size, -petal.size/2, petal.size/2, -petal.size, 0, -petal.size/2
        );
        cherryCtx.fill();
      } else if (petal.type === 1) {
        // Round petal
        cherryCtx.beginPath();
        cherryCtx.ellipse(0, 0, petal.size/2, petal.size/3, 0, 0, Math.PI * 2);
        cherryCtx.fill();
      } else {
        // Teardrop petal
        cherryCtx.beginPath();
        cherryCtx.moveTo(0, -petal.size/2);
        cherryCtx.bezierCurveTo(
          -petal.size/3, -petal.size/2, -petal.size/3, petal.size/4, 0, petal.size/2
        );
        cherryCtx.bezierCurveTo(
          petal.size/3, petal.size/4, petal.size/3, -petal.size/2, 0, -petal.size/2
        );
        cherryCtx.fill();
      }
      
      cherryCtx.restore();
    };

    const updateCherryPetals = (timestamp) => {
      // Create new petals
      if (timestamp - lastPetalTime > 80 + Math.random() * 120) {
        if (cherryPetals.length < 80) {
          createCherryPetal();
          lastPetalTime = timestamp;
        }
      }

      // Update and draw petals
      cherryCtx.clearRect(0, 0, viewportWidth, viewportHeight);
      
      for (let i = cherryPetals.length - 1; i >= 0; i--) {
        const petal = cherryPetals[i];
        petal.life += 1;
        
        // Update position with swaying motion
        petal.x += petal.vx + Math.sin(petal.life * petal.swaySpeed) * petal.swayAmount * 0.01;
        petal.y += petal.vy;
        petal.rotation += petal.rotationSpeed;

        // Remove if out of bounds or expired
        if (petal.life > petal.ttl || petal.y > viewportHeight + 20) {
          cherryPetals.splice(i, 1);
          continue;
        }

        drawCherryPetal(petal);
      }
    };

    let cherryRunning = false;

    const animateCherryPetals = (timestamp) => {
      if (!cherryRunning) return;
      updateCherryPetals(timestamp);
      cherryAnimationId = requestAnimationFrame(animateCherryPetals);
    };

    const startCherryPetals = () => {
      if (cherryRunning) return;
      cherryRunning = true;
      lastPetalTime = 0;
      cherryAnimationId = requestAnimationFrame(animateCherryPetals);
    };

    const stopCherryPetals = () => {
      cherryRunning = false;
      if (cherryAnimationId) cancelAnimationFrame(cherryAnimationId);
      cherryAnimationId = null;
      lastPetalTime = 0;
      cherryPetals.length = 0;
      cherryCtx.clearRect(0, 0, viewportWidth, viewportHeight);
    };

    resizeCherryCanvas();
    window.addEventListener('resize', resizeCherryCanvas);
    bindThemeLifecycle(cherryThemes, startCherryPetals, stopCherryPetals);
  }
}

// Storm Theme Canvas Animation
const stormCanvas = document.getElementById('stormCanvas');
if (stormCanvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const stormCtx = stormCanvas.getContext('2d');
  if (stormCtx) {
    let viewportWidth = 0, viewportHeight = 0, dpr = 1, lastFrame = 0, stormPhase = 0;
    const raindrops = [], lightningBolts = [], stormClouds = [];
    let stormRunning = false;
    let stormAnimId = null;

    const resizeStormCanvas = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      stormCanvas.width = Math.floor(viewportWidth * dpr);
      stormCanvas.height = Math.floor(viewportHeight * dpr);
      stormCanvas.style.width = `${viewportWidth}px`;
      stormCanvas.style.height = `${viewportHeight}px`;
      stormCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawnRaindrop = () => {
      raindrops.push({
        x: Math.random() * viewportWidth,
        y: -20,
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * 8 + 12,
        length: Math.random() * 15 + 10,
        opacity: Math.random() * 0.6 + 0.2,
        life: 0,
        ttl: Math.random() * 60 + 80,
      });
    };

    const spawnLightning = () => {
      if (Math.random() < 0.012) {
        lightningBolts.push({
          x: Math.random() * viewportWidth,
          y: 0,
          targetY: viewportHeight * (0.6 + Math.random() * 0.3),
          branches: [],
          life: 0,
          ttl: 10,
          opacity: 1,
          mainBranch: true,
        });
      }
    };

    const generateLightningPath = (startX, startY, endY) => {
      const path = [{x: startX, y: startY}];
      let currentX = startX;
      let currentY = startY;
      const segments = 8;
      
      for (let i = 1; i <= segments; i++) {
        currentY = startY + (endY - startY) * (i / segments);
        currentX += (Math.random() - 0.5) * 40;
        path.push({x: currentX, y: currentY});
      }
      
      return path;
    };

    const drawStormClouds = (time) => {
      stormCtx.clearRect(0, 0, viewportWidth, viewportHeight);
      
      // Draw storm clouds
      for (let i = 0; i < 4; i++) {
        const x = (viewportWidth / 5) * (i + 1) + Math.sin(time * 0.0003 + i) * 30;
        const y = viewportHeight * 0.15 + Math.cos(time * 0.0002 + i * 2) * 10;
        const radius = 60 + Math.sin(time * 0.001 + i) * 15;
        
        const gradient = stormCtx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(45, 43, 84, ${0.4 - i * 0.05})`);
        gradient.addColorStop(0.5, `rgba(28, 26, 54, ${0.25 - i * 0.03})`);
        gradient.addColorStop(1, 'rgba(14, 14, 24, 0)');
        
        stormCtx.fillStyle = gradient;
        stormCtx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
    };

    const drawLightningBolt = (bolt) => {
      if (!bolt.path) {
        bolt.path = generateLightningPath(bolt.x, bolt.y, bolt.targetY);
      }
      
      stormCtx.strokeStyle = `rgba(196, 212, 255, ${bolt.opacity})`;
      stormCtx.lineWidth = bolt.mainBranch ? 3 : 1.5;
      stormCtx.shadowBlur = 20;
      stormCtx.shadowColor = `rgba(196, 212, 255, ${bolt.opacity * 0.8})`;
      
      stormCtx.beginPath();
      bolt.path.forEach((point, index) => {
        if (index === 0) {
          stormCtx.moveTo(point.x, point.y);
        } else {
          stormCtx.lineTo(point.x, point.y);
        }
        
        // Add branches
        if (bolt.mainBranch && Math.random() < 0.3 && index > 2 && index < bolt.path.length - 2) {
          const branchLength = 30 + Math.random() * 40;
          const branchAngle = (Math.random() - 0.5) * Math.PI / 3;
          const endX = point.x + Math.cos(branchAngle) * branchLength;
          const endY = point.y + Math.abs(Math.sin(branchAngle)) * branchLength;
          
          stormCtx.moveTo(point.x, point.y);
          stormCtx.lineTo(endX, endY);
        }
      });
      stormCtx.stroke();
      stormCtx.shadowBlur = 0;
    };

    const updateStormParticles = () => {
      const spawnCount = Math.max(3, Math.floor(viewportWidth / 90));
      for (let i = 0; i < spawnCount; i++) {
        if (raindrops.length < 150) spawnRaindrop();
      }
      spawnLightning();

      // Update and draw raindrops
      stormCtx.globalCompositeOperation = 'lighter';
      for (let i = raindrops.length - 1; i >= 0; i--) {
        const drop = raindrops[i];
        drop.life += 1;
        drop.x += drop.vx;
        drop.y += drop.vy;
        drop.vy += 0.3; // Gravity

        const t = drop.life / drop.ttl;
        const alpha = drop.opacity * Math.max(0, 1 - t);
        
        if (alpha <= 0 || drop.y > viewportHeight + 20) {
          raindrops.splice(i, 1);
          continue;
        }

        stormCtx.strokeStyle = `rgba(176, 198, 255, ${alpha})`;
        stormCtx.lineWidth = 1;
        stormCtx.beginPath();
        stormCtx.moveTo(drop.x, drop.y);
        stormCtx.lineTo(drop.x - drop.vx * 0.5, drop.y - drop.length);
        stormCtx.stroke();
      }

      // Update and draw lightning
      for (let i = lightningBolts.length - 1; i >= 0; i--) {
        const bolt = lightningBolts[i];
        bolt.life += 1;
        
        if (bolt.life === 1) {
          // Flash effect
          stormCtx.fillStyle = `rgba(210, 226, 255, ${bolt.opacity * 0.22})`;
          stormCtx.fillRect(0, 0, viewportWidth, viewportHeight);
        }
        
        bolt.opacity *= 0.85;
        
        if (bolt.life > bolt.ttl || bolt.opacity < 0.01) {
          lightningBolts.splice(i, 1);
          continue;
        }

        drawLightningBolt(bolt);
      }
      
      stormCtx.globalCompositeOperation = 'source-over';
    };

    const animateStorm = (timestamp) => {
      if (!stormRunning) return;
      if (timestamp - lastFrame < 20) {
        stormAnimId = requestAnimationFrame(animateStorm);
        return;
      }
      lastFrame = timestamp;
      stormPhase += 0.02;
      drawStormClouds(timestamp);
      updateStormParticles();
      stormAnimId = requestAnimationFrame(animateStorm);
    };

    const startStorm = () => {
      if (stormRunning) return;
      stormRunning = true;
      lastFrame = 0;
      stormAnimId = requestAnimationFrame(animateStorm);
    };

    const stopStorm = () => {
      stormRunning = false;
      if (stormAnimId) cancelAnimationFrame(stormAnimId);
      stormAnimId = null;
      lastFrame = 0;
      stormPhase = 0;
      raindrops.length = 0;
      lightningBolts.length = 0;
      stormClouds.length = 0;
      stormCtx.clearRect(0, 0, viewportWidth, viewportHeight);
    };

    resizeStormCanvas();
    window.addEventListener('resize', resizeStormCanvas);
    bindThemeLifecycle(stormThemes, startStorm, stopStorm);
  }
}

// Space Theme Canvas Animation
const spaceCanvas = document.getElementById('spaceCanvas');
if (spaceCanvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const spaceCtx = spaceCanvas.getContext('2d');
  if (spaceCtx) {
    let viewportWidth = 0, viewportHeight = 0, dpr = 1, lastFrame = 0, spacePhase = 0;
    const stars = [], nebulae = [], shootingStars = [];
    let spaceRunning = false;
    let spaceAnimId = null;

    const resizeSpaceCanvas = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      spaceCanvas.width = Math.floor(viewportWidth * dpr);
      spaceCanvas.height = Math.floor(viewportHeight * dpr);
      spaceCanvas.style.width = `${viewportWidth}px`;
      spaceCanvas.style.height = `${viewportHeight}px`;
      spaceCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const createStar = () => {
      stars.push({
        x: Math.random() * viewportWidth,
        y: Math.random() * viewportHeight,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random() * 0.8 + 0.2,
        twinkleSpeed: Math.random() * 0.014 + 0.004,
        twinklePhase: Math.random() * Math.PI * 2,
        color: Math.random() < 0.7 ? 'white' : (Math.random() < 0.5 ? 'blue' : 'yellow'),
      });
    };

    const createNebula = () => {
      nebulae.push({
        x: Math.random() * viewportWidth,
        y: Math.random() * viewportHeight,
        radius: Math.random() * 100 + 50,
        color: Math.random() < 0.33 ? 'purple' : (Math.random() < 0.5 ? 'blue' : 'pink'),
        opacity: Math.random() * 0.2 + 0.1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.001,
      });
    };

    const createShootingStar = () => {
      if (Math.random() < 0.003) {
        const fromLeft = Math.random() < 0.5;
        shootingStars.push({
          x: fromLeft ? -50 : viewportWidth + 50,
          y: Math.random() * viewportHeight * 0.6,
          vx: fromLeft ? (Math.random() * 8 + 4) : -(Math.random() * 8 + 4),
          vy: Math.random() * 2 + 1,
          length: Math.random() * 80 + 40,
          opacity: 1,
          life: 0,
          ttl: Math.random() * 40 + 30,
        });
      }
    };

    const drawNebulaBackground = (time) => {
      spaceCtx.clearRect(0, 0, viewportWidth, viewportHeight);
      
      // Draw nebulae
      for (const nebula of nebulae) {
        nebula.rotation += nebula.rotationSpeed;
        
        spaceCtx.save();
        spaceCtx.translate(nebula.x, nebula.y);
        spaceCtx.rotate(nebula.rotation);
        
        const gradient = spaceCtx.createRadialGradient(0, 0, 0, 0, 0, nebula.radius);
        
        if (nebula.color === 'purple') {
          gradient.addColorStop(0, `rgba(142, 132, 238, ${nebula.opacity})`);
          gradient.addColorStop(0.5, `rgba(88, 136, 224, ${nebula.opacity * 0.6})`);
          gradient.addColorStop(1, 'rgba(36, 38, 87, 0)');
        } else if (nebula.color === 'blue') {
          gradient.addColorStop(0, `rgba(165, 194, 255, ${nebula.opacity})`);
          gradient.addColorStop(0.5, `rgba(153, 176, 242, ${nebula.opacity * 0.6})`);
          gradient.addColorStop(1, 'rgba(36, 38, 87, 0)');
        } else {
          gradient.addColorStop(0, `rgba(255, 182, 193, ${nebula.opacity})`);
          gradient.addColorStop(0.5, `rgba(255, 154, 180, ${nebula.opacity * 0.6})`);
          gradient.addColorStop(1, 'rgba(36, 38, 87, 0)');
        }
        
        spaceCtx.fillStyle = gradient;
        spaceCtx.fillRect(-nebula.radius, -nebula.radius, nebula.radius * 2, nebula.radius * 2);
        spaceCtx.restore();
      }
    };

    const drawStar = (star, time) => {
      const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase) * 0.5 + 0.5;
      const alpha = star.brightness * twinkle;
      
      let color = `rgba(236, 243, 255, ${alpha})`;
      if (star.color === 'blue') {
        color = `rgba(165, 194, 255, ${alpha})`;
      } else if (star.color === 'yellow') {
        color = `rgba(255, 248, 220, ${alpha})`;
      }
      
      spaceCtx.fillStyle = color;
      spaceCtx.beginPath();
      spaceCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      spaceCtx.fill();
      
      // Add glow for brighter stars
      if (star.brightness > 0.6) {
        const glowGradient = spaceCtx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, star.size * 4
        );
        glowGradient.addColorStop(0, color);
        glowGradient.addColorStop(1, 'rgba(236, 243, 255, 0)');
        spaceCtx.fillStyle = glowGradient;
        spaceCtx.fillRect(star.x - star.size * 4, star.y - star.size * 4, star.size * 8, star.size * 8);
      }
    };

    const drawShootingStar = (star) => {
      spaceCtx.save();
      spaceCtx.translate(star.x, star.y);
      
      const angle = Math.atan2(star.vy, star.vx);
      spaceCtx.rotate(angle);
      
      const gradient = spaceCtx.createLinearGradient(-star.length, 0, 0, 0);
      gradient.addColorStop(0, `rgba(236, 243, 255, 0)`);
      gradient.addColorStop(0.7, `rgba(236, 243, 255, ${star.opacity * 0.5})`);
      gradient.addColorStop(1, `rgba(255, 255, 255, ${star.opacity})`);
      
      spaceCtx.strokeStyle = gradient;
      spaceCtx.lineWidth = 2;
      spaceCtx.beginPath();
      spaceCtx.moveTo(-star.length, 0);
      spaceCtx.lineTo(0, 0);
      spaceCtx.stroke();
      
      // Add bright head
      spaceCtx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
      spaceCtx.beginPath();
      spaceCtx.arc(0, 0, 2, 0, Math.PI * 2);
      spaceCtx.fill();
      
      spaceCtx.restore();
    };

    const updateSpaceParticles = (time) => {
      // Initialize stars if needed
      if (stars.length < 220) {
        for (let i = 0; i < 5; i++) createStar();
      }
      
      // Initialize nebulae if needed
      if (nebulae.length < 3) {
        createNebula();
      }
      
      createShootingStar();

      // Draw all stars
      spaceCtx.globalCompositeOperation = 'lighter';
      for (const star of stars) {
        star.x += (0.005 + (star.brightness * 0.01));
        if (star.x > viewportWidth + 10) star.x = -10;
        drawStar(star, time);
      }

      // Update and draw shooting stars
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const star = shootingStars[i];
        star.life += 1;
        star.x += star.vx;
        star.y += star.vy;

        const t = star.life / star.ttl;
        star.opacity = Math.max(0, 1 - t);
        
        if (star.opacity <= 0 || star.x < -100 || star.x > viewportWidth + 100 || star.y > viewportHeight + 50) {
          shootingStars.splice(i, 1);
          continue;
        }

        drawShootingStar(star);
      }
      
      spaceCtx.globalCompositeOperation = 'source-over';
    };

    const animateSpace = (timestamp) => {
      if (!spaceRunning) return;
      if (timestamp - lastFrame < 50) {
        spaceAnimId = requestAnimationFrame(animateSpace);
        return;
      }
      lastFrame = timestamp;
      spacePhase += 0.005;
      drawNebulaBackground(timestamp);
      updateSpaceParticles(timestamp);
      spaceAnimId = requestAnimationFrame(animateSpace);
    };

    const startSpace = () => {
      if (spaceRunning) return;
      spaceRunning = true;
      lastFrame = 0;
      spaceAnimId = requestAnimationFrame(animateSpace);
    };

    const stopSpace = () => {
      spaceRunning = false;
      if (spaceAnimId) cancelAnimationFrame(spaceAnimId);
      spaceAnimId = null;
      lastFrame = 0;
      spaceCtx.clearRect(0, 0, viewportWidth, viewportHeight);
    };

    // Initialize
    for (let i = 0; i < 170; i++) createStar();
    for (let i = 0; i < 2; i++) createNebula();
    
    resizeSpaceCanvas();
    window.addEventListener('resize', resizeSpaceCanvas);
    bindThemeLifecycle(spaceThemes, startSpace, stopSpace);
  }
}

// Garden Theme Canvas Animation
const gardenCanvas = document.getElementById('gardenCanvas');
if (gardenCanvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const gardenCtx = gardenCanvas.getContext('2d');
  if (gardenCtx) {
    let viewportWidth = 0, viewportHeight = 0, dpr = 1, lastFrame = 0, gardenPhase = 0;
    const petals = [], leaves = [], pollen = [], grassBlades = [];
    let gardenRunning = false;
    let gardenAnimId = null;

    const resizeGardenCanvas = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      gardenCanvas.width = Math.floor(viewportWidth * dpr);
      gardenCanvas.height = Math.floor(viewportHeight * dpr);
      gardenCanvas.style.width = `${viewportWidth}px`;
      gardenCanvas.style.height = `${viewportHeight}px`;
      gardenCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const createPetal = () => {
      petals.push({
        x: Math.random() * viewportWidth,
        y: -20,
        vx: (Math.random() - 0.5) * 1.5,
        vy: Math.random() * 1.5 + 0.8,
        size: Math.random() * 8 + 4,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        swayPhase: Math.random() * Math.PI * 2,
        color: Math.random() < 0.25 ? 'pink' : (Math.random() < 0.5 ? 'white' : 'purple'),
        opacity: Math.random() * 0.7 + 0.3,
        life: 0,
        ttl: Math.random() * 200 + 300,
      });
    };

    const createLeaf = () => {
      leaves.push({
        x: Math.random() * viewportWidth,
        y: -20,
        vx: (Math.random() - 0.5) * 1,
        vy: Math.random() * 1.2 + 0.6,
        size: Math.random() * 10 + 6,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.03,
        swayPhase: Math.random() * Math.PI * 2,
        opacity: Math.random() * 0.6 + 0.2,
        life: 0,
        ttl: Math.random() * 250 + 350,
      });
    };

    const createPollen = () => {
      pollen.push({
        x: Math.random() * viewportWidth,
        y: Math.random() * viewportHeight,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -Math.random() * 0.5 - 0.2,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.4 + 0.1,
        life: 0,
        ttl: Math.random() * 150 + 200,
        wobble: Math.random() * Math.PI * 2,
      });
    };

    const createGrassBlade = () => {
      grassBlades.push({
        x: Math.random() * viewportWidth,
        baseY: viewportHeight,
        height: Math.random() * 40 + 20,
        swayAmount: Math.random() * 10 + 5,
        swaySpeed: Math.random() * 0.02 + 0.01,
        phase: Math.random() * Math.PI * 2,
        thickness: Math.random() * 2 + 1,
        color: Math.random() < 0.5 ? 'light' : 'dark',
      });
    };

    const drawGardenBackground = (time) => {
      gardenCtx.clearRect(0, 0, viewportWidth, viewportHeight);
      
      // Draw soft ground gradient
      const groundGradient = gardenCtx.createLinearGradient(0, viewportHeight * 0.7, 0, viewportHeight);
      groundGradient.addColorStop(0, 'rgba(34, 69, 50, 0.1)');
      groundGradient.addColorStop(1, 'rgba(22, 43, 33, 0.2)');
      gardenCtx.fillStyle = groundGradient;
      gardenCtx.fillRect(0, viewportHeight * 0.7, viewportWidth, viewportHeight * 0.3);
    };

    const drawPetal = (petal, time) => {
      gardenCtx.save();
      gardenCtx.translate(petal.x, petal.y);
      gardenCtx.rotate(petal.rotation);
      
      const sway = Math.sin(time * 0.002 + petal.swayPhase) * 10;
      gardenCtx.translate(sway, 0);
      
      let color = `rgba(255, 182, 193, ${petal.opacity})`;
      if (petal.color === 'white') {
        color = `rgba(255, 248, 240, ${petal.opacity})`;
      } else if (petal.color === 'purple') {
        color = `rgba(221, 160, 221, ${petal.opacity})`;
      }
      
      gardenCtx.fillStyle = color;
      gardenCtx.beginPath();
      gardenCtx.ellipse(0, 0, petal.size, petal.size * 0.6, 0, 0, Math.PI * 2);
      gardenCtx.fill();
      
      gardenCtx.restore();
    };

    const drawLeaf = (leaf, time) => {
      gardenCtx.save();
      gardenCtx.translate(leaf.x, leaf.y);
      gardenCtx.rotate(leaf.rotation);
      
      const sway = Math.sin(time * 0.0015 + leaf.swayPhase) * 8;
      gardenCtx.translate(sway, 0);
      
      const color = leaf.color === 'light' ? 
        `rgba(157, 225, 154, ${leaf.opacity})` : 
        `rgba(124, 185, 122, ${leaf.opacity})`;
      
      gardenCtx.fillStyle = color;
      gardenCtx.beginPath();
      gardenCtx.ellipse(0, 0, leaf.size, leaf.size * 0.7, Math.PI / 6, 0, Math.PI * 2);
      gardenCtx.fill();
      
      gardenCtx.restore();
    };

    const drawGrassBlade = (blade, time) => {
      const sway = Math.sin(time * blade.swaySpeed + blade.phase) * blade.swayAmount;
      
      const color = blade.color === 'light' ? 
        'rgba(140, 218, 151, 0.6)' : 
        'rgba(104, 180, 115, 0.7)';
      
      gardenCtx.strokeStyle = color;
      gardenCtx.lineWidth = blade.thickness;
      gardenCtx.lineCap = 'round';
      
      gardenCtx.beginPath();
      gardenCtx.moveTo(blade.x, blade.baseY);
      
      // Create curved grass blade
      const segments = 5;
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const y = blade.baseY - (blade.height * t);
        const x = blade.x + (sway * t * t); // Quadratic curve
        gardenCtx.lineTo(x, y);
      }
      
      gardenCtx.stroke();
    };

    const updateGardenParticles = (time) => {
      const spawnCount = Math.max(1, Math.floor(viewportWidth / 200));
      for (let i = 0; i < spawnCount; i++) {
        if (petals.length < 34 && Math.random() < 0.34) createPetal();
        if (leaves.length < 24 && Math.random() < 0.22) createLeaf();
        if (pollen.length < 30 && Math.random() < 0.4) createPollen();
      }
      
      // Initialize grass if needed
      if (grassBlades.length < 60) {
        createGrassBlade();
      }

      // Draw grass first (background layer)
      for (const blade of grassBlades) {
        drawGrassBlade(blade, time);
      }

      // Update and draw particles
      gardenCtx.globalCompositeOperation = 'lighter';
      
      // Update petals
      for (let i = petals.length - 1; i >= 0; i--) {
        const petal = petals[i];
        petal.life += 1;
        petal.x += petal.vx + Math.sin(petal.life * 0.06 + petal.swayPhase) * 0.35;
        petal.y += petal.vy;
        petal.rotation += petal.rotationSpeed;

        const t = petal.life / petal.ttl;
        petal.opacity = petal.opacity * Math.max(0, 1 - t);
        
        if (petal.opacity <= 0.01 || petal.y > viewportHeight + 20) {
          petals.splice(i, 1);
          continue;
        }

        drawPetal(petal, time);
      }

      // Update leaves
      for (let i = leaves.length - 1; i >= 0; i--) {
        const leaf = leaves[i];
        leaf.life += 1;
        leaf.x += leaf.vx + Math.sin(leaf.life * 0.04 + leaf.swayPhase) * 0.22;
        leaf.y += leaf.vy;
        leaf.rotation += leaf.rotationSpeed;

        const t = leaf.life / leaf.ttl;
        leaf.opacity = leaf.opacity * Math.max(0, 1 - t);
        
        if (leaf.opacity <= 0.01 || leaf.y > viewportHeight + 20) {
          leaves.splice(i, 1);
          continue;
        }

        drawLeaf(leaf, time);
      }

      // Update pollen
      for (let i = pollen.length - 1; i >= 0; i--) {
        const p = pollen[i];
        p.life += 1;
        p.wobble += 0.05;
        p.x += p.vx + Math.sin(p.wobble) * 0.3;
        p.y += p.vy;

        const t = p.life / p.ttl;
        const alpha = p.opacity * Math.max(0, 1 - t);
        
        if (alpha <= 0.01 || p.y < -20) {
          pollen.splice(i, 1);
          continue;
        }

        gardenCtx.fillStyle = `rgba(205, 242, 176, ${alpha})`;
        gardenCtx.beginPath();
        gardenCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        gardenCtx.fill();
      }
      
      gardenCtx.globalCompositeOperation = 'source-over';
    };

    const animateGarden = (timestamp) => {
      if (!gardenRunning) return;
      if (timestamp - lastFrame < 45) {
        gardenAnimId = requestAnimationFrame(animateGarden);
        return;
      }
      lastFrame = timestamp;
      gardenPhase += 0.008;
      drawGardenBackground(timestamp);
      updateGardenParticles(timestamp);
      gardenAnimId = requestAnimationFrame(animateGarden);
    };

    const startGarden = () => {
      if (gardenRunning) return;
      gardenRunning = true;
      lastFrame = 0;
      gardenAnimId = requestAnimationFrame(animateGarden);
    };

    const stopGarden = () => {
      gardenRunning = false;
      if (gardenAnimId) cancelAnimationFrame(gardenAnimId);
      gardenAnimId = null;
      lastFrame = 0;
      gardenPhase = 0;
      petals.length = 0;
      leaves.length = 0;
      pollen.length = 0;
      gardenCtx.clearRect(0, 0, viewportWidth, viewportHeight);
    };

    // Initialize
    for (let i = 0; i < 30; i++) createGrassBlade();
    
    resizeGardenCanvas();
    window.addEventListener('resize', resizeGardenCanvas);
    bindThemeLifecycle(gardenThemes, startGarden, stopGarden);
  }
}

