// ── Chat Multi-Session & Logic ────────────────────────────────────────────────
(function() {
  const CHAT_STORAGE_KEY = 'yw_chat_history';
  const CHAT_DISPLAY_KEY = 'yw_chat_display';
  const CHAT_SESSION_KEY = 'yw_chat_session_id';
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
        items.push({ 
          who: el.classList.contains('bot') ? 'bot' : 'user', 
          html: el.querySelector('.bubble-content').innerHTML 
        });
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
      }
    } catch(e) {
      msgs.innerHTML = '<div style="text-align:center;padding:20px;color:var(--theme-accent-2);">Failed to load history.</div>';
    }
  }

  async function _syncHistoryToCloud() {
    const msgs = document.getElementById('chatMessages');
    if (!msgs) return;
    const history = [];
    msgs.querySelectorAll('.chat-bubble').forEach(el => {
      history.push({
        role: el.classList.contains('bot') ? 'assistant' : 'user',
        content: el.querySelector('.bubble-content').textContent
      });
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
    const form = document.getElementById('chatForm');
    const textInput = document.getElementById('chatText');
    const msgs = document.getElementById('chatMessages');
    const historyList = document.createElement('div');
    historyList.id = 'chatHistoryList';
    historyList.className = 'chat-history-list';
    panel.insertBefore(historyList, msgs);

    // Header Actions
    const actions = panel.querySelector('.chat-actions');
    
    // History Toggle
    const histBtn = document.createElement('button');
    histBtn.innerHTML = '🕒';
    histBtn.title = 'View History';
    histBtn.className = 'chat-header-icon';
    histBtn.onclick = async () => {
      const showing = panel.classList.toggle('showing-history');
      if (showing) {
        historyList.innerHTML = '<div style="text-align:center;padding:20px;opacity:0.6;">Fetching chats...</div>';
        try {
          const r = await fetch('/api/chat/sessions');
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
            historyList.innerHTML += '<div style="padding:20px;text-align:center;opacity:0.5;font-size:0.85rem;">No history found.</div>';
          }
        } catch(e) { historyList.innerHTML = 'Error loading sessions.'; }
      }
    };
    actions.insertBefore(histBtn, actions.firstChild);

    // New Chat Button
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
    actions.insertBefore(newBtn, histBtn);

    if (launchBtn) launchBtn.onclick = () => { panel.classList.add('open'); ensureGreeting(); };
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
