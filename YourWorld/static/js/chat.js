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

