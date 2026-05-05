const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

/* ── Global CSRF injection for all HTML POST forms ──────────────────────
   The meta tag in base.html always renders the token correctly.
   This listener ensures every <form method="post"> includes it
   as a hidden input before submission, preventing 400 Bad Request. */
document.addEventListener('submit', (e) => {
  const form = e.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (form.method.toLowerCase() !== 'post') return;
  if (!csrfToken) return;
  // Skip if the form already has a csrf_token input
  if (form.querySelector('input[name="csrf_token"]')) return;
  const hidden = document.createElement('input');
  hidden.type = 'hidden';
  hidden.name = 'csrf_token';
  hidden.value = csrfToken;
  form.appendChild(hidden);
});

const chatLaunch = document.getElementById('chatLaunch');
const chatPanel = document.getElementById('chatPanel');
const chatClose = document.getElementById('chatClose');
const chatResizeHandle = document.getElementById('chatResizeHandle');
const chatDragHandle = document.getElementById('chatDragHandle');
const chatForm = document.getElementById('chatForm');
const chatText = document.getElementById('chatText');
const chatMessages = document.getElementById('chatMessages');
const chatSubtitle = document.getElementById('chatSubtitle');
const bodyEl = document.body;

const ENABLE_CAMPFIRE_CANVAS = true;
const ENABLE_CAMPFIRE_EMBER_FIELD = false;

const THEME_META = {
  campfire: {
    subtitle: 'Warm and steady writing companion.',
    greeting: 'Hi. I am Aura. Let us write by the fire.',
    fallback: [
      'I am here with you. Want to tell me what is on your mind?',
      'That sounds meaningful. Want me to shape it into a page?',
      'Take a slow breath. We can write one line at a time.',
      'I am listening. Your words matter here.',
      'Want a gentle prompt to keep going?'
    ],
  },
  water: {
    subtitle: 'Calm and reflective flow.',
    greeting: 'Hi. I am Aura. Let us flow through your thoughts gently.',
    fallback: [
      'Let us slow down and look at this step by step.',
      'I hear you. What part feels most important right now?',
      'Would a calm writing prompt help you begin?',
    ],
  },
  wind: {
    subtitle: 'Fast, curious, and lightweight.',
    greeting: 'Hi. I am Aura. Quick idea mode is ready.',
    fallback: [
      'Short summary first: you have a strong idea. Want quick next steps?',
      'Tell me the goal and I will draft a fast outline.',
      'Want a quick brainstorm in five bullets?',
    ],
  },
  earth: {
    subtitle: 'Grounded, practical guidance.',
    greeting: 'Hi. I am Aura. We can build this in clear steps.',
    fallback: [
      'Let us ground this. What is the practical next step?',
      'I can turn this into a simple plan right now.',
      'Want a stable structure before you keep writing?',
    ],
  },
  ice: {
    subtitle: 'Clear and exact answers.',
    greeting: 'Hi. I am Aura. Clear mode is active.',
    fallback: [
      'Key point: define the core message in one sentence.',
      'I can make this sharper and more precise.',
      'Want a concise version with only essential facts?',
    ],
  },
  storm: {
    subtitle: 'High-energy rapid ideas.',
    greeting: 'Hi. I am Aura. Lightning mode is live.',
    fallback: [
      'Rapid plan: 1) Hook 2) Scene 3) Conflict 4) Finish.',
      'Want a bold version with more energy?',
      'I can fire out creative options fast.',
    ],
  },
  space: {
    subtitle: 'Big-picture and philosophical.',
    greeting: 'Hi. I am Aura. Let us connect the big ideas.',
    fallback: [
      'This links to a bigger theme. Want me to map it?',
      'I can connect your page to your wider story arc.',
      'Want an orbit view of ideas and how they relate?',
    ],
  },
  garden: {
    subtitle: 'Gentle, growth-focused support.',
    greeting: 'Hi. I am Aura. Let us grow this page softly.',
    fallback: [
      'Small step first. What line can we plant now?',
      'You are building momentum. Want the next gentle prompt?',
      'I can help this bloom while keeping your voice.',
    ],
  },
  cherry: {
    subtitle: 'Beautiful, fleeting moments of inspiration.',
    greeting: 'Hi. I am Aura. Let us catch these beautiful moments together.',
    fallback: [
      'This moment feels precious. Want to capture it gently?',
      'Like cherry blossoms, ideas are beautiful and brief. Let us hold this one.',
      'I can help you preserve this beautiful thought.',
      'This feels like a moment worth savoring. Want to explore it?',
    ],
  },
};

const chatHistory = [];
const MAX_CHAT_HISTORY = 10;
let getChatContext = () => null;
let activeTheme = (bodyEl && bodyEl.dataset.theme) ? bodyEl.dataset.theme : 'campfire';
const fireThemes = new Set(['campfire']);
const waterThemes = new Set(['water']);
const windThemes = new Set(['wind']);
const earthThemes = new Set(['earth']);
const iceThemes = new Set(['ice']);
const stormThemes = new Set(['storm']);
const spaceThemes = new Set(['space']);
const gardenThemes = new Set(['garden']);
const cherryThemes = new Set(['cherry']);
// Water uses its own canvas waves, so we skip DOM particle spans for it.
const particleThemes = new Set(['wind', 'earth', 'ice', 'storm', 'space', 'garden', 'cherry']);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const getThemeMeta = (theme) => THEME_META[theme] || THEME_META.campfire;

const setThemeState = (theme) => {
  const resolved = THEME_META[theme] ? theme : 'campfire';
  activeTheme = resolved;
  if (bodyEl) bodyEl.dataset.theme = resolved;
  if (chatSubtitle) chatSubtitle.textContent = getThemeMeta(resolved).subtitle;
  window.dispatchEvent(new CustomEvent('yw:themechange', { detail: { theme: resolved } }));
};

const bindThemeLifecycle = (themes, start, stop) => {
  const apply = (theme) => {
    const shouldRun = themes.has(theme) && !document.hidden;
    if (shouldRun) start();
    else stop();
  };
  window.addEventListener('yw:themechange', (event) => {
    const nextTheme = event && event.detail ? event.detail.theme : activeTheme;
    apply(nextTheme);
  });
  document.addEventListener('visibilitychange', () => apply(activeTheme));
  apply(activeTheme);
};

const syncCycleFromClock = () => {
  if (!bodyEl) return;
  const hour = new Date().getHours();
  bodyEl.dataset.cycle = (hour >= 6 && hour < 18) ? 'day' : 'night';
};
syncCycleFromClock();
window.setInterval(syncCycleFromClock, 5 * 60 * 1000);

const themeParticleLayer = document.getElementById('themeParticleLayer');
let particleRebuildTimer = null;

const particleConfig = {
  water: { count: 34, minSize: 3, maxSize: 8, minDur: 8, maxDur: 16, drift: 90, spin: 90 },
  wind: { count: 34, minSize: 1.6, maxSize: 4.2, minDur: 8, maxDur: 16, drift: 190, spin: 70 },
  earth: { count: 20, minSize: 3, maxSize: 7, minDur: 10, maxDur: 18, drift: 80, spin: 40 },
  ice: { count: 20, minSize: 2, maxSize: 6, minDur: 10, maxDur: 20, drift: 100, spin: 140 },
  storm: { count: 24, minSize: 2, maxSize: 6, minDur: 5, maxDur: 10, drift: 130, spin: 80 },
  space: { count: 36, minSize: 1, maxSize: 4, minDur: 12, maxDur: 24, drift: 60, spin: 180 },
  garden: { count: 26, minSize: 3, maxSize: 7, minDur: 9, maxDur: 17, drift: 95, spin: 150 },
  cherry: { count: 50, minSize: 2, maxSize: 7, minDur: 8, maxDur: 16, drift: 120, spin: 180 },
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
    let iceCrackAnimationId = null;

    const resizeIceCrackCanvas = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      iceCrackCanvas.width = Math.floor(viewportWidth * dpr);
      iceCrackCanvas.height = Math.floor(viewportHeight * dpr);
      iceCrackCanvas.style.width = `${viewportWidth}px`;
      iceCrackCanvas.style.height = `${viewportHeight}px`;
      iceCrackCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const createIceCrack = () => {
      const crack = {
        x: Math.random() * viewportWidth,
        y: Math.random() * viewportHeight,
        branches: [],
        life: 0,
        maxLife: 200 + Math.random() * 100, // 3.3-5 seconds
        opacity: 0,
        maxOpacity: 0.7 + Math.random() * 0.25, // Higher opacity for realism
        spreadSpeed: 0.3 + Math.random() * 0.3, // More controlled, realistic spread
        growthPattern: Math.random() < 0.5 ? 'organic' : 'burst',
        mainDirection: Math.random() * Math.PI * 2
      };

      // Create main crack with realistic branching
      const numBranches = 6 + Math.floor(Math.random() * 7); // 6-12 main branches
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
          length: length,
          currentLength: 0,
          subBranches: [],
          thickness: 1.5 + Math.random() * 1.5,
          growthDelay: Math.random() * 20 // Frames before starting growth
        });

        // Add realistic sub-branches
        if (Math.random() < 0.75) {
          const numSubBranches = 1 + Math.floor(Math.random() * 4);
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
            if (Math.random() < 0.6) {
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
        if (branch.currentLength > 5) {
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
            if (subBranch.currentLength > 3) {
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
      // Create new cracks less frequently
      if (timestamp - lastCrackTime > 1500 + Math.random() * 2000) { // Every 1.5-3.5 seconds
        if (iceCracks.length < 4) { // Allow up to 4 concurrent cracks
          createIceCrack();
          lastCrackTime = timestamp;
        }
      }

      // Update and draw existing cracks
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
      updateIceCracks(timestamp);
      iceCrackAnimationId = requestAnimationFrame(animateIceCracks);
    };

    let iceRunning = false;

    const startIceCracks = () => {
      if (iceRunning) return;
      iceRunning = true;
      lastCrackTime = performance.now();
      window.setTimeout(() => {
        if (!iceRunning) return;
        if (iceCracks.length === 0) createIceCrack();
      }, 700);
      iceCrackAnimationId = requestAnimationFrame(animateIceCracks);
    };

    const stopIceCracks = () => {
      iceRunning = false;
      if (iceCrackAnimationId) cancelAnimationFrame(iceCrackAnimationId);
      iceCrackAnimationId = null;
      lastCrackTime = 0;
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

function addMessage(text, who = 'user') {
  if (!chatMessages) return;
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${who}`;
  bubble.textContent = text;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return bubble;
}

function ensureGreeting() {
  if (!chatMessages || chatMessages.children.length > 0) return;
  const greeting = getThemeMeta(activeTheme).greeting;
  addMessage(greeting, 'bot');
  chatHistory.push({ role: 'assistant', content: greeting });
}

if (chatLaunch && chatPanel) {
  chatLaunch.addEventListener('click', () => {
    chatPanel.classList.add('open');
    chatPanel.setAttribute('aria-hidden', 'false');
    ensureGreeting();
  });
}

if (chatClose && chatPanel) {
  chatClose.addEventListener('click', () => {
    chatPanel.classList.remove('open');
    chatPanel.setAttribute('aria-hidden', 'true');
  });
}

if (chatResizeHandle && chatPanel) {
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;
  let dragging = false;

  let aspectRatio = null;

  const applySize = (width, height, keepRatio) => {
    const maxWidth = Math.min(window.innerWidth - 32, 520);
    const maxHeight = Math.min(window.innerHeight - 140, 640);
    let nextWidth = width;
    let nextHeight = height;
    if (keepRatio && aspectRatio) {
      if (Math.abs(width - startWidth) >= Math.abs(height - startHeight)) {
        nextHeight = nextWidth / aspectRatio;
      } else {
        nextWidth = nextHeight * aspectRatio;
      }
    }
    nextWidth = Math.max(280, Math.min(nextWidth, maxWidth));
    nextHeight = Math.max(260, Math.min(nextHeight, maxHeight));
    chatPanel.style.width = `${nextWidth}px`;
    chatPanel.style.height = `${nextHeight}px`;
    if (chatMessages) {
      chatMessages.style.maxHeight = `${Math.max(160, nextHeight - 140)}px`;
    }
  };

  const onMove = (event) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    applySize(startWidth + dx, startHeight + dy, true);
  };

  const stopDrag = () => {
    if (!dragging) return;
    dragging = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', stopDrag);
  };

  const startResize = (event) => {
    event.preventDefault();
    dragging = true;
    const rect = chatPanel.getBoundingClientRect();
    const touch = event.touches ? event.touches[0] : event;
    startX = touch.clientX;
    startY = touch.clientY;
    startWidth = rect.width;
    startHeight = rect.height;
    aspectRatio = startWidth / startHeight;
    
    if (event.touches) {
      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', stopDrag);
    } else {
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', stopDrag);
    }
  };

  const onTouchMove = (event) => {
    if (!dragging) return;
    onMove(event.touches[0]);
  };

  chatResizeHandle.addEventListener('mousedown', startResize);
  chatResizeHandle.addEventListener('touchstart', startResize, { passive: false });
}

if (chatDragHandle && chatPanel) {
  let dragStartX = 0;
  let dragStartY = 0;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let draggingPanel = false;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const onDragMove = (event) => {
    if (!draggingPanel) return;
    const maxLeft = window.innerWidth - chatPanel.offsetWidth - 8;
    const maxTop = window.innerHeight - chatPanel.offsetHeight - 8;
    const nextLeft = clamp(event.clientX - dragOffsetX, 8, Math.max(8, maxLeft));
    const nextTop = clamp(event.clientY - dragOffsetY, 8, Math.max(8, maxTop));
    chatPanel.style.left = `${nextLeft}px`;
    chatPanel.style.top = `${nextTop}px`;
    chatPanel.style.right = 'auto';
    chatPanel.style.bottom = 'auto';
  };

  const stopDragPanel = () => {
    if (!draggingPanel) return;
    draggingPanel = false;
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', stopDragPanel);
  };

  const startDragging = (event) => {
    event.preventDefault();
    const rect = chatPanel.getBoundingClientRect();
    const touch = event.touches ? event.touches[0] : event;
    dragStartX = touch.clientX;
    dragStartY = touch.clientY;
    dragOffsetX = dragStartX - rect.left;
    dragOffsetY = dragStartY - rect.top;
    draggingPanel = true;

    if (event.touches) {
      document.addEventListener('touchmove', onTouchDragMove, { passive: false });
      document.addEventListener('touchend', stopDragPanel);
    } else {
      document.addEventListener('mousemove', onDragMove);
      document.addEventListener('mouseup', stopDragPanel);
    }
  };

  const onTouchDragMove = (event) => {
    if (!draggingPanel) return;
    onDragMove(event.touches[0]);
  };

  chatDragHandle.addEventListener('mousedown', startDragging);
  chatDragHandle.addEventListener('touchstart', startDragging, { passive: false });
}

if (chatForm && chatText) {
  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = chatText.value.trim();
    if (!text) return;
    addMessage(text, 'user');
    chatText.value = '';
    const typingBubble = addMessage('Thinking...', 'bot');
    const historyPayload = chatHistory.slice(-MAX_CHAT_HISTORY);
    const pageContext = getChatContext();
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
      body: JSON.stringify({ message: text, history: historyPayload, context: pageContext }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data && data.theme) {
          setThemeState(data.theme);
          queueParticleRebuild(data.theme);
        }
        const reply = (data && data.reply) ? data.reply : null;
        if (!reply) throw new Error('No reply');
        typingBubble.textContent = reply;
        chatHistory.push({ role: 'user', content: text });
        chatHistory.push({ role: 'assistant', content: reply });
      })
      .catch(() => {
        const fallbackOptions = getThemeMeta(activeTheme).fallback;
        const fallback = fallbackOptions[Math.floor(Math.random() * fallbackOptions.length)];
        typingBubble.textContent = fallback;
        chatHistory.push({ role: 'user', content: text });
        chatHistory.push({ role: 'assistant', content: fallback });
      });
  });
}

const workspace = document.querySelector('.workspace');
if (workspace) {
  const entryType = workspace.dataset.entryType || 'diary';
  const entryList = document.getElementById('entryList');
  const newEntryBtn = document.getElementById('newEntryBtn');
  const deleteEntryBtn = document.getElementById('deleteEntryBtn');
  const prevBtn = document.getElementById('prevEntryBtn');
  const nextBtn = document.getElementById('nextEntryBtn');
  const titleInput = document.getElementById('entryTitle');
  const contentInput = document.getElementById('entryContent');
  const saveStatus = document.getElementById('saveStatus');
  const saveTime = document.getElementById('saveTime');
  const pageCount = document.getElementById('pageCount');
  const pageTurn = document.getElementById('pageTurn');
  const formatBoldBtn = document.getElementById('formatBoldBtn');
  const formatItalicBtn = document.getElementById('formatItalicBtn');
  const formatUnderlineBtn = document.getElementById('formatUnderlineBtn');
  const fontSizeSelect = document.getElementById('fontSizeSelect');

  const imagePrompt = document.getElementById('imagePrompt');
  const imageGenBtn = document.getElementById('imageGenBtn');
  const imagePreview = document.getElementById('imagePreview');
  const imageViewBtn = document.getElementById('imageViewBtn');
  const imageDownloadBtn = document.getElementById('imageDownloadBtn');
  const imageAttachBtn = document.getElementById('imageAttachBtn');
  const shareCodeInput = document.getElementById('shareCode');
  const shareCopyBtn = document.getElementById('shareCopyBtn');
  const shareGenerateBtn = document.getElementById('shareGenerateBtn');
  const shareRemoveBtn = document.getElementById('shareRemoveBtn');
  const imageModal = document.getElementById('imageModal');
  const imageModalImg = document.getElementById('imageModalImg');
  const imageModalClose = document.getElementById('imageModalClose');
  const pageIllustration = document.getElementById('pageIllustration');
  const pageIllustrationImg = document.getElementById('pageIllustrationImg');

  let shareModeSelect = document.getElementById('shareModeSelect');
  const shareModeBtn = document.getElementById('shareModeBtn');
  const shareModeMenu = document.getElementById('shareModeMenu');
  const shareModeOptions = shareModeMenu ? Array.from(shareModeMenu.querySelectorAll('.share-mode-option')) : [];
  if (!shareModeSelect) {
    shareModeSelect = document.createElement('input');
    shareModeSelect.type = 'hidden';
    shareModeSelect.id = 'shareModeSelect';
    shareModeSelect.value = 'story';
    if (shareGenerateBtn) {
      shareGenerateBtn.parentNode.insertBefore(shareModeSelect, shareGenerateBtn);
    }
  }

  const closeShareMenu = () => {
    if (!shareModeMenu || !shareModeBtn) return;
    shareModeMenu.classList.remove('open');
    shareModeBtn.setAttribute('aria-expanded', 'false');
  };

  const openShareMenu = () => {
    if (!shareModeMenu || !shareModeBtn) return;
    shareModeMenu.classList.add('open');
    shareModeBtn.setAttribute('aria-expanded', 'true');
  };

  const setShareMode = (value, label) => {
    if (shareModeSelect) shareModeSelect.value = value;
    if (shareModeBtn) shareModeBtn.textContent = label;
    if (shareModeOptions.length > 0) {
      shareModeOptions.forEach((option) => {
        const isActive = option.dataset.value === value;
        option.classList.toggle('is-active', isActive);
        option.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
    }
  };

  if (shareModeBtn && shareModeMenu) {
    shareModeBtn.addEventListener('click', () => {
      if (shareModeMenu.classList.contains('open')) closeShareMenu();
      else openShareMenu();
    });
    document.addEventListener('click', (event) => {
      if (!shareModeMenu.classList.contains('open')) return;
      if (shareModeMenu.contains(event.target) || shareModeBtn.contains(event.target)) return;
      closeShareMenu();
    });
    const syncShareMode = async (modeValue) => {
      const targetId = getActiveEntryId();
      if (!targetId || !shareCode) return;
      try {
        const response = await fetch(`/api/entry/${targetId}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
          body: JSON.stringify({ rotate: false, mode: modeValue }),
        });
        if (!response.ok) throw new Error('Share update failed');
        const data = await response.json();
        if (data.share_code) shareCode = data.share_code;
        updateShareUI();
        setStatus('Share mode updated');
      } catch (err) {
        setStatus('Share update failed');
      }
    };

    shareModeOptions.forEach((option) => {
      option.addEventListener('click', () => {
        const value = option.dataset.value || 'story';
        const label = option.textContent.trim();
        setShareMode(value, label);
        closeShareMenu();
        if (shareCode) {
          syncShareMode(value);
        }
      });
    });
  }

  getChatContext = () => {
    const title = ((titleInput && titleInput.value) || '').trim();
    const content = ((contentInput && contentInput.value) || '').trim();
    const pageLabel = ((pageCount && pageCount.textContent) || '').trim();
    if (!title && !content) return null;
    return {
      entry_type: entryType,
      entry_id: currentEntryId || null,
      title: title.slice(0, 220),
      content: content.slice(0, 5000),
      page_label: pageLabel.slice(0, 80),
    };
  };

  let entries = [];
  let currentIndex = -1;
  let currentEntryId = null;
  let currentImageUrl = null;
  let imageAttached = false;
  let imageStyleState = { x: 0, y: 0, width: null, height: null };
  const resizeHandle = document.getElementById('resizeHandle');
  document.addEventListener('imageStyleUpdate', (e) => {
    if (e.detail.x !== undefined) imageStyleState.x = e.detail.x;
    if (e.detail.y !== undefined) imageStyleState.y = e.detail.y;
    if (e.detail.width !== undefined) imageStyleState.width = e.detail.width;
    if (e.detail.height !== undefined) imageStyleState.height = e.detail.height;
    dirty = true;
    scheduleAutosave();
  });
  let imageError = null;
  let shareCode = null;
  let shareCanEditValue = false;
  let lastActiveIndex = -1;
  let dirty = false;
  let isSaving = false;
  let saveInFlight = null;
  let autosaveEnabled = true;
  let autosaveTimer = null;
  const defaultTitleStyle = {
    bold: false,
    italic: false,
    underline: false,
    fontSize: '1.4',
  };
  const defaultContentStyle = {
    bold: false,
    italic: false,
    underline: false,
    fontSize: '1.05',
  };
  const titleStyleState = { ...defaultTitleStyle };
  const contentStyleState = { ...defaultContentStyle };
  let activeEditorTarget = 'title';

  const setStatus = (text) => {
    if (saveStatus) saveStatus.textContent = text;
  };

  const setTime = (iso, prefix = 'Saved') => {
    if (!saveTime || !iso) return;
    const date = new Date(iso);
    saveTime.textContent = `${prefix} ${date.toLocaleTimeString()}`;
  };

  const scheduleAutosave = () => {
    if (!autosaveEnabled) return;
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      if (dirty) saveEntry({ auto: true });
    }, 3000);
  };

  const markDirty = () => {
    dirty = true;
    setStatus('Editing...');
    scheduleAutosave();
  };

  const animateTurn = (direction, callback) => {
    if (!pageTurn) {
      callback();
      return;
    }
    const turnClass = direction === 'prev' ? 'turn-prev' : 'turn-next';

    pageTurn.classList.remove('turn-next', 'turn-prev');
    void pageTurn.offsetWidth;
    pageTurn.classList.add(turnClass);
    setTimeout(callback, 260);
    setTimeout(() => {
      pageTurn.classList.remove('turn-next', 'turn-prev');
    }, 760);
  };

  const getActiveIndex = () => {
    const byId = entries.findIndex((entry) => entry.id === currentEntryId);
    if (byId >= 0) return byId;
    if (currentIndex >= 0 && currentIndex < entries.length) return currentIndex;
    if (lastActiveIndex >= 0 && lastActiveIndex < entries.length) return lastActiveIndex;
    if (entries.length > 0) return 0;
    return -1;
  };

  const updateNavButtons = () => {
    if (!prevBtn || !nextBtn) return;
    const activeIndex = getActiveIndex();
    const hasEntries = entries.length > 0 && activeIndex >= 0;
    prevBtn.disabled = !hasEntries || activeIndex <= 0;
    nextBtn.disabled = !hasEntries || activeIndex >= entries.length - 1;
    prevBtn.classList.toggle('disabled', prevBtn.disabled);
    nextBtn.classList.toggle('disabled', nextBtn.disabled);
  };

  const getActiveEntryId = () => {
    if (currentEntryId) return currentEntryId;
    const activeIndex = getActiveIndex();
    if (activeIndex >= 0 && entries[activeIndex]) return entries[activeIndex].id;
    return null;
  };

  const updateDeleteButton = () => {
    if (!deleteEntryBtn) return;
    deleteEntryBtn.disabled = !getActiveEntryId();
    deleteEntryBtn.classList.toggle('disabled', deleteEntryBtn.disabled);
  };

  const updateActiveTitleLabel = () => {
    if (!entryList || !titleInput) return;
    const activeIndex = getActiveIndex();
    if (activeIndex < 0 || !entries[activeIndex]) return;
    const rawTitle = titleInput.value || '';
    const displayTitle = rawTitle.trim() || 'Untitled';
    entries[activeIndex].title = displayTitle;
    const item = entryList.querySelector(`.entry-item[data-index="${activeIndex}"]`);
    if (item) item.textContent = displayTitle;
  };

  const updatePageCount = () => {
    if (!pageCount) return;
    const total = Math.max(1, entries.length);
    const activeIndex = Math.max(0, getActiveIndex());
    pageCount.textContent = `Page ${activeIndex + 1} of ${total}`;
  };

  const renderImagePreview = () => {
    if (!imagePreview) return;
    imagePreview.innerHTML = '';
    
    let clearBtn = null;
    if (currentImageUrl) {
      clearBtn = document.createElement('button');
      clearBtn.innerHTML = '&times;';
      clearBtn.title = 'Remove Image';
      clearBtn.type = 'button';
      clearBtn.style.position = 'absolute';
      clearBtn.style.top = '6px';
      clearBtn.style.right = '6px';
      clearBtn.style.background = 'rgba(0,0,0,0.6)';
      clearBtn.style.color = 'white';
      clearBtn.style.border = 'none';
      clearBtn.style.borderRadius = '50%';
      clearBtn.style.width = '24px';
      clearBtn.style.height = '24px';
      clearBtn.style.cursor = 'pointer';
      clearBtn.style.display = 'flex';
      clearBtn.style.alignItems = 'center';
      clearBtn.style.justifyContent = 'center';
      clearBtn.style.fontSize = '16px';
      clearBtn.style.zIndex = '10';
      clearBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to discard this image?")) {
          currentImageUrl = null;
          imageAttached = false;
          dirty = true;
          renderImagePreview();
          updateImageActions();
          updatePageIllustration();
        }
      };
    }

    if (imageError) {
      const placeholder = document.createElement('div');
      placeholder.className = 'image-placeholder error';
      placeholder.textContent = imageError;
      imagePreview.appendChild(placeholder);
    } else if (currentImageUrl) {
      const img = document.createElement('img');
      img.src = currentImageUrl;
      imagePreview.style.position = 'relative';
      imagePreview.appendChild(img);
      imagePreview.appendChild(clearBtn);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'image-placeholder';
      placeholder.textContent = 'No image yet';
      imagePreview.appendChild(placeholder);
    }
  };

  const applyImageStyle = () => {
    if (!pageIllustration) return;
    if (imageStyleState.width) {
      pageIllustration.style.width = `${imageStyleState.width}px`;
    } else {
      pageIllustration.style.width = '250px';
    }
    if (imageStyleState.height) {
      pageIllustration.style.height = `${imageStyleState.height}px`;
    } else {
      pageIllustration.style.height = 'auto';
    }
    pageIllustration.style.transform = `translate(${imageStyleState.x}px, ${imageStyleState.y}px)`;
  };

  const updatePageIllustration = () => {
    if (!pageIllustration || !pageIllustrationImg) return;
    if (currentImageUrl && imageAttached) {
      pageIllustrationImg.src = currentImageUrl;
      pageIllustration.style.display = 'block';
      applyImageStyle();
    } else {
      pageIllustrationImg.removeAttribute('src');
      pageIllustration.style.display = 'none';
    }
  };

  const updateImageActions = () => {
    const hasImage = Boolean(currentImageUrl);
    if (imageViewBtn) imageViewBtn.disabled = !hasImage;
    if (imageDownloadBtn) imageDownloadBtn.disabled = !hasImage;
    if (imageAttachBtn) {
      imageAttachBtn.disabled = !hasImage;
      imageAttachBtn.textContent = imageAttached ? 'Remove from Page' : 'Insert in Page';
    }
  };

  const updateShareUI = () => {
    if (!shareCodeInput) return;
    shareCodeInput.value = shareCode || '';
    if (shareCopyBtn) shareCopyBtn.disabled = !shareCode;
    if (shareRemoveBtn) shareRemoveBtn.disabled = !shareCode;
    const shareCanEdit = document.getElementById('shareCanEdit');
    if (shareCanEdit) shareCanEdit.checked = shareCanEditValue;
  };

  const getStyleState = (target) => (target === 'title' ? titleStyleState : contentStyleState);

  const applyStyleToElement = (element, state) => {
    if (!element) return;
    element.style.fontWeight = state.bold ? '700' : '400';
    element.style.fontStyle = state.italic ? 'italic' : 'normal';
    element.style.textDecoration = state.underline ? 'underline' : 'none';
    element.style.fontSize = `${state.fontSize}rem`;
  };

  const syncActiveTargetFromFocus = () => {
    if (!titleInput || !contentInput) return;
    if (document.activeElement === titleInput) activeEditorTarget = 'title';
    if (document.activeElement === contentInput) activeEditorTarget = 'content';
  };

  const refreshToolbarState = () => {
    const state = getStyleState(activeEditorTarget);
    if (formatBoldBtn) formatBoldBtn.classList.toggle('active', state.bold);
    if (formatItalicBtn) formatItalicBtn.classList.toggle('active', state.italic);
    if (formatUnderlineBtn) formatUnderlineBtn.classList.toggle('active', state.underline);
    if (fontSizeSelect) fontSizeSelect.value = state.fontSize;
  };

  const applyEditorStyle = () => {
    applyStyleToElement(titleInput, titleStyleState);
    applyStyleToElement(contentInput, contentStyleState);
    refreshToolbarState();
  };

  const parseStyleState = (raw, fallback) => {
    if (!raw || typeof raw !== 'string') return { ...fallback };
    try {
      const parsed = JSON.parse(raw);
      return {
        bold: Boolean(parsed && parsed.bold),
        italic: Boolean(parsed && parsed.italic),
        underline: Boolean(parsed && parsed.underline),
        fontSize: String((parsed && parsed.fontSize) || fallback.fontSize),
      };
    } catch {
      return { ...fallback };
    }
  };

  const focusActiveEditor = () => {
    if (activeEditorTarget === 'title' && titleInput) {
      titleInput.focus();
      return;
    }
    if (contentInput) contentInput.focus();
  };

  const renderEntries = () => {
    if (!entryList) return;
    entryList.innerHTML = '';
    entries.forEach((entry, index) => {
      const item = document.createElement('div');
      item.className = 'entry-item' + (index === currentIndex ? ' active' : '');
      item.textContent = entry.title || 'Untitled';
      item.dataset.index = index;
      item.addEventListener('click', async () => {
        await saveIfDirty();
        navigateToIndex(index);
      });
      entryList.appendChild(item);
    });
    updateNavButtons();
    updatePageCount();
    updateDeleteButton();
  };

  const loadEntry = async (entryId) => {
    const response = await fetch(`/api/entry/${entryId}`);
    if (!response.ok) {
      setStatus('Failed to load page');
      return;
    }
    const data = await response.json();
    titleInput.value = data.title || '';
    contentInput.value = data.content || '';
    Object.assign(titleStyleState, parseStyleState(data.title_style, defaultTitleStyle));
    Object.assign(contentStyleState, parseStyleState(data.content_style, defaultContentStyle));
    applyEditorStyle();
    currentEntryId = data.id;
    const resolvedIndex = entries.findIndex((entry) => entry.id === currentEntryId);
    if (resolvedIndex >= 0) {
      currentIndex = resolvedIndex;
      lastActiveIndex = resolvedIndex;
    } else {
      lastActiveIndex = getActiveIndex();
    }
    imageError = null;
    currentImageUrl = data.image_url || null;
    imageAttached = Boolean(data.image_attached);
    if (data.image_style) {
      try {
        const parsed = JSON.parse(data.image_style);
        imageStyleState = { x: parsed.x || 0, y: parsed.y || 0, width: parsed.width || null, height: parsed.height || null };
      } catch(e) {
        imageStyleState = { x: 0, y: 0, width: null, height: null };
      }
    } else {
      imageStyleState = { x: 0, y: 0, width: null, height: null };
    }
    shareCode = data.share_code || null;
    shareCanEditValue = data.can_edit || false;
    if (shareModeSelect) {
      const nextMode = data.share_type || 'story';
      setShareMode(nextMode, nextMode === 'single' ? 'Single page' : 'Full story');
    }
    if (imagePrompt) imagePrompt.value = data.image_prompt || '';
    renderImagePreview();
    updateImageActions();
    updateShareUI();
    updatePageIllustration();
    dirty = false;
    setStatus('Ready');
    updatePageCount();
    updateDeleteButton();
    updateNavButtons();
  };

  const navigateToIndex = (index) => {
    if (index < 0 || index >= entries.length) return;
    const activeIndex = getActiveIndex();
    const direction = activeIndex >= 0 && index < activeIndex ? 'prev' : 'next';
    animateTurn(direction, async () => {
      currentIndex = index;
      lastActiveIndex = index;
      renderEntries();
      await loadEntry(entries[index].id);
    });
  };

  const saveIfDirty = async () => {
    if (dirty) await saveEntry();
  };

  const createBlank = () => {
    currentEntryId = null;
    currentIndex = -1;
    titleInput.value = '';
    contentInput.value = '';
    Object.assign(titleStyleState, defaultTitleStyle);
    Object.assign(contentStyleState, defaultContentStyle);
    applyEditorStyle();
    if (imagePrompt) imagePrompt.value = '';
    imageError = null;
    currentImageUrl = null;
    imageAttached = false;
    imageStyleState = { x: 0, y: 0, width: null, height: null };
    shareCode = null;
    shareCanEditValue = false;
    renderImagePreview();
    updateImageActions();
    updateShareUI();
    updatePageIllustration();
    dirty = false;
    setStatus('New page');
    renderEntries();
    updatePageCount();
    updateDeleteButton();
  };

  const saveEntry = async (options = {}) => {
    if (isSaving && saveInFlight) {
      return saveInFlight;
    }

    const runSave = async () => {
      isSaving = true;
      setStatus('Saving...');
      try {
        const contentText = contentInput.value || '';
        const hasTitle = Boolean(titleInput.value.trim());
        const hasContent = Boolean(contentText.trim());
        const allowEmpty = options.allowEmpty === true;
        if (!currentEntryId && !allowEmpty && !hasTitle && !hasContent) {
          dirty = false;
          setStatus('Ready');
          return null;
        }
        const reuseActiveId = options.reuseActiveId !== false;
        const resolvedEntryId = currentEntryId ?? (reuseActiveId ? getActiveEntryId() : null);
        const payload = {
          id: resolvedEntryId,
          type: entryType,
          title: titleInput.value,
          content: contentText,
          title_style: JSON.stringify(titleStyleState),
          content_style: JSON.stringify(contentStyleState),
        };
        if (entryType === 'story') {
          payload.image_prompt = imagePrompt ? imagePrompt.value : null;
          payload.image_url = currentImageUrl;
          payload.image_attached = imageAttached;
          payload.image_style = JSON.stringify(imageStyleState);
        }
        const response = await fetch('/api/entry/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Save failed');
        const data = await response.json();
        currentEntryId = data.id;
        dirty = false;
        const statusLabel = options.auto ? 'Autosaved' : 'Saved';
        setStatus(statusLabel);
        if (saveStatus) {
          saveStatus.style.transition = 'color 0.3s, transform 0.3s';
          saveStatus.style.color = 'var(--theme-accent, #5cb85c)';
          saveStatus.style.transform = 'scale(1.05)';
          setTimeout(() => { saveStatus.style.color = ''; saveStatus.style.transform = ''; }, 1500);
        }
        setTime(data.updated_at, statusLabel);

        const existingIndex = entries.findIndex((entry) => entry.id === currentEntryId);
        if (existingIndex >= 0) {
          entries[existingIndex].title = data.title;
          entries[existingIndex].updated_at = data.updated_at;
          currentIndex = existingIndex;
          lastActiveIndex = existingIndex;
        } else {
          entries.push({ id: currentEntryId, title: data.title, updated_at: data.updated_at });
          currentIndex = entries.length - 1;
          lastActiveIndex = currentIndex;
        }
        renderEntries();
        updatePageCount();
        updateDeleteButton();
        return currentEntryId;
      } catch (err) {
        setStatus('Offline');
        return null;
      } finally {
        isSaving = false;
        saveInFlight = null;
      }
    };

    saveInFlight = runSave();
    return saveInFlight;
  };


  const loadEntries = async () => {
    const response = await fetch(`/api/entries?type=${entryType}`);
    if (!response.ok) return;
    entries = await response.json();
    if (entries.length > 0) {
      currentIndex = entries.length - 1;
      renderEntries();
      await loadEntry(entries[currentIndex].id);
    } else {
      createBlank();
    }
  };

  if (newEntryBtn) {
    const handleNewEntry = async () => {
      await saveIfDirty();
      animateTurn('next', async () => {
        createBlank();
        await saveEntry({ allowEmpty: true, reuseActiveId: false });
      });
    };
    newEntryBtn.addEventListener('click', handleNewEntry);
    newEntryBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleNewEntry(); }, { passive: false });
  }

  if (deleteEntryBtn) {
    const handleDeleteEntry = async () => {
      const targetId = getActiveEntryId();
      if (!targetId) {
        console.warn('Delete attempt without targetId');
        return;
      }
      
      const confirmed = window.confirm('Delete this page?');
      if (!confirmed) return;

      setStatus('Deleting...');
      try {
        const resp = await fetch(`/api/entry/${targetId}`, { 
          method: 'DELETE', 
          headers: { 'X-CSRFToken': csrfToken } 
        });
        if (!resp.ok) throw new Error('Delete failed');

        const indexToRemove = entries.findIndex(e => e.id === targetId);
        if (indexToRemove >= 0) {
          entries.splice(indexToRemove, 1);
        }

        currentEntryId = null;
        imageAttached = false;
        shareCode = null;
        shareCanEditValue = false;
        updateShareUI();

        if (entries.length > 0) {
          const nextIndex = Math.min(indexToRemove, entries.length - 1);
          navigateToIndex(nextIndex);
        } else {
          createBlank();
        }
        
        setStatus('Deleted');
        renderEntries();
        updatePageCount();
      } catch (err) {
        console.error('Delete error:', err);
        setStatus('Delete failed');
      }
    };
    deleteEntryBtn.addEventListener('click', handleDeleteEntry);
    deleteEntryBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleDeleteEntry(); }, { passive: false });
  }

  if (prevBtn) {
    const handlePrev = async () => {
      await saveIfDirty();
      const activeIndex = getActiveIndex();
      if (activeIndex <= 0) {
        setStatus('No previous page');
        return;
      }
      navigateToIndex(activeIndex - 1);
    };
    prevBtn.addEventListener('click', handlePrev);
    prevBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handlePrev(); }, { passive: false });
  }

  if (nextBtn) {
    const handleNext = async () => {
      await saveIfDirty();
      const activeIndex = getActiveIndex();
      if (activeIndex < 0 || activeIndex >= entries.length - 1) {
        setStatus('No next page');
        return;
      }
      navigateToIndex(activeIndex + 1);
    };
    nextBtn.addEventListener('click', handleNext);
    nextBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleNext(); }, { passive: false });
  }

  if (titleInput) {
    titleInput.addEventListener('focus', () => {
      activeEditorTarget = 'title';
      refreshToolbarState();
    });
    titleInput.addEventListener('input', () => {
      markDirty();
      updateActiveTitleLabel();
    });
  }
  if (contentInput) {
    contentInput.addEventListener('focus', () => {
      activeEditorTarget = 'content';
      refreshToolbarState();
    });
    contentInput.addEventListener('input', markDirty);
  }
  if (imagePrompt) imagePrompt.addEventListener('input', markDirty);

  if (formatBoldBtn) {
    formatBoldBtn.addEventListener('click', () => {
      syncActiveTargetFromFocus();
      const state = getStyleState(activeEditorTarget);
      state.bold = !state.bold;
      applyEditorStyle();
      markDirty();
      focusActiveEditor();
    });
  }

  if (formatItalicBtn) {
    formatItalicBtn.addEventListener('click', () => {
      syncActiveTargetFromFocus();
      const state = getStyleState(activeEditorTarget);
      state.italic = !state.italic;
      applyEditorStyle();
      markDirty();
      focusActiveEditor();
    });
  }

  if (formatUnderlineBtn) {
    formatUnderlineBtn.addEventListener('click', () => {
      syncActiveTargetFromFocus();
      const state = getStyleState(activeEditorTarget);
      state.underline = !state.underline;
      applyEditorStyle();
      markDirty();
      focusActiveEditor();
    });
  }

  if (fontSizeSelect) {
    fontSizeSelect.addEventListener('change', () => {
      syncActiveTargetFromFocus();
      const state = getStyleState(activeEditorTarget);
      state.fontSize = fontSizeSelect.value || (activeEditorTarget === 'title' ? '1.4' : '1.05');
      applyEditorStyle();
      markDirty();
      focusActiveEditor();
    });
  }

  const insertAtCursor = (element, text) => {
    const start = element.selectionStart || 0;
    const end = element.selectionEnd || 0;
    const value = element.value || '';
    element.value = value.slice(0, start) + text + value.slice(end);
    const cursor = start + text.length;
    element.selectionStart = cursor;
    element.selectionEnd = cursor;
  };

  const htmlToText = (html) => {
    if (!html) return '';
    let normalized = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '</p>\n')
      .replace(/<\/div>/gi, '</div>\n')
      .replace(/<\/li>/gi, '</li>\n');
    const temp = document.createElement('div');
    temp.innerHTML = normalized;
    const text = temp.textContent || temp.innerText || '';
    return text.replace(/\r\n?/g, '\n');
  };

  if (contentInput) {
    contentInput.addEventListener('paste', (event) => {
      const clipboard = event.clipboardData || window.clipboardData;
      if (!clipboard) return;
      const html = clipboard.getData('text/html');
      const plain = clipboard.getData('text/plain');
      if (!html && !plain) return;
      event.preventDefault();
      const text = html ? htmlToText(html) : plain;
      insertAtCursor(contentInput, text);
      markDirty();
    });
  }

  if (imageGenBtn && imagePrompt && imagePreview) {
    imageGenBtn.addEventListener('click', async () => {
      const prompt = imagePrompt.value.trim();
      if (!prompt) return;
      imageGenBtn.disabled = true;
      imageGenBtn.textContent = 'Generating...';
      imageError = null;
      try {
        const response = await fetch('/api/story/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
          body: JSON.stringify({ prompt }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const rawError = String(data.message || data.error || 'Image failed').trim();
          const message = rawError.includes(':')
            ? rawError.split(':').slice(1).join(':').trim()
            : rawError;
          setStatus(`Image failed: ${message}`);
          currentImageUrl = null;
          imageAttached = false;
          renderImagePreview();
          updateImageActions();
          updatePageIllustration();
          return;
        }
        currentImageUrl = data.image_url;
        imageAttached = false;
        renderImagePreview();
        updateImageActions();
        updatePageIllustration();
        markDirty();
      } catch (err) {
        setStatus('Image failed. Try again in a moment.');
        currentImageUrl = null;
        imageAttached = false;
        if (imagePreview) {
          renderImagePreview();
        }
      } finally {
        imageGenBtn.disabled = false;
        imageGenBtn.textContent = 'Generate Image';
      }
    });
  }

  const imageUploadTriggerBtn = document.getElementById('imageUploadTriggerBtn');
  const imageUploadInput = document.getElementById('imageUploadInput');
  
  if (imageUploadTriggerBtn && imageUploadInput) {
    imageUploadTriggerBtn.addEventListener('click', () => {
      imageUploadInput.click();
    });
    
    imageUploadInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const formData = new FormData();
      formData.append('file', file);
      
      imageUploadTriggerBtn.disabled = true;
      const originalText = imageUploadTriggerBtn.textContent;
      imageUploadTriggerBtn.textContent = '...';
      
      try {
        const response = await fetch('/api/upload/image', {
          method: 'POST',
          headers: { 'X-CSRFToken': csrfToken },
          body: formData
        });
        const data = await response.json();
        
        if (!response.ok) {
          setStatus(`Upload failed: ${data.error || 'Unknown error'}`);
          return;
        }
        
        currentImageUrl = data.url;
        imageAttached = false;
        renderImagePreview();
        updateImageActions();
        updatePageIllustration();
        markDirty();
      } catch (err) {
        setStatus('Upload failed. Try again.');
      } finally {
        imageUploadTriggerBtn.disabled = false;
        imageUploadTriggerBtn.textContent = originalText;
        imageUploadInput.value = '';
      }
    });
  }

  if (imageViewBtn && imageModal && imageModalImg) {

    imageViewBtn.addEventListener('click', () => {
      if (!currentImageUrl) return;
      imageModalImg.src = currentImageUrl;
      imageModal.classList.add('open');
      imageModal.setAttribute('aria-hidden', 'false');
    });
  }

  if (imageModal && imageModalClose) {
    const closeModal = () => {
      imageModal.classList.remove('open');
      imageModal.setAttribute('aria-hidden', 'true');
    };
    imageModalClose.addEventListener('click', closeModal);
    imageModal.addEventListener('click', (event) => {
      if (event.target === imageModal) closeModal();
    });
  }

  if (imageDownloadBtn) {
    const downloadBlob = (blob, filename) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    const loadImage = (src) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    const toPngBlob = async (src) => {
      const img = await loadImage(src);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png', 0.92);
      });
    };

    imageDownloadBtn.addEventListener('click', async () => {
      if (!currentImageUrl) return;
      try {
        const pngBlob = await toPngBlob(currentImageUrl);
        if (!pngBlob) throw new Error('PNG failed');
        downloadBlob(pngBlob, 'story-illustration.png');
      } catch (err) {
        window.open(currentImageUrl, '_blank', 'noopener');
      }
    });
  }

  if (imageAttachBtn) {
    imageAttachBtn.addEventListener('click', () => {
      if (!currentImageUrl) return;
      imageAttached = !imageAttached;
      updateImageActions();
      updatePageIllustration();
      markDirty();
    });
  }


  if (shareGenerateBtn) {
    shareGenerateBtn.addEventListener('click', async () => {
      if (!getActiveEntryId()) {
        await saveEntry();
      }
      const targetId = getActiveEntryId();
      if (!targetId) {
        setStatus('Save page first');
        return;
      }
      const mode = shareModeSelect ? shareModeSelect.value : 'story';
      const shareCanEdit = document.getElementById('shareCanEdit');
      const canEdit = shareCanEdit ? shareCanEdit.checked : false;
      const customCode = shareCodeInput ? shareCodeInput.value.trim() : '';
      try {
        const response = await fetch(`/api/entry/${targetId}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
          body: JSON.stringify({ rotate: Boolean(shareCode && !customCode), mode, custom_code: customCode, can_edit: canEdit }),
        });
        if (!response.ok) throw new Error('Share failed');
        const data = await response.json();
        shareCode = data.share_code;
        shareCanEditValue = data.can_edit;
        if (data.share_type && shareModeSelect) {
          shareModeSelect.value = data.share_type;
        }
        updateShareUI();
      } catch (err) {
        setStatus('Share failed');
      }
    });
  }

  if (shareRemoveBtn) {
    shareRemoveBtn.addEventListener('click', async () => {
      const targetId = getActiveEntryId();
      if (!targetId || !shareCode) return;
      try {
        const response = await fetch(`/api/entry/${targetId}/share`, {
          method: 'DELETE',
          headers: { 'X-CSRFToken': csrfToken },
        });
        if (!response.ok) throw new Error('Remove failed');
        shareCode = null;
        shareCanEditValue = false;
        updateShareUI();
      } catch (err) {
        setStatus('Remove failed');
      }
    });
  }

  if (shareCopyBtn && shareCodeInput) {
    shareCopyBtn.addEventListener('click', async () => {
      if (!shareCode) return;
      try {
        await navigator.clipboard.writeText(shareCode);
        setStatus('Code copied');
      } catch (err) {
        shareCodeInput.select();
        document.execCommand('copy');
        setStatus('Code copied');
      }

      const originalHtml = shareCopyBtn.innerHTML;
      shareCopyBtn.textContent = 'Copied';
      shareCopyBtn.disabled = true;
      setTimeout(() => {
        shareCopyBtn.innerHTML = originalHtml;
        updateShareUI();
      }, 2000);
    });
  }

  const autosaveToggle = document.getElementById('autosaveToggle');
  if (autosaveToggle) {
    const stored = localStorage.getItem('yw_autosave');
    autosaveEnabled = stored === null ? true : (stored === 'true');
    autosaveToggle.checked = autosaveEnabled;
    autosaveToggle.addEventListener('change', () => {
      autosaveEnabled = autosaveToggle.checked;
      localStorage.setItem('yw_autosave', autosaveEnabled);
      if (autosaveEnabled && dirty) scheduleAutosave();
    });
  }

  const manualSaveBtn = document.getElementById('manualSaveBtn');
  if (manualSaveBtn) {
    manualSaveBtn.addEventListener('click', async () => {
      manualSaveBtn.disabled = true;
      manualSaveBtn.textContent = 'Saving...';
      try {
        await saveEntry({ allowEmpty: true });
      } finally {
        manualSaveBtn.disabled = false;
        manualSaveBtn.textContent = 'Save';
      }
    });
  }

  applyEditorStyle();
  loadEntries();

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    const key = e.key.toLowerCase();
    
    // Formatting (B, I, U)
    if (key === 'b') {
      if (formatBoldBtn) { e.preventDefault(); formatBoldBtn.click(); }
    } else if (key === 'i') {
      if (formatItalicBtn) { e.preventDefault(); formatItalicBtn.click(); }
    } else if (key === 'u') {
      if (formatUnderlineBtn) { e.preventDefault(); formatUnderlineBtn.click(); }
    }
    // Save (S)
    else if (key === 's') {
      if (manualSaveBtn) { e.preventDefault(); manualSaveBtn.click(); }
    }
    // New (N)
    else if (key === 'n') {
      if (newEntryBtn) { e.preventDefault(); newEntryBtn.click(); }
    }
    // Delete (D)
    else if (key === 'd') {
      if (deleteEntryBtn) { e.preventDefault(); deleteEntryBtn.click(); }
    }
    // Chat (K)
    else if (key === 'k') {
      if (chatLaunch) { e.preventDefault(); chatLaunch.click(); }
    }
    // Navigation (Left/Right, [, ])
    else if (key === 'arrowleft' || key === '[') {
      if (prevBtn) { e.preventDefault(); prevBtn.click(); }
    } else if (key === 'arrowright' || key === ']') {
      if (nextBtn) { e.preventDefault(); nextBtn.click(); }
    }
  });
}

const themeForm = document.getElementById('themeForm');
if (themeForm) {
  const themeInputs = Array.from(themeForm.querySelectorAll('input[name="theme"]'));
  const themeTiles = Array.from(themeForm.querySelectorAll('.theme-tile[data-theme-preview]'));
  let audioCtx = null;
  const themeToneMap = {
    campfire: [220, 294, 247],
    water: [196, 262, 220],
    wind: [294, 370, 330],
    earth: [165, 220, 196],
    ice: [330, 392, 440],
    storm: [247, 330, 392],
    space: [220, 277, 349],
    garden: [196, 247, 294],
  };

  const playThemeTone = (theme) => {
    if (reducedMotion) return;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    if (!audioCtx) audioCtx = new AudioCtor();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    const notes = themeToneMap[theme] || themeToneMap.campfire;
    const now = audioCtx.currentTime;
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.045, now + (idx * 0.08) + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (idx * 0.08) + 0.21);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + (idx * 0.08));
      osc.stop(now + (idx * 0.08) + 0.24);
    });
  };

  const setThemePreview = (theme) => {
    if (!bodyEl) return;
    const resolved = THEME_META[theme] ? theme : 'campfire';
    bodyEl.dataset.themePreview = resolved;
  };

  const clearThemePreview = () => {
    if (!bodyEl) return;
    delete bodyEl.dataset.themePreview;
  };

  themeTiles.forEach((tile) => {
    const preview = tile.getAttribute('data-theme-preview');
    if (!preview) return;
    tile.addEventListener('click', (event) => {
      setThemePreview(preview);
    });
  });

  document.addEventListener('click', (event) => {
    if (!themeForm) return;
    if (!event.target) return;
    if (themeForm.contains(event.target)) return;
    clearThemePreview();
  });

  themeInputs.forEach((input) => {
    input.addEventListener('change', () => {
      const selectedTheme = input.value || 'campfire';
      setThemeState(selectedTheme);
      queueParticleRebuild(selectedTheme);
      playThemeTone(selectedTheme);
    });
  });

  const selected = themeInputs.find((input) => input.checked);
  if (selected) {
    setThemeState(selected.value);
    queueParticleRebuild(selected.value);
  }
}

const activityHeatmap = document.getElementById('activityHeatmap');
if (activityHeatmap) {
  const toIsoDate = (date) => date.toISOString().slice(0, 10);
  const formatLabel = (date) =>
    date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  const buildHeatmap = (counts, days) => {
    activityHeatmap.innerHTML = '';
    const today = new Date();
    const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const start = new Date(utcToday);
    start.setUTCDate(utcToday.getUTCDate() - (days - 1));

    const startDay = start.getUTCDay();
    const totalCells = startDay + days;
    const columns = Math.ceil(totalCells / 7);
    activityHeatmap.style.setProperty('--columns', columns);

    const addCell = (className, title) => {
      const cell = document.createElement('div');
      cell.className = `heatmap-cell ${className}`;
      if (title) cell.title = title;
      if (title) cell.setAttribute('aria-label', title);
      activityHeatmap.appendChild(cell);
    };

    for (let i = 0; i < startDay; i += 1) {
      addCell('empty');
    }

    for (let i = 0; i < days; i += 1) {
      const day = new Date(start);
      day.setUTCDate(start.getUTCDate() + i);
      const iso = toIsoDate(day);
      const count = counts[iso] || 0;
      let level = 0;
      if (count >= 7) level = 4;
      else if (count >= 4) level = 3;
      else if (count >= 2) level = 2;
      else if (count >= 1) level = 1;
      addCell(`level-${level}`, `${formatLabel(day)} - ${count} update${count === 1 ? '' : 's'}`);
    }
  };

  fetch('/api/activity?days=365')
    .then((response) => response.json())
    .then((data) => {
      buildHeatmap(data.counts || {}, data.days || 365);
      
      const pageCountEl = document.getElementById('profilePageCount');
      if (pageCountEl && data.total_pages !== undefined) {
        pageCountEl.textContent = data.total_pages;
      }
      
      const streakEl = document.getElementById('profileStreak');
      if (streakEl && data.streak !== undefined) {
        streakEl.textContent = data.streak;
      }
      
      const activeDaysEl = document.getElementById('profileDaysActive');
      if (activeDaysEl && data.active_days !== undefined) {
        activeDaysEl.textContent = data.active_days;
      }
    })
    .catch(() => {
      activityHeatmap.textContent = 'Activity data unavailable.';
    });
}

const handleResendButton = (btnId) => {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (btn.disabled) return;

    const originalText = btn.textContent;
    btn.textContent = 'Sending...';
    btn.style.opacity = '0.7';
    btn.style.cursor = 'wait';
    btn.disabled = true;

    try {
      let url;
      if (btn.hasAttribute('formaction')) {
        url = btn.getAttribute('formaction');
      } else if (btn.dataset.url) {
        url = btn.dataset.url;
      } else {
        const path = window.location.pathname.replace(/\/+$/, '');
        url = `${path}/resend`;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });

      const contentType = response.headers.get('content-type');
      const data = (contentType && contentType.includes('application/json'))
        ? await response.json().catch(() => ({}))
        : {};

      if (response.ok) {
        btn.textContent = '✓ Code Sent';
        btn.style.opacity = '1';
        btn.style.cursor = 'default';
        
        if (btn.animate) {
          btn.animate([
            { transform: 'scale(1)' },
            { transform: 'scale(1.05)' },
            { transform: 'scale(1)' }
          ], { duration: 300, easing: 'ease-out' });
        }

        setTimeout(() => {
          btn.style.transition = 'opacity 0.3s';
          btn.style.opacity = '0.5';
          setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = '';
            btn.style.transition = '';
          }, 300);
        }, 5000);
      } else {
        if (data.redirect) {
          window.location.href = data.redirect;
          return;
        }
        btn.textContent = data.error || 'Failed';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.disabled = false;
          btn.style.opacity = '1';
          btn.style.cursor = '';
        }, 3000);
      }
    } catch (err) {
      console.error(err);
      btn.textContent = 'Error';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = '';
      }, 3000);
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  handleResendButton('resendCodeBtn');
  handleResendButton('verifyResendBtn');
});

const forgotPasswordForm = document.querySelector('form[action*="forgot-password"]');
if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener('submit', () => {
    const btn = forgotPasswordForm.querySelector('button[type="submit"]');
    if (btn) {
      btn.textContent = 'Sending...';
      btn.disabled = true;
    }
  });
}

const publicPagesData = document.getElementById('publicPagesData');
if (publicPagesData) {
  let pages = [];
  try {
    pages = JSON.parse(publicPagesData.textContent || '[]');
  } catch {
    pages = [];
  }

  const titleEl = document.getElementById('publicTitle');
  const contentEl = document.getElementById('publicContent');
  const illustrationWrap = document.getElementById('publicIllustration');
  const illustrationImg = document.getElementById('publicIllustrationImg');
  const prevBtn = document.getElementById('publicPrevBtn');
  const nextBtn = document.getElementById('publicNextBtn');
  const countEl = document.getElementById('publicPageCount');
  const controls = document.getElementById('publicControls');
  const pageList = document.getElementById('publicPageList');

  let index = 0;

  const renderPageList = () => {
    if (!pageList) return;
    pageList.innerHTML = '';
    pages.forEach((page, idx) => {
      const item = document.createElement('div');
      const title = (page.title || '').trim();
      item.className = `public-page-item${idx === index ? ' is-active' : ''}`;
      item.textContent = title || `Page ${idx + 1}`;
      item.addEventListener('click', () => {
        index = idx;
        renderPage();
      });
      pageList.appendChild(item);
    });
  };

  const renderPage = () => {
    if (!pages.length) return;
    const page = pages[index] || {};
    const title = (page.title || '').trim();
    const content = page.content || '';
    if (titleEl) titleEl.textContent = title || `Page ${index + 1}`;
    if (contentEl) contentEl.textContent = content;
    if (illustrationWrap && illustrationImg) {
      if (page.image_attached && page.image_url) {
        illustrationImg.src = page.image_url;
        illustrationWrap.style.display = 'block';
        if (page.image_style) {
           try {
              const style = JSON.parse(page.image_style);
              illustrationWrap.style.width = style.width ? `${style.width}px` : '250px';
              illustrationWrap.style.height = style.height ? `${style.height}px` : 'auto';
              illustrationWrap.style.transform = `translate(${style.x || 0}px, ${style.y || 0}px)`;
           } catch(e) {}
        } else {
           illustrationWrap.style.width = '250px';
           illustrationWrap.style.height = 'auto';
           illustrationWrap.style.transform = 'translate(0px, 0px)';
        }
      } else {
        illustrationImg.removeAttribute('src');
        illustrationWrap.style.display = 'none';
      }
    }
    if (countEl) {
      countEl.textContent = pages.length > 1 ? `Page ${index + 1} of ${pages.length}` : '';
    }
    if (prevBtn) prevBtn.disabled = index <= 0;
    if (nextBtn) nextBtn.disabled = index >= pages.length - 1;
    renderPageList();
  };

  const publicSaveBtn = document.getElementById('publicSaveBtn');
  if (controls && pages.length <= 1 && !publicSaveBtn) {
    controls.classList.add('is-hidden');
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (index <= 0) return;
      index -= 1;
      renderPage();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (index >= pages.length - 1) return;
      index += 1;
      renderPage();
    });
  }

  if (publicSaveBtn) {
    publicSaveBtn.addEventListener('click', async () => {
      const page = pages[index];
      if (!page) return;
      const newTitle = titleEl ? titleEl.innerText : '';
      const newContent = contentEl ? contentEl.innerHTML : '';
      
      publicSaveBtn.textContent = 'Saving...';
      try {
        const metaCsrf = document.querySelector('meta[name="csrf-token"]');
        const token = metaCsrf ? metaCsrf.getAttribute('content') : '';
        const response = await fetch('/api/entry/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token },
          body: JSON.stringify({
            id: page.id,
            title: newTitle,
            content: newContent,
            type: 'story',
            image_url: page.image_url,
            image_attached: page.image_attached ? 1 : 0,
            image_style: page.image_style,
            image_prompt: page.image_prompt
          })
        });
        if (response.ok) {
          publicSaveBtn.textContent = 'Saved!';
          page.title = newTitle;
          page.content = newContent;
        } else {
          publicSaveBtn.textContent = 'Error';
        }
      } catch(e) {
        publicSaveBtn.textContent = 'Error';
      }
      setTimeout(() => { publicSaveBtn.textContent = 'Save Changes'; }, 2000);
    });
  }

  renderPage();
}

// Global pointer events for dragging pageIllustration inside the book layout
document.addEventListener('DOMContentLoaded', () => {
  const pageIllustration = document.getElementById('pageIllustration');
  const resizeHandle = document.getElementById('resizeHandle');
  if (pageIllustration && resizeHandle) {
    let isDragging = false;
    let isResizing = false;
    let startX = 0, startY = 0;
    let initialX = 0, initialY = 0;
    let initialWidth = 0, initialHeight = 0;

    pageIllustration.addEventListener('pointerdown', (e) => {
      if (e.target === resizeHandle || pageIllustration.style.display === 'none') return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const transform = pageIllustration.style.transform || '';
      const match = transform.match(/translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)/);
      if (match) {
        initialX = parseFloat(match[1]);
        initialY = parseFloat(match[2]);
      } else {
        initialX = 0;
        initialY = 0;
      }
      pageIllustration.setPointerCapture(e.pointerId);
    });

    resizeHandle.addEventListener('pointerdown', (e) => {
      isResizing = true;
      e.stopPropagation();
      startX = e.clientX;
      startY = e.clientY;
      const rect = pageIllustration.getBoundingClientRect();
      initialWidth = rect.width;
      initialHeight = rect.height;
      resizeHandle.setPointerCapture(e.pointerId);
    });

    const onPointerMove = (e) => {
      if (isDragging) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const pageEl = document.getElementById('page');
        const maxScrollW = pageEl ? Math.max(10, pageEl.clientWidth - 100) : 800;
        let newX = Math.max(-20, Math.min(initialX + dx, maxScrollW));
        let newY = Math.max(-60, initialY + dy);
        
        // This is a bit hacky to update the state from outside the main app scope,
        // but it will be persisted when saveEntry is triggered inside the main scope
        // since saveEntry reads imageStyleState. We need to dispatch a custom event
        // or ensure imageStyleState is global. Since it's trapped in DOMContentLoaded,
        // we'll dispatch an event to the document.
        pageIllustration.style.transform = `translate(${newX}px, ${newY}px)`;
        document.dispatchEvent(new CustomEvent('imageStyleUpdate', {
            detail: { x: newX, y: newY }
        }));
      } else if (isResizing) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let newW = Math.max(100, initialWidth + dx);
        let newH = Math.max(100, initialHeight + dy);
        pageIllustration.style.width = `${newW}px`;
        pageIllustration.style.height = `${newH}px`;
        document.dispatchEvent(new CustomEvent('imageStyleUpdate', {
            detail: { width: newW, height: newH }
        }));
      }
    };

    const onPointerUp = (e) => {
      if (isDragging) {
        isDragging = false;
        pageIllustration.releasePointerCapture(e.pointerId);
      }
      if (isResizing) {
        isResizing = false;
        resizeHandle.releasePointerCapture(e.pointerId);
      }
    };

    pageIllustration.addEventListener('pointermove', onPointerMove);
    pageIllustration.addEventListener('pointerup', onPointerUp);
    resizeHandle.addEventListener('pointermove', onPointerMove);
    resizeHandle.addEventListener('pointerup', onPointerUp);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  let path = window.location.pathname;
  if (path === '/') path = '/home';
  document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
    let href = link.getAttribute('href');
    if (href === path || link.dataset.page === path.substring(1) || (path === '/home' && link.dataset.page === 'home')) {
      link.classList.add('active');
    }
  });
});

// --- Ambient Audio Management (continuous across pages via localStorage) ---
document.addEventListener('DOMContentLoaded', () => {
  const audioPlayer = document.getElementById('ambientAudioPlayer');
  const toggleBtn = document.getElementById('audioToggleBtn');
  
  if (!audioPlayer || !toggleBtn) return;
  
  // Read persisted state from localStorage
  const savedEnabled = localStorage.getItem('yw_sound_enabled') === 'true';
  const savedTime = parseFloat(localStorage.getItem('yw_sound_time') || '0');
  let isPlaying = savedEnabled;
  
  toggleBtn.textContent = isPlaying ? '🔊 Sound' : '🔇 Sound';
  
  const getAudioSrc = (theme) => {
    if (window.UserAudio && window.UserAudio[theme]) {
      return window.UserAudio[theme];
    }
    return `/static/audio/${theme}.wav`;
  };

  const loadAndPlay = (theme, seekTo) => {
    const src = getAudioSrc(theme);
    
    // Explicitly stop and clear before switching to avoid layering or carry-over
    audioPlayer.pause();
    audioPlayer.src = "";
    audioPlayer.load();
    
    // Set new src
    audioPlayer.src = src;
    
    if (isPlaying) {
      const onCanPlay = () => {
        audioPlayer.removeEventListener('canplay', onCanPlay);
        if (seekTo > 0 && isFinite(audioPlayer.duration) && seekTo < audioPlayer.duration) {
          audioPlayer.currentTime = seekTo;
        }
        audioPlayer.play().catch(e => {
          console.warn('Autoplay prevented — click Sound to start', e);
          isPlaying = false;
          toggleBtn.textContent = '🔇 Sound';
          toggleBtn.classList.add('pulse-highlight'); // Visual hint
        });
      };
      audioPlayer.addEventListener('canplay', onCanPlay);
      audioPlayer.load();
    }
  };
  
  // Save position continuously so we never lose more than ~250ms
  setInterval(() => {
    if (isPlaying && audioPlayer && !audioPlayer.paused) {
      localStorage.setItem('yw_sound_time', String(audioPlayer.currentTime));
    }
  }, 250);
  
  // Also save right before leaving the page
  window.addEventListener('beforeunload', () => {
    if (isPlaying && audioPlayer) {
      localStorage.setItem('yw_sound_time', String(audioPlayer.currentTime));
    }
  });
  
  toggleBtn.addEventListener('click', () => {
    if (isPlaying) {
      audioPlayer.pause();
      isPlaying = false;
      localStorage.setItem('yw_sound_enabled', 'false');
      localStorage.setItem('yw_sound_time', '0');
      toggleBtn.textContent = '🔇 Sound';
    } else {
      // If no src is loaded yet, load the current theme
      if (!audioPlayer.src || audioPlayer.src === window.location.href) {
        const curTheme = typeof activeTheme !== 'undefined' ? activeTheme : 'campfire';
        audioPlayer.src = getAudioSrc(curTheme);
      }
      audioPlayer.play().then(() => {
        isPlaying = true;
        localStorage.setItem('yw_sound_enabled', 'true');
        toggleBtn.textContent = '🔊 Sound';
        toggleBtn.classList.remove('pulse-highlight');
      }).catch(err => {
        console.warn(err);
        toggleBtn.classList.add('pulse-highlight');
      });
    }
  });

  // Theme observer
  window.addEventListener('yw:themechange', (event) => {
    const nextTheme = event && event.detail ? event.detail.theme : (typeof activeTheme !== 'undefined' ? activeTheme : 'campfire');
    // Theme changed — restart from beginning
    localStorage.setItem('yw_sound_time', '0');
    loadAndPlay(nextTheme, 0);
  });

  // Expose a global function so the settings page can reload audio after uploading a custom song
  window.reloadThemeAudio = (theme, url) => {
    if (url && window.UserAudio) {
      window.UserAudio[theme] = url;
      // Also persist to localStorage for guest users
      try {
        const stored = JSON.parse(localStorage.getItem('yw_custom_audio') || '{}');
        stored[theme] = url;
        localStorage.setItem('yw_custom_audio', JSON.stringify(stored));
      } catch(e) {}
    }
    isPlaying = true;
    localStorage.setItem('yw_sound_enabled', 'true');
    toggleBtn.textContent = '🔊 Sound';
    loadAndPlay(theme, 0);
  };

  // Expose a function to remove custom audio for a theme
  window.removeThemeAudio = (theme) => {
    if (window.UserAudio) {
      window.UserAudio[theme] = '';
    }
    try {
      const stored = JSON.parse(localStorage.getItem('yw_custom_audio') || '{}');
      delete stored[theme];
      localStorage.setItem('yw_custom_audio', JSON.stringify(stored));
    } catch(e) {}
    const curTheme = typeof activeTheme !== 'undefined' ? activeTheme : 'campfire';
    if (theme === curTheme) {
      loadAndPlay(theme, 0);
    }
  };
  
  // Initialize — load track and seek to saved position
  loadAndPlay(typeof activeTheme !== 'undefined' ? activeTheme : 'campfire', savedTime);
});

