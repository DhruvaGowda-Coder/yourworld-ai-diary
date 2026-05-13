window.csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
const csrfToken = window.csrfToken;

// Production-grade sanitization config
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'b', 'i', 'u', 'div', 'br', 'span', 'strike', 'strong', 'em', 'p', 
    'ul', 'ol', 'li', 'img', 'pre', 'code', 'blockquote',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'font'
  ],
  ALLOWED_ATTR: ['class', 'style', 'src', 'alt', 'width', 'height', 'href', 'title', 'target', 'rel', 'id', 'size', 'color'],
  ADD_ATTR: ['target', 'rel'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'form', 'button'],
  FORBID_ATTR: ['onload', 'onclick', 'onerror', 'onmouseover', 'javascript:'],
  KEEP_CONTENT: true
};

window.sanitizeHTML = (html) => {
  if (typeof DOMPurify === 'undefined') return html;
  let clean = DOMPurify.sanitize(html, PURIFY_CONFIG);
  
  // Strip background and color styles from pasted HTML to blend perfectly with the diary theme
  const temp = document.createElement('div');
  temp.innerHTML = clean;
  const elementsWithStyle = temp.querySelectorAll('[style]');
  elementsWithStyle.forEach(el => {
    el.style.backgroundColor = '';
    el.style.background = '';
    el.style.color = '';
    el.style.fontFamily = '';
    if (!el.getAttribute('style').trim()) {
      el.removeAttribute('style');
    }
  });
  
  return temp.innerHTML;
};

/** Improved link detection for raw text */
window.linkify = (text) => {
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
  return text.replace(urlRegex, (url) => {
    // Skip if already inside an HTML tag or attribute
    if (url.includes('&quot;') || url.includes('&#039;') || url.includes('<') || url.includes('>')) {
      return url;
    }
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
};


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

window.setThemeState = (theme) => {
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

// Initialize active navigation link highlighting
document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
    const linkPath = new URL(link.href, window.location.origin).pathname;
    if (currentPath === linkPath) {
      link.classList.add('active');
    }
  });
});

window.showLoginPromptModal = ({
  title = 'Unlock AI Features',
  message = "Sign in to use Aura's AI writing assistance and other premium features. It's completely free.",
  iconType = 'ai'
} = {}) => {
  const existing = document.getElementById('yw-login-modal');
  if (existing) existing.remove();

  const iconMarkup = {
    ai: `<svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.25));"><path d="M10 2l1.528 4.708a3 3 0 001.764 1.764L18 10l-4.708 1.528a3 3 0 00-1.764 1.764L10 18l-1.528-4.708a3 3 0 00-1.764-1.764L2 10l4.708-1.528a3 3 0 001.764-1.764L10 2z"/><path d="M19 14l.764 2.354a1.5 1.5 0 00.882.882L23 18l-2.354.764a1.5 1.5 0 00-.882.882L19 22l-.764-2.354a1.5 1.5 0 00-.882-.882L15 18l2.354-.764a1.5 1.5 0 00.882-.882L19 14z" opacity="0.8"/><path d="M19 2l.509 1.57a1 1 0 00.588.588L22 4.5l-1.903.509a1 1 0 00-.588.588L19 7l-.509-1.57a1 1 0 00-.588-.588L16 4.5l1.903-.509a1 1 0 00.588-.588L19 2z" opacity="0.6"/></svg>`,
    music: `<svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.2));">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
      <!-- Star 1 (Top Left) -->
      <path d="M7.5 4l.583 1.8a.5.5 0 00.475.346H10.5l-1.54 1.118a.5.5 0 00-.181.558l.588 1.814L7.5 8.518l-1.867 1.356.588-1.814a.5.5 0 00-.181-.558L4.5 6.146h1.942a.5.5 0 00.475-.346L7.5 4z" opacity="0.6" />
      <!-- Star 2 (Bottom Right) -->
      <path d="M18.5 15l.389 1.2a.3.3 0 00.285.208H20.5l-1.026.745a.3.3 0 00-.12.372l.392 1.21L18.5 18.01l-1.245.905.392-1.21a.3.3 0 00-.12-.372L16.5 16.408h1.295a.3.3 0 00.285-.208L18.5 15z" opacity="0.8" />
      <!-- Star 3 (Mid Right) -->
      <path d="M21 9l.233.72a.2.2 0 00.19.138h.777l-.616.447a.2.2 0 00-.072.223l.235.726L21 10.806l-.747.543.235-.726a.2.2 0 00-.072-.223l-.616-.447h.777a.2.2 0 00.19-.138L21 9z" opacity="0.4" />
    </svg>`,
    art: `<svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.25));"><path d="M12 3a9 9 0 000 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16a5 5 0 005-5c0-4.42-4.03-8-9-8zm-5.5 9a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3-4a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm5 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3 4a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg>`
  };

  const modal = document.createElement('div');
  modal.id = 'yw-login-modal';
  modal.className = 'yw-modal-overlay';
  modal.innerHTML = `
    <div class="yw-modal-box" style="border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); background: var(--bg-card, #2a2a2a); border: 1px solid var(--border-color, #444); max-width: 400px; padding: 32px; text-align: center; animation: modalPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
      <style>
        @keyframes modalPop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes starTwinkle { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        .yw-modal-overlay { display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 9999; backdrop-filter: blur(4px); }
        .yw-modal-icon { width: 68px; height: 68px; background: linear-gradient(135deg, var(--theme-accent, #ff7e5f), var(--theme-accent-2, #feb47b)); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: var(--theme-accent-text, #fff); box-shadow: 0 8px 24px var(--theme-accent-soft, rgba(0,0,0,0.3)), inset 0 -4px 12px rgba(0,0,0,0.15), inset 0 4px 12px rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.1); }
        .yw-modal-icon svg path[opacity] { animation: starTwinkle 2s infinite ease-in-out; }
        .yw-modal-box h3 { margin: 0 0 12px; font-size: 1.5rem; color: var(--text-color, #fff); font-weight: 600; font-family: 'Space Grotesk', sans-serif; }
        .yw-modal-box p { margin: 0 0 24px; color: var(--text-color, #aaa); opacity: 0.8; line-height: 1.5; font-size: 1rem; }
        .yw-modal-actions { display: flex; flex-direction: column; gap: 12px; }
        .yw-modal-actions a, .yw-modal-actions button { width: 100%; display: inline-flex; justify-content: center; align-items: center; gap: 8px; padding: 12px; font-size: 1rem; box-sizing: border-box; }
      </style>
      <div class="yw-modal-icon">
        ${iconMarkup[iconType] || iconMarkup.ai}
      </div>
      <h3>${title}</h3>
      <p>${message}</p>
      <div class="yw-modal-actions">
        <a href="/login/google" class="btn primary" style="color: var(--theme-accent-text, #fff); text-decoration: none;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </a>
        <button type="button" class="btn ghost" data-close-login-modal>Not right now</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal || event.target.closest('[data-close-login-modal]')) {
      modal.classList.add('closing');
      modal.querySelector('.yw-modal-box').style.animation = 'modalPop 0.2s cubic-bezier(0.6, -0.28, 0.735, 0.045) reverse forwards';
      setTimeout(() => modal.remove(), 200);
    }
  });
};
