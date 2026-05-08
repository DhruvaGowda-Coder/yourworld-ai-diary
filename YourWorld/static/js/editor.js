const workspace = document.querySelector('.workspace:not(.public-story)');
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
  const shareCustomCodeInput = document.getElementById('shareCustomCode');
  const shareCustomHint = document.getElementById('shareCustomHint');
  const shareCopyBtn = document.getElementById('shareCopyBtn');
  const shareRandomBtn = document.getElementById('shareRandomBtn');
  const shareGenerateBtn = document.getElementById('shareGenerateBtn');
  const shareRemoveBtn = document.getElementById('shareRemoveBtn');
  const customCodePlaceholder = 'Type custom code';
  const normalizeShareCode = (value) => (value || '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 32);

  const bindTap = (btn, handler) => {
    if (!btn) return;
    let startX = 0;
    let startY = 0;
    let isTouching = false;
    
    btn.addEventListener('touchstart', (e) => {
      isTouching = true;
      if (e.touches && e.touches[0]) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
    }, { passive: true });
    
    btn.addEventListener('touchcancel', () => {
      isTouching = false;
    }, { passive: true });
    
    btn.addEventListener('touchend', (e) => {
      if (isTouching) {
        let dist = 0;
        if (e.changedTouches && e.changedTouches[0]) {
          const endX = e.changedTouches[0].clientX;
          const endY = e.changedTouches[0].clientY;
          dist = Math.sqrt((endX - startX)**2 + (endY - startY)**2);
        }
        
        // If movement is less than 15px, it's a tap, not a scroll
        if (dist < 15) {
          if (e.cancelable) { e.preventDefault(); }
          handler(e);
        }
        
        setTimeout(() => { isTouching = false; }, 300);
      }
    });
    
    btn.addEventListener('click', (e) => {
      if (!isTouching) handler(e);
    });
  };
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
    if (shareModeBtn) {
      const span = shareModeBtn.querySelector('span');
      if (span) span.textContent = label;
      else shareModeBtn.textContent = label;
    }
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
      const shareCanEdit = document.getElementById('shareCanEdit');
      const canEdit = shareCanEdit ? shareCanEdit.checked : false;
      try {
        const response = await fetch(`/api/entry/${targetId}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
          body: JSON.stringify({ rotate: false, mode: modeValue, can_edit: canEdit }),
        });
        if (!response.ok) throw new Error('Share update failed');
        const data = await response.json();
        if (data.share_code) shareCode = data.share_code;
        shareCanEditValue = data.can_edit;
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
  let _lastSavedHash = '';  // content hash to prevent duplicate saves
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

  const setCustomCodeHint = (message = '', kind = '') => {
    if (shareCustomHint) {
      shareCustomHint.textContent = message;
      shareCustomHint.dataset.kind = kind;
    }
    if (!shareCustomCodeInput) return;
    shareCustomCodeInput.classList.toggle('is-error', kind === 'error');
    shareCustomCodeInput.placeholder = customCodePlaceholder;
    shareCustomCodeInput.title = message || '';
  };

  const showLoginPromptModal = ({
    title = 'Unlock Image Generation',
    message = "Sign in to generate beautiful AI images for your story. It's completely free and only takes a second.",
  } = {}) => {
    const existing = document.getElementById('yw-login-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'yw-login-modal';
    modal.className = 'yw-modal-overlay';
    modal.innerHTML = `
      <div class="yw-modal-box" style="border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); background: var(--bg-card, #2a2a2a); border: 1px solid var(--border-color, #444); max-width: 400px; padding: 32px; text-align: center; animation: modalPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
        <style>
          @keyframes modalPop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
          .yw-modal-overlay { display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 9999; backdrop-filter: blur(4px); }
          .yw-modal-icon { width: 68px; height: 68px; background: linear-gradient(135deg, var(--theme-accent, #ff7e5f), var(--theme-accent-2, #feb47b)); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: var(--theme-accent-text, #fff); box-shadow: 0 8px 24px var(--theme-accent-soft, rgba(0,0,0,0.3)), inset 0 -4px 12px rgba(0,0,0,0.15), inset 0 4px 12px rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.1); }
          .yw-modal-box h3 { margin: 0 0 12px; font-size: 1.5rem; color: var(--text-color, #fff); font-weight: 600; }
          .yw-modal-box p { margin: 0 0 24px; color: var(--text-color, #aaa); opacity: 0.8; line-height: 1.5; font-size: 1rem; }
          .yw-modal-actions { display: flex; flex-direction: column; gap: 12px; }
          .yw-modal-actions a, .yw-modal-actions button { width: 100%; display: inline-flex; justify-content: center; align-items: center; gap: 8px; padding: 12px; font-size: 1rem; box-sizing: border-box; }
        </style>
        <div class="yw-modal-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.25));">
            <path d="M10 2l1.528 4.708a3 3 0 001.764 1.764L18 10l-4.708 1.528a3 3 0 00-1.764 1.764L10 18l-1.528-4.708a3 3 0 00-1.764-1.764L2 10l4.708-1.528a3 3 0 001.764-1.764L10 2z"/>
            <path d="M19 14l.764 2.354a1.5 1.5 0 00.882.882L23 18l-2.354.764a1.5 1.5 0 00-.882.882L19 22l-.764-2.354a1.5 1.5 0 00-.882-.882L15 18l2.354-.764a1.5 1.5 0 00.882-.882L19 14z" opacity="0.8"/>
            <path d="M19 2l.509 1.57a1 1 0 00.588.588L22 4.5l-1.903.509a1 1 0 00-.588.588L19 7l-.509-1.57a1 1 0 00-.588-.588L16 4.5l1.903-.509a1 1 0 00.588-.588L19 2z" opacity="0.6"/>
          </svg>
        </div>
        <h3>${title}</h3>
        <p>${message}</p>
        <div class="yw-modal-actions">
          <a href="/login/google" class="btn primary" style="color: var(--theme-accent-text, #fff);">
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

  const setTime = (iso, prefix = 'Saved') => {
    if (!saveTime || !iso) return;
    const date = new Date(iso);
    saveTime.textContent = `${prefix} ${date.toLocaleTimeString()}`;
  };

  /** Compute a simple hash of current editor content and styles to detect real changes. */
  const _computeContentHash = () => {
    const t = (titleInput ? titleInput.value : '') +
              '|' + (contentInput ? contentInput.value : '') +
              '|' + JSON.stringify(titleStyleState) +
              '|' + JSON.stringify(contentStyleState) +
              '|' + (imagePrompt ? imagePrompt.value : '') +
              '|' + (currentImageUrl || '') +
              '|' + (imageAttached ? '1' : '0') +
              '|' + JSON.stringify(imageStyleState);
    let h = 0;
    for (let i = 0; i < t.length; i++) { h = ((h << 5) - h + t.charCodeAt(i)) | 0; }
    return String(h);
  };

  const scheduleAutosave = () => {
    if (!autosaveEnabled) return;
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      if (!dirty) return;
      // Only save if content actually changed since last save
      const hash = _computeContentHash();
      if (hash === _lastSavedHash) {
        dirty = false;
        setStatus('Ready');
        return;
      }
      saveEntry({ auto: true });
    }, 800);
  };

  const markDirty = () => {
    dirty = true;
    setStatus('Editing...');
    scheduleAutosave();
  };

  const resizeContentInput = () => {
    if (!contentInput) return;
    contentInput.style.height = 'auto';
    contentInput.style.height = `${Math.max(520, contentInput.scrollHeight)}px`;
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
    if (shareCodeInput) shareCodeInput.value = shareCode || '';
    if (shareCopyBtn) shareCopyBtn.disabled = !shareCode;
    if (shareRemoveBtn) shareRemoveBtn.disabled = !shareCode;
    const shareCanEdit = document.getElementById('shareCanEdit');
    if (shareCanEdit) shareCanEdit.checked = shareCanEditValue;
    const activeCodeDisplay = document.getElementById('activeCodeDisplay');
    if (activeCodeDisplay) {
      if (shareCode) {
        activeCodeDisplay.textContent = `Code: ${shareCode}`;
        activeCodeDisplay.style.display = 'inline-block';
      } else {
        activeCodeDisplay.style.display = 'none';
      }
    }
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
      const handleSelect = async () => {
        try {
          await saveIfDirty();
          navigateToIndex(index);
        } catch (err) {
          console.error('Select failed:', err);
        }
      };
      
      bindTap(item, handleSelect);
      
      entryList.appendChild(item);
    });
    updateNavButtons();
    updatePageCount();
    updateDeleteButton();

    // Add "Load More" button if there are more entries
    if (_hasMoreEntries) {
      const loadMoreBtn = document.createElement('button');
      loadMoreBtn.className = 'btn ghost entry-load-more';
      loadMoreBtn.textContent = 'Load more pages...';
      loadMoreBtn.style.cssText = 'width:100%;margin-top:8px;font-size:0.82rem;opacity:0.7;';
      loadMoreBtn.addEventListener('click', async () => {
        loadMoreBtn.textContent = 'Loading...';
        loadMoreBtn.disabled = true;
        await loadMoreEntries();
      });
      entryList.appendChild(loadMoreBtn);
    }

    const activeItem = entryList.querySelector('.entry-item.active');
    if (activeItem) {
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
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
    resizeContentInput();
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
    _lastSavedHash = _computeContentHash();
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
    resizeContentInput();
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
    _lastSavedHash = _computeContentHash();
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
      const hashAtStart = _computeContentHash();
      try {
        const contentText = contentInput.value || '';
        const hasTitle = Boolean(titleInput.value.trim());
        const hasContent = Boolean(contentText.trim());
        const allowEmpty = options.allowEmpty === true;
        
        // If it's a brand new entry and it's empty, don't bother the server
        if (!currentEntryId && !allowEmpty && !hasTitle && !hasContent) {
          dirty = false;
          _lastSavedHash = hashAtStart;
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
          headers: { 
            'Content-Type': 'application/json', 
            'X-CSRFToken': document.querySelector('meta[name="csrf-token"]')?.content || csrfToken || ''
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Save failed');
        }

        const data = await response.json();
        currentEntryId = data.id;

        // CRITICAL: Only mark as clean if content hasn't changed since we started this save
        const currentHash = _computeContentHash();
        if (currentHash === hashAtStart) {
          dirty = false;
        }
        _lastSavedHash = hashAtStart; // Mark what we just saved as the baseline

        const statusLabel = options.auto ? 'Autosaved' : 'Saved';
        setStatus(statusLabel);
        if (saveStatus) {
          saveStatus.style.transition = 'color 0.3s, transform 0.3s';
          saveStatus.style.color = 'var(--theme-accent, #5cb85c)';
          saveStatus.style.transform = 'scale(1.05)';
          setTimeout(() => { 
            saveStatus.style.color = ''; 
            saveStatus.style.transform = ''; 
          }, 1500);
        }
        setTime(data.updated_at, statusLabel);

        // Update local entries list
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
        
        // Broadcast activity update for other tabs (e.g., Profile page)
        localStorage.setItem('yw_activity_updated', Date.now());
        return currentEntryId;
      } catch (err) {
        console.error('Save error:', err);
        setStatus('Offline');
        return null;
      } finally {
        isSaving = false;
        saveInFlight = null;
        // If content changed while we were saving, trigger another save soon
        if (dirty) scheduleAutosave();
      }
    };

    saveInFlight = runSave();
    return saveInFlight;
  };


  let _hasMoreEntries = false;
  let _loadingMore = false;

  const loadEntries = async () => {
    const response = await fetch(`/api/entries?type=${entryType}&limit=50`);
    if (!response.ok) return;
    const data = await response.json();
    entries = data.entries || data;  // Support both new paginated and legacy format
    _hasMoreEntries = data.has_more || false;
    if (entries.length > 0) {
      currentIndex = entries.length - 1;
      renderEntries();
      await loadEntry(entries[currentIndex].id);
    } else {
      createBlank();
    }
  };

  /** Load more entries (infinite scroll / load-more button). */
  const loadMoreEntries = async () => {
    if (_loadingMore || !_hasMoreEntries || entries.length === 0) return;
    _loadingMore = true;
    const lastId = entries[entries.length - 1].id;
    try {
      const response = await fetch(`/api/entries?type=${entryType}&limit=20&after=${lastId}`);
      if (!response.ok) return;
      const data = await response.json();
      const newEntries = data.entries || [];
      _hasMoreEntries = data.has_more || false;
      entries = entries.concat(newEntries);
      renderEntries();
    } finally {
      _loadingMore = false;
    }
  };

  if (newEntryBtn) {
    const handleNewEntry = async (e) => {
      try {
        await saveIfDirty();
        animateTurn('next', async () => {
          createBlank();
          await saveEntry({ allowEmpty: true, reuseActiveId: false });
        });
      } catch (err) {
        console.error('New entry failed:', err);
        setStatus('Error adding page');
      }
    };
    bindTap(newEntryBtn, handleNewEntry);
  }

  if (deleteEntryBtn) {
    const handleDeleteEntry = async (e) => {
      const targetId = getActiveEntryId();
      if (!targetId) return;
      if (!window.confirm('Delete this page?')) return;
      setStatus('Deleting...');
      try {
        const resp = await fetch(`/api/entry/${targetId}`, { method: 'DELETE', headers: { 'X-CSRFToken': csrfToken } });
        if (!resp.ok) throw new Error('Delete failed');
        const indexToRemove = entries.findIndex(e => e.id === targetId);
        if (indexToRemove >= 0) entries.splice(indexToRemove, 1);
        currentEntryId = null;
        imageAttached = false;
        shareCode = null;
        updateShareUI();
        if (entries.length > 0) navigateToIndex(Math.min(indexToRemove, entries.length - 1));
        else createBlank();
        setStatus('Deleted');
        renderEntries();
      } catch (err) {
        console.error('Delete failed:', err);
        setStatus('Delete failed');
      }
    };
    bindTap(deleteEntryBtn, handleDeleteEntry);
  }

  if (prevBtn) {
    const handlePrev = async (e) => {
      try {
        const activeIndex = getActiveIndex();
        if (activeIndex <= 0) return;
        await saveIfDirty();
        navigateToIndex(activeIndex - 1);
      } catch (err) {
        console.error('Prev failed:', err);
      }
    };
    bindTap(prevBtn, handlePrev);
  }

  if (nextBtn) {
    const handleNext = async (e) => {
      try {
        const activeIndex = getActiveIndex();
        if (activeIndex < 0 || activeIndex >= entries.length - 1) return;
        await saveIfDirty();
        navigateToIndex(activeIndex + 1);
      } catch (err) {
        console.error('Next failed:', err);
      }
    };
    bindTap(nextBtn, handleNext);
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
    contentInput.addEventListener('input', () => {
      markDirty();
    });
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
      const plain = clipboard.getData('text/plain');
      const html = clipboard.getData('text/html');
      if (!html && !plain) return;
      event.preventDefault();
      const text = plain || htmlToText(html);
      insertAtCursor(contentInput, text);
      resizeContentInput();
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
        if (response.status === 401 && data.error === 'login_required') {
          setStatus('Sign in to generate AI images. It is free.');
          showLoginPromptModal();
          return;
        }
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
        
        if (response.status === 401 && data.error === 'login_required') {
          setStatus('Sign in to upload images.');
          showLoginPromptModal({
            title: 'Sign In Required',
            message: "Image uploads are available to signed-in users. It's completely free.",
          });
          return;
        }

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


  const saveShareCode = async ({ useRandom = false } = {}) => {
    if (!getActiveEntryId()) {
      await saveEntry({ allowEmpty: true });
    }
    const targetId = getActiveEntryId();
    if (!targetId) {
      setStatus('Save page first');
      return;
    }
    const mode = shareModeSelect ? shareModeSelect.value : 'story';
    const shareCanEdit = document.getElementById('shareCanEdit');
    const canEdit = shareCanEdit ? shareCanEdit.checked : false;
    let customCode = shareCustomCodeInput ? normalizeShareCode(shareCustomCodeInput.value) : '';
    if (useRandom) {
      customCode = '';
      if (shareCustomCodeInput) shareCustomCodeInput.value = '';
    } else if (shareCustomCodeInput) {
      shareCustomCodeInput.value = customCode;
    }
    if (!useRandom && !customCode) {
      setCustomCodeHint('Enter a custom code here, or choose Random Code.', 'error');
      return;
    }
    if (customCode && !/^[A-Za-z0-9][A-Za-z0-9_.~-]{3,31}$/.test(customCode)) {
      setCustomCodeHint('Use 4-32 letters, numbers, hyphens, dots, underscores, or tildes.', 'error');
      return;
    }
    setCustomCodeHint('');
    if (shareRandomBtn) shareRandomBtn.disabled = true;
    if (shareGenerateBtn) shareGenerateBtn.disabled = true;
    setStatus(useRandom ? 'Generating random code...' : 'Saving custom code...');
    try {
      const response = await fetch(`/api/entry/${targetId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        body: JSON.stringify({ rotate: useRandom, mode, custom_code: customCode, can_edit: canEdit }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401 && data.error === 'login_required') {
        setStatus('Sign in to generate share codes.');
        showLoginPromptModal({
          title: 'Sign In Required',
          message: "Share codes are available to signed-in users. It's completely free.",
        });
        return;
      }
      if (!response.ok) {
        if (data.error === 'code_unavailable') {
          setCustomCodeHint(data.message || 'This code already exists. Please choose another code.', 'error');
          return;
        }
        throw new Error(data.message || data.error || 'Share failed');
      }
      shareCode = data.share_code;
      shareCanEditValue = data.can_edit;
      if (!useRandom && shareCustomCodeInput) {
        shareCustomCodeInput.placeholder = customCodePlaceholder;
        shareCustomCodeInput.title = '';
        shareCustomCodeInput.classList.remove('is-error');
      }
      if (data.share_type && shareModeSelect) {
        shareModeSelect.value = data.share_type;
      }
      updateShareUI();
      setStatus(useRandom ? 'Random code generated' : 'Custom code saved');
      setCustomCodeHint('');
    } catch (err) {
      setStatus(err.message || 'Share failed');
    } finally {
      if (shareRandomBtn) shareRandomBtn.disabled = false;
      if (shareGenerateBtn) shareGenerateBtn.disabled = false;
      updateShareUI();
    }
  };

  if (shareRandomBtn) {
    shareRandomBtn.addEventListener('click', () => {
      saveShareCode({ useRandom: true });
    });
  }

  if (shareGenerateBtn) {
    shareGenerateBtn.addEventListener('click', () => {
      saveShareCode({ useRandom: false });
    });
  }

  if (shareCustomCodeInput) {
    shareCustomCodeInput.addEventListener('input', () => {
      setCustomCodeHint('');
    });
  }

  // Auto-sync edit permission when checkbox is toggled
  const shareCanEditCheckbox = document.getElementById('shareCanEdit');
  if (shareCanEditCheckbox) {
    shareCanEditCheckbox.addEventListener('change', async () => {
      const targetId = getActiveEntryId();
      if (!targetId || !shareCode) {
        // No share code yet — just update local state
        shareCanEditValue = shareCanEditCheckbox.checked;
        return;
      }
      const mode = shareModeSelect ? shareModeSelect.value : 'story';
      const canEdit = shareCanEditCheckbox.checked;
      try {
        const response = await fetch(`/api/entry/${targetId}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
          body: JSON.stringify({ rotate: false, mode, can_edit: canEdit }),
        });
        if (!response.ok) throw new Error('Permission update failed');
        const data = await response.json();
        shareCanEditValue = data.can_edit;
        if (data.share_code) shareCode = data.share_code;
        updateShareUI();
        setStatus(canEdit ? 'Edit enabled for viewers' : 'Edit disabled for viewers');
      } catch (err) {
        setStatus('Permission update failed');
        // Revert checkbox on failure
        shareCanEditCheckbox.checked = shareCanEditValue;
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
        shareCopyBtn.disabled = false;
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

  // --- Implementation of Drag, Resize, and Delete for Shared Canvas Editor ---
  if (pageIllustration) {
    let isDragging = false;
    let isResizing = false;
    let startX, startY, startW, startH, startTX, startTY;

    // Mouse support
    pageIllustration.addEventListener('mousedown', (e) => {
      if (e.target.id === 'resizeHandle' || e.target.id === 'deleteIllustrationBtn') return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startTX = imageStyleState.x || 0;
      startTY = imageStyleState.y || 0;
      pageIllustration.style.cursor = 'grabbing';
      e.preventDefault();
    });

    let touchTimer = null;
    let isTouchActive = false;

    // Touch support for dragging with hold-to-drag prevention
    pageIllustration.addEventListener('touchstart', (e) => {
      if (e.target.id === 'resizeHandle' || e.target.id === 'deleteIllustrationBtn') return;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTX = imageStyleState.x || 0;
      startTY = imageStyleState.y || 0;
      isTouchActive = true;

      if (touchTimer) clearTimeout(touchTimer);
      touchTimer = setTimeout(() => {
        if (isTouchActive) {
          isDragging = true;
          pageIllustration.classList.add('is-dragging');
          if (navigator.vibrate) navigator.vibrate(5); // Subtle haptic feedback
        }
      }, 200);
    }, { passive: false });

    const resizeH = document.getElementById('resizeHandle');
    if (resizeH) {
      resizeH.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startW = pageIllustration.offsetWidth;
        startH = pageIllustration.offsetHeight;
        e.preventDefault();
        e.stopPropagation();
      });

      // Touch support for resizing
      resizeH.addEventListener('touchstart', (e) => {
        isResizing = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startW = pageIllustration.offsetWidth;
        startH = pageIllustration.offsetHeight;
        e.stopPropagation();
      }, { passive: false });
    }

    const deleteIllBtn = document.getElementById('deleteIllustrationBtn');
    if (deleteIllBtn) {
      deleteIllBtn.addEventListener('click', (e) => {
        if (confirm('Remove this illustration from the page?')) {
          imageAttached = false;
          updateImageActions();
          updatePageIllustration();
          markDirty();
        }
        e.stopPropagation();
      });
    }

    const handleMove = (e) => {
      if (e.touches && !isDragging && isTouchActive) {
        const dx = Math.abs(e.touches[0].clientX - startX);
        const dy = Math.abs(e.touches[0].clientY - startY);
        if (dx > 20 || dy > 20) { // Increased threshold to 20px for safer scrolling
          isTouchActive = false;
          clearTimeout(touchTimer);
        }
      }

      if (!isDragging && !isResizing) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      if (isDragging) {
        const dx = clientX - startX;
        const dy = clientY - startY;
        
        const rawX = startTX + dx;
        const rawY = startTY + dy;
        
        // Boundary Clamping (Ensure image stays within visible page bounds)
        const page = document.getElementById('pageContent') || document.querySelector('.page');
        const pageW = page ? page.offsetWidth : 500;
        const imgW = pageIllustration.offsetWidth;
        
        // Allow slight overflow for artistic effect, but keep core within bounds
        imageStyleState.x = Math.max(-20, Math.min(rawX, pageW - imgW + 20));
        imageStyleState.y = Math.max(-100, Math.min(rawY, 1200)); // Reasonable vertical limit
        
        applyImageStyle();
        markDirty();
      } else if (isResizing) {
        const dx = clientX - startX;
        const dy = clientY - startY;
        
        const page = document.getElementById('pageContent') || document.querySelector('.page');
        const pageW = page ? page.offsetWidth : 500;
        const maxW = Math.max(100, pageW - 40);
        
        imageStyleState.width = Math.max(50, Math.min(startW + dx, maxW));
        imageStyleState.height = Math.max(50, startH + dy);
        applyImageStyle();
        markDirty();
      }
      if (e.cancelable && (isDragging || isResizing)) e.preventDefault();
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove, { passive: false });

    const handleEnd = () => {
      isTouchActive = false;
      if (touchTimer) clearTimeout(touchTimer);
      if (isDragging || isResizing) {
        isDragging = false;
        isResizing = false;
        pageIllustration.style.cursor = 'grab';
        pageIllustration.classList.remove('is-dragging');
      }
    };

    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', () => {
      isTouchActive = false;
      if (touchTimer) clearTimeout(touchTimer);
      isDragging = false;
      isResizing = false;
      pageIllustration.style.cursor = 'grab';
      pageIllustration.classList.remove('is-dragging');
    });
  }

  applyEditorStyle();
  resizeContentInput();
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
