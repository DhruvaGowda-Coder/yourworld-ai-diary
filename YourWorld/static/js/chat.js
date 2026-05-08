// ── Chat (Aura) Multi-Session, Drag & Resize ─────────────────────────────────
(function() {
  const CHAT_STORAGE_KEY = 'yw_chat_history';
  const CHAT_DISPLAY_KEY = 'yw_chat_display';
  const CHAT_SESSION_KEY = 'yw_chat_session_id';
  const POS_STORAGE_KEY = 'yw_chat_pos';
  const MAX_STORED_DISPLAY = 60;
  const MAX_CHAT_HISTORY = 50;

  let chatHistory = [];
  let currentSessionId = localStorage.getItem(CHAT_SESSION_KEY) || null;

  function _saveLocalState() {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory.slice(-MAX_CHAT_HISTORY)));
      if (currentSessionId) localStorage.setItem(CHAT_SESSION_KEY, currentSessionId);
      else localStorage.removeItem(CHAT_SESSION_KEY);
    } catch(e) {}
  }

  function _saveDisplayMessages() {
    const msgs = document.getElementById('chatMessages');
    if (!msgs) return;
    try {
      const items = [];
      msgs.querySelectorAll('.chat-bubble').forEach(el => {
        const contentEl = el.querySelector('.bubble-content');
        if (contentEl) {
          items.push({ 
            who: el.classList.contains('bot') ? 'bot' : 'user', 
            html: contentEl.innerHTML 
          });
        }
      });
      localStorage.setItem(CHAT_DISPLAY_KEY, JSON.stringify(items.slice(-MAX_STORED_DISPLAY)));
    } catch(e) {}
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
    del.onclick = (e) => {
      e.stopPropagation();
      bubble.remove();
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
    const greeting = "I am Aura. How can I help you today?";
    addMessage(greeting, 'bot');
    chatHistory.push({ role: 'assistant', content: greeting });
    _saveLocalState();
    _saveDisplayMessages();
  }

  async function loadSession(id) {
    const msgs = document.getElementById('chatMessages');
    const panel = document.getElementById('chatPanel');
    if (!msgs || !panel) return;
    
    msgs.innerHTML = '<div style="text-align:center;padding:20px;opacity:0.6;">Loading...</div>';
    try {
      const r = await fetch(`/api/chat/session/${id}`);
      if (r.ok) {
        const data = await r.json();
        currentSessionId = id;
        chatHistory = data.messages || [];
        msgs.innerHTML = '';
        chatHistory.forEach(m => addMessage(m.content, m.role === 'assistant' ? 'bot' : 'user'));
        _saveLocalState();
        _saveDisplayMessages();
        panel.classList.remove('showing-history');
      } else {
        throw new Error('Failed to fetch session');
      }
    } catch(e) {
      msgs.innerHTML = '<div style="text-align:center;padding:20px;color:#ff4d4d;">Failed to load.</div>';
    }
  }

  async function _syncHistoryToCloud() {
    const msgs = document.getElementById('chatMessages');
    if (!msgs) return;
    const history = [];
    msgs.querySelectorAll('.chat-bubble').forEach(el => {
      const contentEl = el.querySelector('.bubble-content');
      if (contentEl) {
        history.push({
          role: el.classList.contains('bot') ? 'assistant' : 'user',
          content: contentEl.textContent
        });
      }
    });
    chatHistory = history;
    _saveLocalState();
    _saveDisplayMessages();

    if (typeof userId !== 'undefined' && userId && !String(userId).startsWith('guest_')) {
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.csrfToken || '' },
        body: JSON.stringify({ sync_only: true, history: history, session_id: currentSessionId }),
      })
      .then(r => r.json())
      .then(data => { if (data.session_id) currentSessionId = data.session_id; _saveLocalState(); });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const launchBtn = document.getElementById('chatLaunch');
    const panel = document.getElementById('chatPanel');
    const closeBtn = document.getElementById('chatClose');
    const dragHandle = document.getElementById('chatDragHandle');
    const resizeHandle = document.getElementById('chatResizeHandle');
    const form = document.getElementById('chatForm');
    const textInput = document.getElementById('chatText');
    const msgs = document.getElementById('chatMessages');

    if (!panel) return;

    // ── History List ──
    const historyList = document.createElement('div');
    historyList.id = 'chatHistoryList';
    historyList.className = 'chat-history-list';
    panel.insertBefore(historyList, msgs);

    const actions = panel.querySelector('.chat-actions');
    
    const histBtn = document.createElement('button');
    histBtn.innerHTML = '🕒';
    histBtn.className = 'chat-header-icon';
    histBtn.title = 'Chat History';
    histBtn.onclick = async () => {
      const showing = panel.classList.toggle('showing-history');
      if (showing) {
        historyList.innerHTML = '<div style="text-align:center;padding:20px;opacity:0.6;">Fetching chats...</div>';
        try {
          const r = await fetch('/api/chat/sessions');
          if (!r.ok) throw new Error('API Error');
          const data = await r.json();
          historyList.innerHTML = '<div style="font-weight:600;padding:12px;opacity:0.8;font-size:0.8rem;border-bottom:1px solid rgba(255,255,255,0.05);">RECENT CHATS</div>';
          if (data.sessions && data.sessions.length) {
            data.sessions.forEach(s => {
              const item = document.createElement('div');
              item.className = 'history-item';
              item.innerHTML = `<div class="history-title">${s.title}</div><div class="history-date">${new Date(s.updated_at).toLocaleDateString()}</div>`;
              item.onclick = () => loadSession(s.id);
              historyList.appendChild(item);
            });
          } else {
            historyList.innerHTML += '<div style="padding:20px;text-align:center;opacity:0.5;font-size:0.85rem;">No history found. Try sending a message first.</div>';
          }
        } catch(e) { 
          historyList.innerHTML = '<div style="padding:20px;text-align:center;color:#ff8888;font-size:0.85rem;">Failed to load history.<br><button onclick="location.reload()" style="margin-top:10px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:white;padding:4px 10px;border-radius:4px;cursor:pointer;">Retry</button></div>';
        }
      }
    };
    if (actions) actions.insertBefore(histBtn, actions.firstChild);

    const newBtn = document.createElement('button');
    newBtn.innerHTML = '+ New';
    newBtn.className = 'chat-new-btn';
    newBtn.onclick = () => {
      currentSessionId = null;
      chatHistory = [];
      msgs.innerHTML = '';
      localStorage.removeItem(CHAT_STORAGE_KEY);
      localStorage.removeItem(CHAT_DISPLAY_KEY);
      localStorage.removeItem(CHAT_SESSION_KEY);
      panel.classList.remove('showing-history');
      ensureGreeting();
    };
    if (actions) actions.insertBefore(newBtn, histBtn);

    // ── Drag & Move ──
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    const onPointerDown = (e) => {
      // Don't drag if clicking buttons, UNLESS it's the drag handle itself
      if (e.target.closest('button') && e.target.id !== 'chatDragHandle') return;
      
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = panel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      panel.setPointerCapture(e.pointerId);
      panel.style.transition = 'none';
      e.preventDefault();
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let newLeft = startLeft + dx;
      let newTop = startTop + dy;
      
      // Bounds checks
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - panel.offsetWidth));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - panel.offsetHeight));
      
      panel.style.left = newLeft + 'px';
      panel.style.top = newTop + 'px';
      panel.style.bottom = 'auto';
      panel.style.right = 'auto';
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      panel.releasePointerCapture(e.pointerId);
      panel.style.transition = '';
      localStorage.setItem(POS_STORAGE_KEY, JSON.stringify({ 
        left: panel.style.left, 
        top: panel.style.top,
        width: panel.style.width,
        height: panel.style.height
      }));
    };

    if (dragHandle) {
      dragHandle.addEventListener('pointerdown', onPointerDown);
      dragHandle.addEventListener('pointermove', onPointerMove);
      dragHandle.addEventListener('pointerup', onPointerUp);
    }

    // ── Resize ──
    let isResizing = false;
    let startW, startH;

    const onResizeDown = (e) => {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startW = panel.offsetWidth;
      startH = panel.offsetHeight;
      panel.setPointerCapture(e.pointerId);
      e.stopPropagation();
      e.preventDefault();
    };

    const onResizeMove = (e) => {
      if (!isResizing) return;
      const dw = e.clientX - startX;
      const dh = e.clientY - startY;
      panel.style.width = Math.max(280, startW + dw) + 'px';
      panel.style.height = Math.max(300, startH + dh) + 'px';
    };

    const onResizeUp = (e) => {
      isResizing = false;
      panel.releasePointerCapture(e.pointerId);
      onPointerUp(e); // save state
    };

    if (resizeHandle) {
      resizeHandle.addEventListener('pointerdown', onResizeDown);
      resizeHandle.addEventListener('pointermove', onResizeMove);
      resizeHandle.addEventListener('pointerup', onResizeUp);
    }

    // Restore Position
    try {
      const saved = JSON.parse(localStorage.getItem(POS_STORAGE_KEY));
      if (saved && window.innerWidth > 768) {
        if (saved.left) panel.style.left = saved.left;
        if (saved.top) panel.style.top = saved.top;
        if (saved.width) panel.style.width = saved.width;
        if (saved.height) panel.style.height = saved.height;
        panel.style.bottom = 'auto';
        panel.style.right = 'auto';
      }
    } catch(e) {}

    if (launchBtn) launchBtn.onclick = () => { panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false'); ensureGreeting(); };
    if (closeBtn) closeBtn.onclick = () => panel.classList.remove('open');

    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      const text = textInput.value.trim();
      if (!text) return;
      addMessage(text, 'user');
      textInput.value = '';
      const typing = addMessage('Thinking...', 'bot');
      
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.csrfToken || '' },
        body: JSON.stringify({ message: text, history: chatHistory, session_id: currentSessionId }),
      })
      .then(r => r.json())
      .then(data => {
        if (data.session_id) currentSessionId = data.session_id;
        const reply = data.reply || '...';
        typing.querySelector('.bubble-content').innerHTML = typeof marked !== 'undefined' ? marked.parse(reply) : reply;
        chatHistory.push({ role: 'user', content: text }, { role: 'assistant', content: reply });
        _saveLocalState();
        _saveDisplayMessages();
      })
      .catch(() => { typing.querySelector('.bubble-content').textContent = 'Error.'; });
    };

    // Load Initial State
    try {
      const stored = JSON.parse(localStorage.getItem(CHAT_DISPLAY_KEY) || '[]');
      if (stored.length) {
        msgs.innerHTML = '';
        stored.forEach(m => addMessage(m.html, m.who, true));
      }
      chatHistory = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '[]');
    } catch(e) {}
    ensureGreeting();
  });
})();
