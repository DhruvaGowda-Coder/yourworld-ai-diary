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

  function _getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
  }

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
          const item = { 
            who: el.classList.contains('bot') ? 'bot' : 'user', 
            text: contentEl.textContent || ''
          };
          const img = el.querySelector('.bubble-image');
          const file = el.querySelector('.bubble-file');
          if (img) {
            item.attachment = { type: 'image/png', url: img.src, name: 'Image' };
          } else if (file) {
            item.attachment = { type: 'file', url: file.href, name: file.querySelector('span:last-child')?.textContent || 'File' };
          }
          items.push(item);
        }
      });
      localStorage.setItem(CHAT_DISPLAY_KEY, JSON.stringify(items.slice(-MAX_STORED_DISPLAY)));
    } catch(e) {}
  }

  function _plainTextFromHtml(html) {
    const el = document.createElement('div');
    el.innerHTML = html || '';
    return el.textContent || '';
  }

  function _escapeHtml(value) {
    const el = document.createElement('div');
    el.textContent = value || '';
    return el.innerHTML;
  }

  function _sanitizeHtml(html) {
    if (typeof DOMPurify === 'undefined') return null;
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'hr'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
  }

  function _renderMessageContent(content, text, who = 'user') {
    if (who === 'bot' && typeof marked !== 'undefined') {
      const sanitized = _sanitizeHtml(marked.parse(text || ''));
      if (sanitized !== null) {
        content.innerHTML = sanitized;
        content.querySelectorAll('a[href]').forEach((link) => {
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
        });
        return;
      }
    }
    content.textContent = text || '';
  }

  function addMessage(text, who = 'user', fileData = null) {
    const msgs = document.getElementById('chatMessages');
    if (!msgs) return;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${who}`;
    const content = document.createElement('div');
    content.className = 'bubble-content';
    _renderMessageContent(content, text, who);
    bubble.appendChild(content);

    if (fileData) {
      if (fileData.type && fileData.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = fileData.url;
        img.className = 'bubble-image';
        bubble.appendChild(img);
      } else {
        const link = document.createElement('a');
        link.href = fileData.url;
        link.className = 'bubble-file';
        link.target = '_blank';
        link.innerHTML = `<span>📎</span> <span>${fileData.name || 'Attached File'}</span>`;
        bubble.appendChild(link);
      }
    }

    const del = document.createElement('button');
    del.className = 'chat-msg-delete';
    del.innerHTML = '&times;';
    del.onclick = (e) => {
      e.stopPropagation();
      bubble.remove();
      _syncHistoryToCloud();
    };
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
        chatHistory.forEach(m => addMessage(m.content, m.role === 'assistant' ? 'bot' : 'user', m.attachment));
        _saveLocalState();
        _saveDisplayMessages();
        panel.classList.remove('showing-history');
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
        const msg = {
          role: el.classList.contains('bot') ? 'assistant' : 'user',
          content: contentEl.textContent
        };
        const img = el.querySelector('.bubble-image');
        const file = el.querySelector('.bubble-file');
        if (img) {
          msg.attachment = { type: 'image/png', url: img.src, name: 'Image' };
        } else if (file) {
          msg.attachment = { type: 'file', url: file.href, name: file.querySelector('span:last-child')?.textContent || 'File' };
        }
        history.push(msg);
      }
    });
    chatHistory = history;
    _saveLocalState();
    _saveDisplayMessages();

    const uid = document.getElementById('current-user-data')?.textContent;
    if (uid && uid !== 'null') {
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': _getCsrfToken() },
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
    histBtn.className = 'chat-header-icon chat-history-toggle';
    histBtn.title = 'Chat History';
    histBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"></line>
        <line x1="8" y1="12" x2="21" y2="12"></line>
        <line x1="8" y1="18" x2="21" y2="18"></line>
        <line x1="3" y1="6" x2="3.01" y2="6"></line>
        <line x1="3" y1="12" x2="3.01" y2="12"></line>
        <line x1="3" y1="18" x2="3.01" y2="18"></line>
      </svg>
    `;
    histBtn.onclick = async () => {
      const showing = panel.classList.toggle('showing-history');
      if (showing) {
        historyList.innerHTML = '<div style="text-align:center;padding:40px;opacity:0.4;font-size:0.9rem;">Fetching your chats...</div>';
        try {
          const r = await fetch('/api/chat/sessions');
          if (!r.ok) throw new Error('API Error');
          const data = await r.json();
          historyList.innerHTML = '<div class="history-list-header">RECENT CONVERSATIONS</div>';
          if (data.sessions && data.sessions.length) {
            data.sessions.forEach(s => {
              const item = document.createElement('div');
              item.className = 'history-item';
              item.innerHTML = `
                <div class="history-item-icon">📜</div>
                <div class="history-item-content">
                  <div class="history-title">${_escapeHtml(s.title || 'New Chat')}</div>
                  <div class="history-date">${_escapeHtml(s.updated_at ? new Date(s.updated_at).toLocaleDateString() : '')}</div>
                </div>
                <button class="history-item-delete" title="Delete Chat">&times;</button>
              `;
              item.onclick = (e) => {
                if (e.target.classList.contains('history-item-delete')) return;
                loadSession(s.id);
              };
              const delBtn = item.querySelector('.history-item-delete');
              delBtn.onclick = async (e) => {
                e.stopPropagation();
                if (!confirm('Delete this conversation history?')) return;
                try {
                  const dr = await fetch(`/api/chat/session/${s.id}`, { 
                    method: 'DELETE',
                    headers: { 'X-CSRFToken': _getCsrfToken() }
                  });
                  if (dr.ok) {
                    item.remove();
                    if (currentSessionId === s.id) {
                      currentSessionId = null;
                      chatHistory = [];
                      msgs.innerHTML = '';
                      localStorage.removeItem(CHAT_STORAGE_KEY);
                      localStorage.removeItem(CHAT_DISPLAY_KEY);
                      localStorage.removeItem(CHAT_SESSION_KEY);
                      ensureGreeting();
                    }
                  }
                } catch(err) { console.error('Delete failed:', err); }
              };
              historyList.appendChild(item);
            });
          } else {
            historyList.innerHTML += '<div style="padding:40px;text-align:center;opacity:0.5;font-size:0.85rem;">No history found.<br>Send a message to start a backup.</div>';
          }
        } catch(e) { 
          historyList.innerHTML = '<div style="padding:40px;text-align:center;color:#ff8888;font-size:0.85rem;">Failed to load history.<br><button type="button" class="chat-retry-btn">Retry</button></div>';
          const retry = historyList.querySelector('.chat-retry-btn');
          if (retry) retry.addEventListener('click', () => location.reload());
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

    // ── STRICT Drag & Move ──
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    const startDragging = (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = panel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      panel.style.transition = 'none';
      e.preventDefault();
    };

    window.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let newLeft = startLeft + dx;
      let newTop = startTop + dy;
      
      const panelW = panel.offsetWidth;
      const panelH = panel.offsetHeight;
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      // Boundary Clamping
      newLeft = Math.max(0, Math.min(newLeft, winW - panelW));
      newTop = Math.max(0, Math.min(newTop, winH - panelH));
      
      panel.style.left = newLeft + 'px';
      panel.style.top = newTop + 'px';
      panel.style.bottom = 'auto';
      panel.style.right = 'auto';
    });

    window.addEventListener('pointerup', () => {
      if (!isDragging) return;
      isDragging = false;
      panel.style.transition = '';
      localStorage.setItem(POS_STORAGE_KEY, JSON.stringify({ 
        left: panel.style.left, 
        top: panel.style.top,
        width: panel.style.width,
        height: panel.style.height
      }));
    });

    if (dragHandle) dragHandle.addEventListener('pointerdown', startDragging);

    // ── STRICT Resize ──
    let isResizing = false;
    let startW, startH;

    const startResizing = (e) => {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startW = panel.offsetWidth;
      startH = panel.offsetHeight;
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('pointermove', (e) => {
      if (!isResizing) return;
      const dw = e.clientX - startX;
      const dh = e.clientY - startY;
      panel.style.width = Math.max(280, startW + dw) + 'px';
      panel.style.height = Math.max(300, startH + dh) + 'px';
    });

    window.addEventListener('pointerup', () => {
      if (!isResizing) return;
      isResizing = false;
      localStorage.setItem(POS_STORAGE_KEY, JSON.stringify({ 
        left: panel.style.left, 
        top: panel.style.top,
        width: panel.style.width,
        height: panel.style.height
      }));
    });

    if (resizeHandle) resizeHandle.addEventListener('pointerdown', startResizing);

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

    // ── File Upload Logic ──
    const uploadBtn = document.getElementById('chatUploadBtn');
    const fileInput = document.getElementById('chatFileInput');
    const filePreview = document.getElementById('chatFilePreview');
    let selectedFile = null;

    if (uploadBtn && fileInput) {
      uploadBtn.onclick = () => fileInput.click();
      fileInput.onchange = () => {
        if (fileInput.files.length > 0) {
          selectedFile = fileInput.files[0];
          filePreview.style.display = 'flex';
          filePreview.innerHTML = `
            <div class="preview-item">
              <span>${selectedFile.name}</span>
              <span class="preview-remove">&times;</span>
            </div>
          `;
          filePreview.querySelector('.preview-remove').onclick = () => {
            selectedFile = null;
            fileInput.value = '';
            filePreview.style.display = 'none';
          };
        }
      };
    }

    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      const text = textInput.value.trim();
      if (!text && !selectedFile) return;

      let fileInfo = null;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const fileType = selectedFile.type.startsWith('image/') ? 'image' : (selectedFile.type.startsWith('audio/') ? 'audio' : 'file');
        
        try {
          const upRes = await fetch(`/api/upload/${fileType}`, {
            method: 'POST',
            headers: { 'X-CSRFToken': _getCsrfToken() },
            body: formData
          });
          if (upRes.ok) {
            fileInfo = await upRes.json();
          } else {
            const err = await upRes.json();
            alert(err.error || 'Upload failed');
            return;
          }
        } catch(err) {
          console.error('Upload error:', err);
          alert('Upload failed');
          return;
        }
      }

      addMessage(text, 'user', fileInfo);
      textInput.value = '';
      selectedFile = null;
      if (fileInput) fileInput.value = '';
      if (filePreview) filePreview.style.display = 'none';

      const typing = addMessage('Thinking...', 'bot');
      
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': _getCsrfToken() },
        body: JSON.stringify({ 
          message: text, 
          history: chatHistory, 
          session_id: currentSessionId,
          attachment: fileInfo
        }),
      })
      .then(r => r.json())
      .then(data => {
        if (data.session_id) currentSessionId = data.session_id;
        const reply = data.reply || '...';
        _renderMessageContent(typing.querySelector('.bubble-content'), reply, 'bot');
        
        chatHistory.push(
          { role: 'user', content: text, attachment: fileInfo }, 
          { role: 'assistant', content: reply }
        );
        _saveLocalState();
        _saveDisplayMessages();
      })
      .catch((err) => { 
        console.error('Chat error:', err);
        typing.querySelector('.bubble-content').textContent = 'Error sending message. Please refresh.'; 
      });
    };

    // Load Initial State
    try {
      const stored = JSON.parse(localStorage.getItem(CHAT_DISPLAY_KEY) || '[]');
      if (stored.length) {
        msgs.innerHTML = '';
        stored.forEach(m => addMessage(m.text || _plainTextFromHtml(m.html || ''), m.who, m.attachment));
      }
      chatHistory = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '[]');
    } catch(e) {}
    ensureGreeting();
  });
})();
