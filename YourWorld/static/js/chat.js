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
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', stopDrag);
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
    if (event.cancelable) event.preventDefault();
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

