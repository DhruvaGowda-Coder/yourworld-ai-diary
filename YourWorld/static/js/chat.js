// ── Chat History Persistence ─────────────────────────────────────────────────
const CHAT_STORAGE_KEY = 'yw_chat_history';
const CHAT_DISPLAY_KEY = 'yw_chat_display';
const MAX_STORED_DISPLAY = 30;

function _saveChatHistory() {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory.slice(-MAX_CHAT_HISTORY)));
  } catch(e) {}
}

function _saveDisplayMessages() {
  if (!chatMessages) return;
  try {
    const items = [];
    chatMessages.querySelectorAll('.chat-bubble').forEach(el => {
      items.push({ who: el.classList.contains('bot') ? 'bot' : 'user', html: el.innerHTML });
    });
    localStorage.setItem(CHAT_DISPLAY_KEY, JSON.stringify(items.slice(-MAX_STORED_DISPLAY)));
  } catch(e) {}
}

async function _loadStoredChat() {
  // 1. Try Local Storage first for instant UI
  try {
    const storedDisplay = JSON.parse(localStorage.getItem(CHAT_DISPLAY_KEY) || '[]');
    if (Array.isArray(storedDisplay) && storedDisplay.length > 0) {
      if (chatMessages) chatMessages.innerHTML = '';
      storedDisplay.forEach(({ who, html }) => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${who}`;
        bubble.innerHTML = html;
        chatMessages.appendChild(bubble);
      });
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    const storedHistory = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '[]');
    if (Array.isArray(storedHistory)) {
      chatHistory.push(...storedHistory);
    }
  } catch(e) {}

  // 2. If logged in, sync with Cloud (Firebase) to handle cross-device
  if (typeof userId !== 'undefined' && userId && !userId.startsWith('guest_')) {
    try {
      const response = await fetch('/api/chat/sync');
      if (response.ok) {
        const data = await response.json();
        if (data.history && data.history.length > 0) {
          chatHistory.length = 0;
          chatHistory.push(...data.history);
          _saveChatHistory();

          if (chatMessages) {
            chatMessages.innerHTML = '';
            data.history.forEach(msg => {
              addMessage(msg.content, msg.role === 'assistant' ? 'bot' : 'user');
            });
          }
          _saveDisplayMessages();
        }
      }
    } catch(e) {
      console.warn('Cloud chat sync failed', e);
    }
  }

  ensureGreeting();
}

async function _clearChatHistory() {
  // Clear UI and Local Storage
  try {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    localStorage.removeItem(CHAT_DISPLAY_KEY);
  } catch(e) {}
  chatHistory.length = 0;
  if (chatMessages) chatMessages.innerHTML = '';
  
  // Clear Cloud History (Firebase)
  if (typeof userId !== 'undefined' && userId && !userId.startsWith('guest_')) {
    try {
      await fetch('/api/chat/clear', { 
        method: 'POST', 
        headers: { 'X-CSRFToken': csrfToken } 
      });
    } catch(e) { console.error('Cloud clear failed', e); }
  }
  
  ensureGreeting();
}

// ── Core message renderer ────────────────────────────────────────────────────
function addMessage(text, who = 'user') {
  if (!chatMessages) return;
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${who}`;
  if (who === 'bot' && typeof marked !== 'undefined') {
    bubble.innerHTML = marked.parse(text);
  } else {
    bubble.textContent = text;
  }
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return bubble;
}

function ensureGreeting() {
  if (!chatMessages || chatMessages.children.length > 0) return;
  const greeting = getThemeMeta(activeTheme).greeting;
  addMessage(greeting, 'bot');
  chatHistory.push({ role: 'assistant', content: greeting });
  _saveChatHistory();
  _saveDisplayMessages();
}

// ── Inject "New Chat" button into chat header ────────────────────────────────
(function injectNewChatBtn() {
  const actions = document.querySelector('.chat-actions');
  if (!actions) return;
  const newBtn = document.createElement('button');
  newBtn.id = 'chatNewBtn';
  newBtn.className = 'chat-new-btn';
  newBtn.title = 'Start a new conversation';
  newBtn.innerHTML = '<span style="font-size:1.2rem;vertical-align:middle;margin-right:2px;">+</span> New';
  newBtn.style.cssText = 'background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);color:#f3cda2;font-size:0.75rem;font-weight:600;cursor:pointer;padding:4px 10px;border-radius:20px;transition:all 0.2s;line-height:1;display:inline-flex;align-items:center;text-transform:uppercase;letter-spacing:0.02em;margin-right:4px;';
  
  newBtn.addEventListener('mouseenter', () => { 
    newBtn.style.background = 'rgba(255,255,255,0.15)'; 
    newBtn.style.borderColor = 'rgba(255,255,255,0.25)';
  });
  newBtn.addEventListener('mouseleave', () => { 
    newBtn.style.background = 'rgba(255,255,255,0.08)'; 
    newBtn.style.borderColor = 'rgba(255,255,255,0.1)';
  });
  newBtn.addEventListener('click', () => { 
    if (confirm('Start a new chat? This will clear current messages.')) {
      _clearChatHistory(); 
    }
  });
  
  const closeBtn = document.getElementById('chatClose');
  if (closeBtn) actions.insertBefore(newBtn, closeBtn);
  else actions.appendChild(newBtn);
})();

// ── Chat panel open / close ──────────────────────────────────────────────────
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

// ── Resize handle ────────────────────────────────────────────────────────────
if (chatResizeHandle && chatPanel) {
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;
  let startLeft = 0;
  let startTop = 0;
  let resizing = false;
  let resizePointerId = null;
  let aspectRatio = null;
  const RESIZE_MARGIN = 8;

  const applySize = (width, height, keepRatio) => {
    const maxWidth = Math.min(window.innerWidth - (RESIZE_MARGIN * 2), 520);
    const maxHeight = Math.min(window.innerHeight - (RESIZE_MARGIN * 2), 640);
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
    const nextLeft = Math.max(RESIZE_MARGIN, Math.min(startLeft, window.innerWidth - nextWidth - RESIZE_MARGIN));
    const nextTop = Math.max(RESIZE_MARGIN, Math.min(startTop, window.innerHeight - nextHeight - RESIZE_MARGIN));
    chatPanel.style.left = `${nextLeft}px`;
    chatPanel.style.top = `${nextTop}px`;
    chatPanel.style.right = 'auto';
    chatPanel.style.bottom = 'auto';
    chatPanel.style.width = `${nextWidth}px`;
    chatPanel.style.height = `${nextHeight}px`;
    if (chatMessages) {
      chatMessages.style.maxHeight = `${Math.max(160, nextHeight - 140)}px`;
    }
  };

  const onMove = (event) => {
    if (!resizing || (resizePointerId !== null && event.pointerId !== resizePointerId)) return;
    if (event.cancelable) event.preventDefault();
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    applySize(startWidth + dx, startHeight + dy, true);
  };

  const stopResize = (event) => {
    if (!resizing) return;
    if (event && resizePointerId !== null && event.pointerId !== resizePointerId) return;
    resizing = false;
    resizePointerId = null;
    chatPanel.classList.remove('is-resizing');
    document.body.classList.remove('chat-resize-active');
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', stopResize);
    document.removeEventListener('pointercancel', stopResize);
    try {
      if (event && chatResizeHandle.hasPointerCapture(event.pointerId)) {
        chatResizeHandle.releasePointerCapture(event.pointerId);
      }
    } catch (_) {}
  };

  const startResize = (event) => {
    event.preventDefault();
    if (resizing) stopResize({ pointerId: resizePointerId });
    resizing = true;
    resizePointerId = event.pointerId;
    const rect = chatPanel.getBoundingClientRect();
    startX = event.clientX;
    startY = event.clientY;
    startWidth = rect.width;
    startHeight = rect.height;
    startLeft = Math.max(RESIZE_MARGIN, Math.min(rect.left, window.innerWidth - startWidth - RESIZE_MARGIN));
    startTop = Math.max(RESIZE_MARGIN, Math.min(rect.top, window.innerHeight - startHeight - RESIZE_MARGIN));
    aspectRatio = startWidth / startHeight;

    chatPanel.classList.add('is-resizing');
    document.body.classList.add('chat-resize-active');
    chatPanel.style.left = `${startLeft}px`;
    chatPanel.style.top = `${startTop}px`;
    chatPanel.style.right = 'auto';
    chatPanel.style.bottom = 'auto';
    chatPanel.style.width = `${startWidth}px`;
    chatPanel.style.height = `${startHeight}px`;

    try {
      chatResizeHandle.setPointerCapture(event.pointerId);
    } catch (_) {}
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', stopResize);
    document.addEventListener('pointercancel', stopResize);
  };

  chatResizeHandle.addEventListener('pointerdown', startResize);
}

// ── Drag handle ──────────────────────────────────────────────────────────────
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
    document.removeEventListener('touchmove', onTouchDragMove);
    document.removeEventListener('touchend', stopDragPanel);
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
    if (event.cancelable) event.preventDefault();
    onDragMove(event.touches[0]);
  };

  chatDragHandle.addEventListener('mousedown', startDragging);
  chatDragHandle.addEventListener('touchstart', startDragging, { passive: false });
}

// ── Form submit / AI call ────────────────────────────────────────────────────
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
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => {
        if (response.status === 401 && data.error === 'login_required') {
          typingBubble.innerHTML = 'AI chat requires a free account. <a href="/login/google" class="chat-login-link">Sign in here</a> - it only takes a second.';
          chatHistory.push({ role: 'user', content: text });
          chatHistory.push({ role: 'assistant', content: 'AI chat requires a free account. Sign in to continue.' });
          _saveChatHistory();
          _saveDisplayMessages();
          return;
        }
        if (data && data.theme) {
          setThemeState(data.theme);
          queueParticleRebuild(data.theme);
        }
        const reply = (data && data.reply) ? data.reply : null;
        if (!reply) throw new Error('No reply');
        if (typeof marked !== 'undefined') {
          typingBubble.innerHTML = marked.parse(reply);
        } else {
          typingBubble.textContent = reply;
        }
        chatHistory.push({ role: 'user', content: text });
        chatHistory.push({ role: 'assistant', content: reply });
        _saveChatHistory();
        _saveDisplayMessages();
      })
      .catch(() => {
        const fallbackOptions = getThemeMeta(activeTheme).fallback;
        const fallback = fallbackOptions[Math.floor(Math.random() * fallbackOptions.length)];
        if (typeof marked !== 'undefined') {
          typingBubble.innerHTML = marked.parse(fallback);
        } else {
          typingBubble.textContent = fallback;
        }
        chatHistory.push({ role: 'user', content: text });
        chatHistory.push({ role: 'assistant', content: fallback });
        _saveChatHistory();
        _saveDisplayMessages();
      });
  });
}

// ── Restore history on page load ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  _loadStoredChat();
});
