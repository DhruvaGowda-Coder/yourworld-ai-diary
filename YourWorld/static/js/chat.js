// ── Chat Persistence & Logic ──────────────────────────────────────────────────
(function() {
  const CHAT_STORAGE_KEY = 'yw_chat_history';
  const CHAT_DISPLAY_KEY = 'yw_chat_display';
  const MAX_STORED_DISPLAY = 60;
  const MAX_CHAT_HISTORY = 50;

  let chatHistory = [];

  function _saveChatHistory() {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory.slice(-MAX_CHAT_HISTORY)));
    } catch(e) {}
  }

  function _saveDisplayMessages() {
    const msgs = document.getElementById('chatMessages');
    if (!msgs) return;
    try {
      const items = [];
      msgs.querySelectorAll('.chat-bubble').forEach(el => {
        items.push({ 
          who: el.classList.contains('bot') ? 'bot' : 'user', 
          html: el.querySelector('.bubble-content').innerHTML 
        });
      });
      localStorage.setItem(CHAT_DISPLAY_KEY, JSON.stringify(items.slice(-MAX_STORED_DISPLAY)));
    } catch(e) {}
  }

  async function _syncHistoryToCloud() {
    if (typeof userId !== 'undefined' && userId && !userId.startsWith('guest_')) {
      try {
        const historyPayload = chatHistory.slice(-MAX_CHAT_HISTORY);
        await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.csrfToken || '' },
          body: JSON.stringify({ message: "", history: historyPayload, sync_only: true }),
        });
      } catch(e) {}
    }
  }

  function addMessage(text, who = 'user', isHtml = false) {
    const msgs = document.getElementById('chatMessages');
    if (!msgs) return;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${who}`;
    const content = document.createElement('div');
    content.className = 'bubble-content';
    if (who === 'bot' && typeof marked !== 'undefined' && !isHtml) {
      content.innerHTML = marked.parse(text);
    } else if (isHtml) {
      content.innerHTML = text;
    } else {
      content.textContent = text;
    }
    const del = document.createElement('button');
    del.className = 'chat-msg-delete';
    del.innerHTML = '&times;';
    del.title = 'Delete message';
    del.onclick = (e) => {
      e.stopPropagation();
      bubble.remove();
      const newHistory = [];
      msgs.querySelectorAll('.chat-bubble').forEach(el => {
        newHistory.push({
          role: el.classList.contains('bot') ? 'assistant' : 'user',
          content: el.querySelector('.bubble-content').textContent
        });
      });
      chatHistory.length = 0;
      chatHistory.push(...newHistory);
      _saveChatHistory();
      _saveDisplayMessages();
      _syncHistoryToCloud();
    };
    bubble.appendChild(content);
    bubble.appendChild(del);
    msgs.appendChild(bubble);
    msgs.scrollTop = msgs.scrollHeight;
    return bubble;
  }

  function ensureGreeting() {
    const msgs = document.getElementById('chatMessages');
    if (!msgs || msgs.children.length > 0) return;
    const meta = (typeof getThemeMeta === 'function') ? getThemeMeta(activeTheme) : { greeting: 'Hello' };
    const greeting = meta.greeting;
    addMessage(greeting, 'bot');
    chatHistory.push({ role: 'assistant', content: greeting });
    _saveChatHistory();
    _saveDisplayMessages();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const launchBtn = document.getElementById('chatLaunch');
    const panel = document.getElementById('chatPanel');
    const closeBtn = document.getElementById('chatClose');
    const resizeHandle = document.getElementById('chatResizeHandle');
    const dragHandle = document.getElementById('chatDragHandle');
    const form = document.getElementById('chatForm');
    const textInput = document.getElementById('chatText');
    const msgs = document.getElementById('chatMessages');

    if (launchBtn && panel) {
      launchBtn.addEventListener('click', () => {
        panel.classList.add('open');
        panel.setAttribute('aria-hidden', 'false');
        ensureGreeting();
      });
    }

    if (closeBtn && panel) {
      closeBtn.addEventListener('click', () => {
        panel.classList.remove('open');
        panel.setAttribute('aria-hidden', 'true');
      });
    }

    if (form && textInput) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = textInput.value.trim();
        if (!text) return;
        addMessage(text, 'user');
        textInput.value = '';
        const typing = addMessage('Thinking...', 'bot');
        const historyPayload = chatHistory.slice(-MAX_CHAT_HISTORY);
        const context = (typeof getChatContext === 'function') ? getChatContext() : null;
        fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.csrfToken || '' },
          body: JSON.stringify({ message: text, history: historyPayload, context: context }),
        })
        .then(r => r.json().then(data => ({ r, data })))
        .then(({ r, data }) => {
          if (r.status === 401) {
            typing.querySelector('.bubble-content').innerHTML = 'AI chat requires a free account. <a href="/login/google" class="chat-login-link">Sign in here</a>.';
            return;
          }
          if (data && data.theme && typeof setThemeState === 'function') {
            setThemeState(data.theme);
            if (typeof queueParticleRebuild === 'function') queueParticleRebuild(data.theme);
          }
          const reply = data.reply || 'I am here with you.';
          typing.querySelector('.bubble-content').innerHTML = (typeof marked !== 'undefined') ? marked.parse(reply) : reply;
          chatHistory.push({ role: 'user', content: text }, { role: 'assistant', content: reply });
          _saveChatHistory();
          _saveDisplayMessages();
        })
        .catch(() => {
          typing.querySelector('.bubble-content').textContent = 'I am here with you. Tell me more.';
        });
      });
    }

    // Resize and Drag logic simplified/re-attached
    if (resizeHandle && panel) {
      let startX, startY, startW, startH, startL, startT, ratio, resizing = false;
      resizeHandle.addEventListener('pointerdown', (e) => {
        e.preventDefault(); resizing = true;
        const rect = panel.getBoundingClientRect();
        startX = e.clientX; startY = e.clientY;
        startW = rect.width; startH = rect.height;
        startL = rect.left; startT = rect.top;
        ratio = startW / startH;
        panel.classList.add('is-resizing');
        const onMove = (me) => {
          if (!resizing) return;
          const dx = me.clientX - startX; const dy = me.clientY - startY;
          let nw = Math.max(280, startW + dx); let nh = Math.max(260, startH + dy);
          panel.style.width = `${nw}px`; panel.style.height = `${nh}px`;
          panel.style.left = `${startL}px`; panel.style.top = `${startT}px`;
          panel.style.right = 'auto'; panel.style.bottom = 'auto';
          if (msgs) msgs.style.maxHeight = `${nh - 140}px`;
        };
        const onUp = () => {
          resizing = false; panel.classList.remove('is-resizing');
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
        };
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
      });
    }

    if (dragHandle && panel) {
      let dx, dy, dragging = false;
      const start = (e) => {
        const touch = e.touches ? e.touches[0] : e;
        const rect = panel.getBoundingClientRect();
        dx = touch.clientX - rect.left; dy = touch.clientY - rect.top;
        dragging = true;
        const move = (me) => {
          if (!dragging) return;
          const mt = me.touches ? me.touches[0] : me;
          panel.style.left = `${mt.clientX - dx}px`;
          panel.style.top = `${mt.clientY - dy}px`;
          panel.style.right = 'auto'; panel.style.bottom = 'auto';
        };
        const up = () => { dragging = false; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); document.removeEventListener('touchmove', move); document.removeEventListener('touchend', up); };
        document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
        document.addEventListener('touchmove', move, { passive: false }); document.addEventListener('touchend', up);
      };
      dragHandle.addEventListener('mousedown', start);
      dragHandle.addEventListener('touchstart', start, { passive: false });
    }

    // New Chat Button
    const actions = panel.querySelector('.chat-actions');
    if (actions && !document.getElementById('chatNewBtn')) {
      const newBtn = document.createElement('button');
      newBtn.id = 'chatNewBtn';
      newBtn.className = 'chat-new-btn';
      newBtn.innerHTML = '+ New';
      newBtn.style.cssText = 'background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);color:#f3cda2;font-size:0.75rem;font-weight:600;cursor:pointer;padding:4px 10px;border-radius:20px;margin-right:4px;';
      newBtn.onclick = () => { if (confirm('Clear chat history?')) { 
        localStorage.removeItem(CHAT_STORAGE_KEY); localStorage.removeItem(CHAT_DISPLAY_KEY);
        chatHistory.length = 0; if (msgs) msgs.innerHTML = '';
        fetch('/api/chat/clear', { method: 'POST', headers: { 'X-CSRFToken': window.csrfToken || '' } });
        ensureGreeting();
      }};
      actions.insertBefore(newBtn, actions.firstChild);
    }

    // Initial Load
    try {
      const stored = JSON.parse(localStorage.getItem(CHAT_DISPLAY_KEY) || '[]');
      if (stored.length && msgs) {
        msgs.innerHTML = '';
        stored.forEach(m => addMessage(m.html, m.who, true));
      }
      const hist = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '[]');
      chatHistory.push(...hist);
    } catch(e) {}
    ensureGreeting();
  });
})();
