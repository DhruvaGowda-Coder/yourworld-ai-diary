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
const MAX_CHAT_HISTORY = 50;
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
  
  // Update Header Icon Emoji
  const iconEl = document.getElementById('chatThemeIcon');
  if (iconEl) {
    const emojis = { campfire:'🔥', water:'🌊', wind:'💨', earth:'🌿', ice:'❄️', storm:'⚡', space:'🌌', garden:'🌸', cherry:'🌺' };
    iconEl.textContent = emojis[resolved] || '✨';
  }

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
