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
        
        // Increased threshold to 30px for better mobile reliability
        if (dist < 30) {
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
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.csrfToken },
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
    const title = ((titleInput && titleInput.innerText) || '').trim();
    const content = ((contentInput && contentInput.innerText) || '').trim();
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
  let currentImages = []; // Array of {url, x, y, width, height}
  let generatedImageUrl = null; // The URL of the most recently generated/uploaded image (not yet attached)
  const resizeHandle = document.getElementById('resizeHandle');
  document.addEventListener('imageStyleUpdate', (e) => {
    const idx = e.detail.index;
    if (idx === undefined || !currentImages[idx]) return;
    const img = currentImages[idx];
    if (e.detail.x !== undefined) img.x = e.detail.x;
    if (e.detail.y !== undefined) img.y = e.detail.y;
    if (e.detail.width !== undefined) img.width = e.detail.width;
    if (e.detail.height !== undefined) img.height = e.detail.height;
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

  const showLoginPromptModal = (options = {}) => {
    if (typeof window.showLoginPromptModal === 'function') {
      window.showLoginPromptModal(options);
    }
  };

  const setTime = (iso, prefix = 'Saved') => {
    if (!saveTime || !iso) return;
    const date = new Date(iso);
    saveTime.textContent = `${prefix} ${date.toLocaleTimeString()}`;
  };

  /** Compute a simple hash of current editor content and styles to detect real changes. */
  const _computeContentHash = () => {
    const t = (titleInput ? titleInput.innerHTML : '') +
              '|' + (contentInput ? contentInput.innerHTML : '') +
              '|' + JSON.stringify(titleStyleState) +
              '|' + JSON.stringify(contentStyleState) +
              '|' + (imagePrompt ? imagePrompt.value : '') +
              '|' + JSON.stringify(currentImages) +
              '|' + (generatedImageUrl || '');
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

  /** Auto-resizes the textarea to fit content height. */
  const resizeContentInput = () => {
    // No-op for contenteditable, but kept for compatibility
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
    if (currentEntryId) {
      const byId = entries.findIndex((entry) => entry.id === currentEntryId);
      if (byId >= 0) return byId;
    }
    if (currentIndex >= 0 && currentIndex < entries.length) return currentIndex;
    // Removed the fallback to return 0 or lastActiveIndex if we are explicitly in "new" mode (currentEntryId is null and currentIndex is -1)
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
    const rawTitle = titleInput.innerText || '';
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
    if (generatedImageUrl) {
      clearBtn = document.createElement('button');
      clearBtn.innerHTML = '&times;';
      clearBtn.title = 'Remove Image';
      clearBtn.type = 'button';
      clearBtn.className = 'preview-clear-btn';
      clearBtn.style.cssText = 'position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.6);color:white;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;z-index:10;';
      clearBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to discard this image?")) {
          generatedImageUrl = null;
          dirty = true;
          renderImagePreview();
          updateImageActions();
        }
      };
    }

    if (imageError) {
      const placeholder = document.createElement('div');
      placeholder.className = 'image-placeholder error';
      placeholder.textContent = imageError;
      imagePreview.appendChild(placeholder);
    } else if (generatedImageUrl) {
      const img = document.createElement('img');
      img.src = generatedImageUrl;
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

  const applyImageStyle = (el, state) => {
    if (!el || !state) return;
    const isMobile = window.innerWidth <= 900;
    
    // Force absolute positioning for consistent drag math on all devices
    el.style.position = 'absolute';
    el.style.width = (state.width || 250) + 'px';
    el.style.height = state.height ? (state.height + 'px') : 'auto';
    el.style.transform = `translate(${state.x || 0}px, ${state.y || 0}px)`;
    
    if (isMobile) {
      el.style.maxWidth = '100%';
    }
  };

  const updatePageIllustration = () => {
    const container = document.getElementById('pageIllustrations');
    if (!container) return;
    container.innerHTML = '';
    
    currentImages.forEach((imgState, index) => {
      const ill = document.createElement('div');
      ill.className = 'page-illustration';
      ill.dataset.index = index;
      
      const img = document.createElement('img');
      img.src = imgState.url;
      ill.appendChild(img);
      
      const handle = document.createElement('div');
      handle.className = 'resize-handle';
      handle.id = `resizeHandle_${index}`;
      ill.appendChild(handle);
      
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'delete-ill-btn';
      delBtn.innerHTML = '&times;';
      
      // Stop drag/resize interference by killing these events before they bubble to the parent
      delBtn.addEventListener('mousedown', e => e.stopPropagation());
      delBtn.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
      
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (confirm('Remove this image from page?')) {
          currentImages.splice(index, 1);
          markDirty();
          updatePageIllustration();
        }
      });
      ill.appendChild(delBtn);
      
      container.appendChild(ill);
      applyImageStyle(ill, imgState);
      setupIllustrationInteractions(ill, index);
    });
  };

  const updateImageActions = () => {
    const hasGenerated = Boolean(generatedImageUrl);
    if (imageViewBtn) imageViewBtn.disabled = !hasGenerated;
    if (imageDownloadBtn) imageDownloadBtn.disabled = !hasGenerated;
    if (imageAttachBtn) {
      imageAttachBtn.disabled = !hasGenerated;
      imageAttachBtn.textContent = 'Insert in Page';
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
    element.style.fontSize = `${state.fontSize}rem`;
  };


  const syncActiveTargetFromFocus = () => {
    if (!titleInput || !contentInput) return;
    if (document.activeElement === titleInput) activeEditorTarget = 'title';
    if (document.activeElement === contentInput) activeEditorTarget = 'content';
  };

  const refreshToolbarState = () => {
    if (formatBoldBtn) formatBoldBtn.classList.toggle('active', document.queryCommandState('bold'));
    if (formatItalicBtn) formatItalicBtn.classList.toggle('active', document.queryCommandState('italic'));
    if (formatUnderlineBtn) formatUnderlineBtn.classList.toggle('active', document.queryCommandState('underline'));
    
    const state = getStyleState(activeEditorTarget);
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

  const renderEntries = (options = {}) => {
    if (!entryList) return;
    entryList.innerHTML = '';
    entries.forEach((entry, index) => {
      const item = document.createElement('div');
      item.className = 'entry-item' + (index === currentIndex ? ' active' : '');
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = entry.title || 'Untitled';
      item.textContent = tempDiv.innerText || 'Untitled';
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
    if (activeItem && options.scroll !== false) {
      const isMobile = window.innerWidth <= 900;
      if (!isMobile) {
        const container = entryList;
        const itemTop = activeItem.offsetTop;
        const itemBottom = itemTop + activeItem.offsetHeight;
        const scrollTop = container.scrollTop;
        const scrollBottom = scrollTop + container.clientHeight;
        if (itemTop < scrollTop || itemBottom > scrollBottom) {
          activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  };

  const loadEntry = async (entryId) => {
    const response = await fetch(`/api/entry/${entryId}`);
    if (!response.ok) {
      setStatus('Failed to load page');
      return;
    }
    const data = await response.json();
    titleInput.innerHTML = data.title || '';
    contentInput.innerHTML = data.content || '';
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
    currentImages = data.images || [];
    // Backward compatibility
    if (data.image_url && data.image_attached && currentImages.length === 0) {
      let oldStyle = { x: 0, y: 0, width: null, height: null };
      if (data.image_style) {
        try {
          const parsed = JSON.parse(data.image_style);
          oldStyle = { x: parsed.x || 0, y: parsed.y || 0, width: parsed.width || null, height: parsed.height || null };
        } catch(e) {}
      }
      currentImages.push({ url: data.image_url, ...oldStyle });
    }
    
    generatedImageUrl = null;
    shareCode = data.share_code || null;
    shareCanEditValue = data.can_edit || false;
    
    // Keep entries list in sync
    const entryIdx = entries.findIndex(e => e.id === currentEntryId);
    if (entryIdx >= 0) entries[entryIdx].share_code = shareCode;
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
    
    // Highlight code blocks on load
    if (typeof Prism !== 'undefined') {
      setTimeout(() => { Prism.highlightAllUnder(contentInput); }, 50);
    }
    
    setStatus('Ready');
    updatePageCount();
    updateDeleteButton();
    updateNavButtons();
    resizeContentInput();
  };


  const navigateToIndex = (index) => {
    if (index < 0 || index >= entries.length) return;
    const activeIndex = getActiveIndex();
    const direction = activeIndex >= 0 && index < activeIndex ? 'prev' : 'next';
    animateTurn(direction, async () => {
      currentIndex = index;
      lastActiveIndex = index;
      renderEntries({ scroll: true });
      await loadEntry(entries[index].id);
    });
  };

  const saveIfDirty = async () => {
    if (dirty) await saveEntry();
  };

  const createBlank = () => {
    currentEntryId = null;
    currentIndex = -1;
    titleInput.innerHTML = '';
    contentInput.innerHTML = '';
    Object.assign(titleStyleState, defaultTitleStyle);
    Object.assign(contentStyleState, defaultContentStyle);
    applyEditorStyle();
    if (imagePrompt) imagePrompt.value = '';
    imageError = null;
    currentImages = [];
    generatedImageUrl = null;
    shareCode = null;
    shareCanEditValue = false;
    renderImagePreview();
    updateImageActions();
    updateShareUI();
    updatePageIllustration();
    dirty = false;
    _lastSavedHash = _computeContentHash();
    setStatus('New page');
    renderEntries({ scroll: true });
    updatePageCount();
    updateDeleteButton();
    resizeContentInput();
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
        const contentText = contentInput.innerHTML || '';
        const hasTitle = Boolean(titleInput.innerText.trim());
        const hasContent = Boolean(contentInput.innerText.trim());
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
          title: sanitizeHTML(titleInput.innerHTML),
          content: sanitizeHTML(contentInput.innerHTML),
          title_style: JSON.stringify(titleStyleState),
          content_style: JSON.stringify(contentStyleState),
        };

        payload.image_prompt = imagePrompt ? imagePrompt.value : null;
        payload.images = currentImages;
        // Legacy fields for older viewers (first image only)
        if (currentImages.length > 0) {
          payload.image_url = currentImages[0].url;
          payload.image_attached = true;
          payload.image_style = JSON.stringify({
              x: currentImages[0].x, y: currentImages[0].y, 
              width: currentImages[0].width, height: currentImages[0].height
          });
        } else {
          payload.image_url = null;
          payload.image_attached = false;
        }

        const response = await fetch('/api/entry/save', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'X-CSRFToken': document.querySelector('meta[name="csrf-token"]')?.content || window.csrfToken || ''
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
          requestAnimationFrame(() => {
            const pageScroll = document.querySelector('.page-scroll');
            if (pageScroll && window.innerWidth > 900) pageScroll.scrollTop = 0;
          });
          setTimeout(() => { 
            saveStatus.style.color = ''; 
            saveStatus.style.transform = ''; 
          }, 1500);
        }
        setTime(data.updated_at, statusLabel);

        // Update local entries list
        const existingIndex = entries.findIndex((entry) => entry.id === currentEntryId);
        if (existingIndex >= 0) {
          const titleChanged = entries[existingIndex].title !== data.title;
          entries[existingIndex].title = data.title;
          entries[existingIndex].updated_at = data.updated_at;
          currentIndex = existingIndex;
          lastActiveIndex = existingIndex;
          if (titleChanged) renderEntries({ scroll: false }); // Only re-render if title changed, but don't jump scroll during save
        } else {
          entries.push({ id: currentEntryId, title: data.title, updated_at: data.updated_at });
          currentIndex = entries.length - 1;
          lastActiveIndex = currentIndex;
          renderEntries({ scroll: true });
        }
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
      currentIndex = 0;
      renderEntries({ scroll: true });
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
      renderEntries({ scroll: false });
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
        const resp = await fetch(`/api/entry/${targetId}`, { method: 'DELETE', headers: { 'X-CSRFToken': window.csrfToken } });
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
        renderEntries({ scroll: true });
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
    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (contentInput) contentInput.focus();
      }
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
    formatBoldBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      document.execCommand('bold', false, null);
      markDirty();
      refreshToolbarState();
    });
  }

  if (formatItalicBtn) {
    formatItalicBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      document.execCommand('italic', false, null);
      markDirty();
      refreshToolbarState();
    });
  }

  if (formatUnderlineBtn) {
    formatUnderlineBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      document.execCommand('underline', false, null);
      markDirty();
      refreshToolbarState();
    });
  }


  if (fontSizeSelect) {
    fontSizeSelect.addEventListener('change', () => {
      const val = parseFloat(fontSizeSelect.value);
      // Map rem to 1-7 for execCommand
      let size = "3"; // default
      if (val <= 0.9) size = "1";
      else if (val <= 1.1) size = "3";
      else if (val <= 1.3) size = "4";
      else if (val <= 1.5) size = "5";
      else if (val <= 1.8) size = "6";
      else size = "7";
      
      document.execCommand('fontSize', false, size);
      markDirty();
    });
  }

  const insertAtCursor = (element, text) => {
    document.execCommand('insertText', false, text);
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
    contentInput.addEventListener('paste', async (event) => {
      event.preventDefault();
      const clipboard = event.clipboardData || window.clipboardData;
      if (!clipboard) return;

      const html = clipboard.getData('text/html');
      let text = clipboard.getData('text/plain') || '';

      // Optimization for large pastes
      if (text.length > 50000) {
        setStatus('Processing large paste...');
      }

      // Clean extension artifacts immediately
      text = text.replace(/";$/, '"').replace(/";\n/, '"\n');

      let contentToInsert = '';

      // 1. Explicit Code Detection: Only create a formal code block if wrapped in triple backticks
      const looksLikeCode = text.trim().startsWith('```');

      if (looksLikeCode) {
        const langMatch = text.trim().match(/^```(\w*)\n?/);
        const lang = langMatch ? langMatch[1] : 'plaintext';
        const codeBody = text.trim().replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
        const escapedBody = codeBody
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        contentToInsert = `<pre><code class="language-${lang}">${escapedBody}</code></pre><br>`;
      } else if (html) {
        let cleanHtml = (typeof sanitizeHTML !== 'undefined') ? sanitizeHTML(html) : html;
        // Remove source-code newlines around block tags to prevent pre-wrap from rendering them as huge gaps
        cleanHtml = cleanHtml.replace(/<\/(p|div|h[1-6]|ul|ol|li|blockquote)>\s+/gi, '</$1>');
        cleanHtml = cleanHtml.replace(/\s+<(p|div|h[1-6]|ul|ol|li|blockquote)>/gi, '<$1>');
        // Also remove consecutive <br> tags if they are excessive
        cleanHtml = cleanHtml.replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>');
        contentToInsert = cleanHtml;
      } else if (text) {
        // Normalize Windows/Mac newlines to prevent \r from creating double-spaces in pre-wrap
        let normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        // Compress 3 or more newlines into just 2 (1 empty line) to prevent massive vertical gaps
        normalizedText = normalizedText.replace(/\n{3,}/g, '\n\n');
        
        const escaped = normalizedText
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        contentToInsert = (typeof linkify !== 'undefined' ? linkify(escaped) : escaped).replace(/\n/g, '<br>');
      }

      if (contentToInsert) {
        // Ensure editor has focus before attempting to insert
        contentInput.focus();

        // Strategy 1: Native execCommand (best for history/cursor)
        let success = document.execCommand('insertHTML', false, contentToInsert);

        if (!success) {
          // Strategy 2: Range-based manual insertion
          try {
            const selection = window.getSelection();
            if (selection.rangeCount) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
              const fragment = range.createContextualFragment(contentToInsert);
              range.insertNode(fragment);
              selection.collapseToEnd();
              success = true;
            }
          } catch (e) {}
        }

        if (!success) {
          // Strategy 3: Direct fallback (last resort)
          contentInput.innerHTML += contentToInsert;
        }

        markDirty();
        if (typeof Prism !== 'undefined') {
          Prism.highlightAllUnder(contentInput);
        }
      }
    });

    // Markdown Shortcut Handler: Detect triple backticks and Auto-links
    contentInput.addEventListener('keyup', (e) => {
      if (e.key === '`') {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        const node = range.startContainer;
        const text = node.textContent;
        const offset = range.startOffset;

        // Check for triple backticks
        if (offset >= 3 && text.slice(offset - 3, offset) === '```') {
          // Detect language if provided after backticks
          const lineStart = text.lastIndexOf('\n', offset - 4) + 1;
          const lineText = text.slice(lineStart, offset);
          const langMatch = lineText.match(/^```(\w*)$/);
          
          if (langMatch) {
            const lang = langMatch[1] || 'plaintext';
            e.preventDefault();
            
            // Delete the backticks
            const newText = text.slice(0, offset - lineText.length) + text.slice(offset);
            node.textContent = newText;
            
            if (data.share_url) {
                const linkHtml = `<p><a href="${data.share_url}" target="_blank" class="shared-file-link" style="color: var(--theme-accent); text-decoration: none; font-weight: 600; border-bottom: 1px dashed var(--theme-accent-soft); padding-bottom: 2px;">📎 Shared File: ${data.share_code}</a></p><p><br></p>`;
                
                if (window.diaryContent) {
                    // Append the link at the end of current content
                    window.diaryContent.insertAdjacentHTML('beforeend', linkHtml);
                    
                    // Smoothly scroll to the new link
                    const links = window.diaryContent.querySelectorAll('.shared-file-link');
                    if (links.length > 0) {
                        links[links.length - 1].scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }

                    if (typeof window.syncToInput === 'function') window.syncToInput();
                }
            }

            // Create code block
            const pre = document.createElement('pre');
            const code = document.createElement('code');
            code.className = `language-${lang}`;
            code.innerHTML = '<br>'; // Placeholder for cursor
            pre.appendChild(code);
            
            // Insert after current line
            let targetNode = node;
            while (targetNode.parentNode && targetNode.parentNode !== contentInput) {
              targetNode = targetNode.parentNode;
            }
            
            if (targetNode.nextSibling) {
              contentInput.insertBefore(pre, targetNode.nextSibling);
            } else {
              contentInput.appendChild(pre);
            }
            
            // Focus inside code block
            const newRange = document.createRange();
            newRange.setStart(code, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            markDirty();
          }
        }
      } else if (e.key === ' ' || e.key === 'Enter') {
        // Simple auto-link on space or enter
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        const node = range.startContainer;
        if (node.nodeType !== Node.TEXT_NODE) return;

        // GUARD: Never auto-link inside code blocks or existing links
        let ancestor = node.parentNode;
        while (ancestor && ancestor !== contentInput) {
          const tag = ancestor.tagName;
          if (tag === 'A' || tag === 'CODE' || tag === 'PRE') return;
          ancestor = ancestor.parentNode;
        }
        
        const text = node.textContent;
        const offset = range.startOffset;
        const lastWord = text.slice(0, offset).trim().split(/\s+/).pop();
        
        if (lastWord && (lastWord.startsWith('http://') || lastWord.startsWith('https://'))) {
          // Check if already in a link
          let parent = node.parentNode;
          let isInLink = false;
          while (parent && parent !== contentInput) {
            if (parent.tagName === 'A') { isInLink = true; break; }
            parent = parent.parentNode;
          }
          
          if (!isInLink) {
            const startIdx = text.lastIndexOf(lastWord, offset - lastWord.length);
            if (startIdx >= 0) {
              const before = text.slice(0, startIdx);
              const after = text.slice(offset);
              
              // We need to be careful with innerHTML here
              // Better to use range/fragment to avoid cursor jumps
              const link = document.createElement('a');
              link.href = lastWord;
              link.target = '_blank';
              link.rel = 'noopener noreferrer';
              link.textContent = lastWord;
              
              const rangeToReplace = document.createRange();
              rangeToReplace.setStart(node, startIdx);
              rangeToReplace.setEnd(node, offset);
              rangeToReplace.deleteContents();
              rangeToReplace.insertNode(link);
              
              // Move cursor after the space
              selection.collapseToEnd();
              markDirty();
            }
          }
        }
      }
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
          showLoginPromptModal({
            title: "Unlock AI Illustrations",
            message: "Sign in to generate beautiful AI-powered illustrations for your stories and notes. It's completely free!",
            iconType: "art"
          });
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
        generatedImageUrl = data.image_url;
        renderImagePreview();
        updateImageActions();
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
        
        generatedImageUrl = data.url;
        renderImagePreview();
        updateImageActions();
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
      if (!generatedImageUrl) return;
      imageModalImg.src = generatedImageUrl;
      imageModal.classList.add('open');
      imageModal.setAttribute('aria-hidden', 'false');
    });
  }

  if (imageModal && imageModalClose) {
    const closeModal = () => {
      imageModal.classList.remove('open');
      imageModal.setAttribute('aria-hidden', 'true');
      imageModalImg.src = '';
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
      if (!generatedImageUrl) return;
      try {
        const pngBlob = await toPngBlob(generatedImageUrl);
        if (!pngBlob) throw new Error('PNG failed');
        downloadBlob(pngBlob, 'story-illustration.png');
      } catch (err) {
        window.open(generatedImageUrl, '_blank', 'noopener');
      }
    });
  }

  if (imageAttachBtn) {
    imageAttachBtn.addEventListener('click', () => {
      if (!generatedImageUrl) return;
      
      // Mobile check as requested
      if (window.innerWidth <= 900) {
        alert("Please view in desktop to see the image and to insert in page for better experience.");
        setStatus("Switch to desktop to insert images");
        return;
      }
      
      currentImages.push({
        url: generatedImageUrl,
        x: 0,
        y: 0,
        width: 250,
        height: null
      });
      generatedImageUrl = null;
      renderImagePreview();
      updateImageActions();
      updatePageIllustration();
      markDirty();
    });
  }

  function setupIllustrationInteractions(el, index) {
    let isDragging = false;
    let isResizing = false;
    let startX, startY, startW, startH, startTX, startTY, startScrollY;
    let touchTimer = null;
    let isTouchActive = false;

    const handleMove = (e) => {
      if (e.touches && !isDragging && isTouchActive) {
        const dx = Math.abs(e.touches[0].clientX - startX);
        const dy = Math.abs(e.touches[0].clientY - startY);
        if (dx > 20 || dy > 20) {
          isTouchActive = false;
          clearTimeout(touchTimer);
          window.removeEventListener('touchmove', handleMove);
          window.removeEventListener('touchend', handleEnd);
        }
      }
      if (!isDragging && !isResizing) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const imgState = currentImages[index];
      if (!imgState) return;

      if (isDragging) {
        const scrollEl = el.closest('.page-scroll') || document.documentElement;
        const scrollDy = scrollEl.scrollTop - (startScrollY || 0);
        
        const dx = clientX - startX;
        const dy = (clientY - startY) + scrollDy;
        imgState.x = startTX + dx;
        imgState.y = startTY + dy;
        applyImageStyle(el, imgState);
        markDirty();
      } else if (isResizing) {
        const scrollEl = el.closest('.page-scroll') || document.documentElement;
        const scrollDy = scrollEl.scrollTop - (startScrollY || 0);
        
        const dx = clientX - startX;
        const dy = (clientY - startY) + scrollDy;
        imgState.width = Math.max(50, startW + dx);
        imgState.height = Math.max(50, startH + dy);
        applyImageStyle(el, imgState);
        markDirty();
      }
      if (e.cancelable && (isDragging || isResizing)) e.preventDefault();
    };

    const handleEnd = () => {
      isTouchActive = false;
      if (touchTimer) clearTimeout(touchTimer);
      if (isDragging || isResizing) {
        isDragging = false;
        isResizing = false;
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        el.style.cursor = 'grab';
        el.classList.remove('is-dragging');
      }
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchend', handleEnd);
    };

    el.addEventListener('mousedown', (e) => {
      if (window.innerWidth <= 900) return; // Disable interactions on mobile
      if (e.target.classList.contains('resize-handle') || e.target.classList.contains('delete-ill-btn')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startTX = currentImages[index].x || 0;
      startTY = currentImages[index].y || 0;
      const scrollEl = el.closest('.page-scroll') || document.documentElement;
      startScrollY = scrollEl.scrollTop;
      el.style.cursor = 'grabbing';
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      e.preventDefault();
    });

    el.addEventListener('touchstart', (e) => {
      if (window.innerWidth <= 900) return; // Disable interactions on mobile
      if (e.target.classList.contains('resize-handle') || e.target.classList.contains('delete-ill-btn')) return;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTX = currentImages[index].x || 0;
      startTY = currentImages[index].y || 0;
      isTouchActive = true;
      
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);

      if (touchTimer) clearTimeout(touchTimer);
      touchTimer = setTimeout(() => {
        if (isTouchActive) {
          isDragging = true;
          el.classList.add('is-dragging');
        }
      }, 150);
    }, { passive: false });

    const resizeH = el.querySelector('.resize-handle');
    if (resizeH) {
      const startResize = (clientX, clientY) => {
        if (window.innerWidth <= 900) return; // Disable on mobile
        isResizing = true;
        startX = clientX;
        startY = clientY;
        startW = el.offsetWidth;
        startH = el.offsetHeight;
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchend', handleEnd);
      };
      resizeH.addEventListener('mousedown', (e) => {
        startResize(e.clientX, e.clientY);
        e.preventDefault(); e.stopPropagation();
      });
      resizeH.addEventListener('touchstart', (e) => {
        startResize(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault(); e.stopPropagation();
      }, { passive: false });
    }
  }


  const saveShareCode = async ({ useRandom = false } = {}) => {
    console.log('saveShareCode triggered', { useRandom });
    if (!getActiveEntryId()) {
      await saveEntry({ allowEmpty: true });
    }
    const targetId = getActiveEntryId();
    if (!targetId) {
      setStatus('Save page first');
      return;
    }

    // Check if another story is already shared
    const otherShared = entries.find(e => e.share_code && e.id !== targetId);
    if (!shareCode && otherShared) {
      const confirmMsg = `This will disable your previous share link for "${otherShared.title || 'Untitled'}". Continue?`;
      if (!window.confirm(confirmMsg)) return;
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
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.csrfToken },
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

      // Update local entries list state (only one active code per user)
      entries.forEach(e => {
        if (e.id === targetId) e.share_code = shareCode;
        else e.share_code = null;
      });
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
    bindTap(shareRandomBtn, () => {
      saveShareCode({ useRandom: true });
    });
  }

  if (shareGenerateBtn) {
    bindTap(shareGenerateBtn, () => {
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
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.csrfToken },
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
          headers: { 'X-CSRFToken': window.csrfToken },
        });
        if (!response.ok) throw new Error('Remove failed');
        shareCode = null;
        shareCanEditValue = false;
        
        // Update local entries list
        const entryIdx = entries.findIndex(e => e.id === targetId);
        if (entryIdx >= 0) entries[entryIdx].share_code = null;
        
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

  // Replaced by setupIllustrationInteractions

  applyEditorStyle();
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

  // Highlight toolbar buttons (Bold, Italic, Underline) when cursor is on styled text
  document.addEventListener('selectionchange', () => {
    if (document.activeElement === titleInput || document.activeElement === contentInput) {
      syncActiveTargetFromFocus();
      refreshToolbarState();
    }
  });

  // Handle clicks on Shared File links inside the editor (since it's contenteditable)
  if (contentInput) {
    contentInput.addEventListener('click', (e) => {
      const link = e.target.closest('.shared-file-link');
      if (link && link.href) {
        e.preventDefault();
        window.open(link.href, '_blank');
      }
    });
  }

  /* ─── Quick Share Logic ─── */
  const initQuickShare = () => {
    const qsBtn = document.getElementById('quickShareBtn');
    const modal = document.getElementById('quickShareModal');
    const closeBtn = document.getElementById('qsClose');
    const dropZone = document.getElementById('qsDropZone');
    const fileInput = document.getElementById('qsFileInput');
    const browseBtn = document.getElementById('qsBrowseBtn');
    
    const progressArea = document.getElementById('qsProgressArea');
    const progressBar = document.getElementById('qsProgressBar');
    const fileNameDisplay = document.getElementById('qsFileName');
    const statusDisplay = document.getElementById('qsStatus');
    
    const resultArea = document.getElementById('qsResultArea');
    const shareLinkInput = document.getElementById('qsShareLink');
    const copyBtn = document.getElementById('qsCopyBtn');

    if (!qsBtn || !modal) return;

    const showModal = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      modal.style.display = 'flex';
      resetModal();
    };

    const hideModal = () => {
      modal.style.display = 'none';
    };

    const resetModal = () => {
      dropZone.style.display = 'block';
      progressArea.style.display = 'none';
      resultArea.style.display = 'none';
      progressBar.style.width = '0%';
      statusDisplay.textContent = 'Uploading...';
      statusDisplay.style.color = '';
    };

    bindTap(qsBtn, showModal);
    bindTap(closeBtn, hideModal);
    bindTap(browseBtn, () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) handleUpload(e.target.files[0]);
    });

    // Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
      dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    dropZone.addEventListener('dragover', () => dropZone.classList.add('dragover'));
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files[0]);
    });

    let currentShareId = null;
    let currentDeleteToken = null;

    const handleUpload = (file) => {
      dropZone.style.display = 'none';
      progressArea.style.display = 'block';
      fileNameDisplay.textContent = file.name;

      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/quick-upload', true);
      xhr.setRequestHeader('X-CSRFToken', window.csrfToken);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          progressBar.style.width = percent + '%';
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const res = JSON.parse(xhr.responseText);
          currentShareId = res.id;
          currentDeleteToken = res.delete_token;
          showResult(res.url, file.name);
        } else {
          statusDisplay.textContent = 'Upload failed. Try again.';
          statusDisplay.style.color = '#ff6b6b';
          setTimeout(resetModal, 2000);
        }
      };

      xhr.onerror = () => {
        statusDisplay.textContent = 'Network error.';
        statusDisplay.style.color = '#ff6b6b';
        setTimeout(resetModal, 2000);
      };

      xhr.send(formData);
    };

    const showResult = (url, fileName) => {
      progressArea.style.display = 'none';
      resultArea.style.display = 'block';
      shareLinkInput.value = url;

      // Copy to clipboard
      navigator.clipboard.writeText(url).then(() => {
        const originalText = statusDisplay.textContent;
        statusDisplay.textContent = 'Link copied to clipboard';
        setTimeout(() => { statusDisplay.textContent = originalText; }, 2000);
      });

      // Insert into editor as a styled block
      if (contentInput) {
        contentInput.focus();
        // Move cursor to the end
        const safeName = fileName ? fileName.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'View Download';
        const linkHtml = `<div class="shared-file-wrapper" contenteditable="false"><a href="${url}" target="_blank" class="shared-file-link">📎 ${safeName}</a><span class="remove-file-btn" title="Remove link from page">&times;</span></div>`;
        
        let attachmentsArea = contentInput.querySelector('.attachments-area');
        if (!attachmentsArea) {
          attachmentsArea = document.createElement('div');
          attachmentsArea.className = 'attachments-area';
          attachmentsArea.contentEditable = "false";
          contentInput.appendChild(document.createElement('br'));
          contentInput.appendChild(attachmentsArea);
        }
        
        // Append the new file
        attachmentsArea.insertAdjacentHTML('beforeend', linkHtml);
        if (typeof scheduleAutosave === 'function') scheduleAutosave();
      }
    };

    if (copyBtn) {
      bindTap(copyBtn, () => {
        const url = shareLinkInput.value;
        if (!url) return;
        navigator.clipboard.writeText(url).then(() => {
          const originalText = copyBtn.textContent;
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = originalText; }, 2000);
        });
      });
    }

    const doneBtn = document.getElementById('qsDoneBtn');
    if (doneBtn) {
      bindTap(doneBtn, hideModal);
    }

    const deleteLink = document.getElementById('qsDeleteLink');
    if (deleteLink) {
      bindTap(deleteLink, (e) => {
        e.preventDefault();
        if (!currentShareId || !currentDeleteToken) return;
        
        if (confirm('Are you sure you want to delete this file immediately? It will be gone forever.')) {
          fetch('/api/quick-delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': window.csrfToken
            },
            body: JSON.stringify({
              id: currentShareId,
              token: currentDeleteToken
            })
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              alert('File deleted successfully.');
              hideModal();
            } else {
              alert('Deletion failed: ' + (data.error || 'Unknown error'));
            }
          });
        }
      });
    }
  };

  initQuickShare();
}

// Global handler for removing shared files from the editor
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('remove-file-btn')) {
    e.preventDefault();
    e.stopPropagation();
    const wrapper = e.target.closest('.shared-file-wrapper');
    if (wrapper) {
      if (!confirm('Are you sure you want to remove this file link from the page?')) {
        return;
      }
      wrapper.remove();
      if (typeof scheduleAutosave === 'function') scheduleAutosave();
      // Trigger input event to mark dirty in view_story.html
      const contentEl = document.getElementById('publicContent') || document.getElementById('contentInput');
      if (contentEl) {
         contentEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }
});

// Intercept Ctrl+A to protect the attachments area
['entryContent', 'contentInput', 'publicContent'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('keydown', (e) => {
      // 1. Intercept Ctrl+A
      if (e.ctrlKey && (e.key === 'a' || e.key === 'A')) {
        const attachments = el.querySelector('.attachments-area');
        if (attachments) {
          e.preventDefault();
          const range = document.createRange();
          range.setStart(el, 0);
          range.setEndBefore(attachments);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
      
      // 2. Intercept Backspace/Delete if the attachments are highlighted
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const attachments = el.querySelector('.attachments-area');
        if (attachments) {
           const sel = window.getSelection();
           if (!sel.isCollapsed && sel.containsNode(attachments, true)) {
              e.preventDefault();
              alert("Attachments are protected. Please delete your text separately, or use the red × button to remove a file.");
           }
        }
      }
    });
  }
});
