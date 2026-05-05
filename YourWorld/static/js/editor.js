const workspace = document.querySelector('.workspace');
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
  const shareCopyBtn = document.getElementById('shareCopyBtn');
  const shareGenerateBtn = document.getElementById('shareGenerateBtn');
  const shareRemoveBtn = document.getElementById('shareRemoveBtn');

  // Helper to reliably bind click/tap events on both desktop and mobile
  const bindTap = (btn, handler) => {
    if (!btn) return;
    let isTouching = false;
    btn.addEventListener('touchstart', () => { isTouching = true; }, { passive: true });
    btn.addEventListener('touchcancel', () => { isTouching = false; }, { passive: true });
    btn.addEventListener('touchend', (e) => {
      if (isTouching) {
        if (e.cancelable) { e.preventDefault(); } // Prevent ghost clicks only if cancelable
        handler(e);
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
    if (shareModeBtn) shareModeBtn.textContent = label;
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
      try {
        const response = await fetch(`/api/entry/${targetId}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
          body: JSON.stringify({ rotate: false, mode: modeValue }),
        });
        if (!response.ok) throw new Error('Share update failed');
        const data = await response.json();
        if (data.share_code) shareCode = data.share_code;
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

  const setTime = (iso, prefix = 'Saved') => {
    if (!saveTime || !iso) return;
    const date = new Date(iso);
    saveTime.textContent = `${prefix} ${date.toLocaleTimeString()}`;
  };

  /** Compute a simple hash of current editor content to detect real changes. */
  const _computeContentHash = () => {
    const t = (titleInput ? titleInput.value : '') + '||' + (contentInput ? contentInput.value : '');
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
    }, 2500);
  };

  const markDirty = () => {
    dirty = true;
    setStatus('Editing...');
    scheduleAutosave();
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
    if (!shareCodeInput) return;
    shareCodeInput.value = shareCode || '';
    if (shareCopyBtn) shareCopyBtn.disabled = !shareCode;
    if (shareRemoveBtn) shareRemoveBtn.disabled = !shareCode;
    const shareCanEdit = document.getElementById('shareCanEdit');
    if (shareCanEdit) shareCanEdit.checked = shareCanEditValue;
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
      try {
        const contentText = contentInput.value || '';
        const hasTitle = Boolean(titleInput.value.trim());
        const hasContent = Boolean(contentText.trim());
        const allowEmpty = options.allowEmpty === true;
        if (!currentEntryId && !allowEmpty && !hasTitle && !hasContent) {
          dirty = false;
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
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Save failed');
        const data = await response.json();
        currentEntryId = data.id;
        dirty = false;
        _lastSavedHash = _computeContentHash();
        const statusLabel = options.auto ? 'Autosaved' : 'Saved';
        setStatus(statusLabel);
        if (saveStatus) {
          saveStatus.style.transition = 'color 0.3s, transform 0.3s';
          saveStatus.style.color = 'var(--theme-accent, #5cb85c)';
          saveStatus.style.transform = 'scale(1.05)';
          setTimeout(() => { saveStatus.style.color = ''; saveStatus.style.transform = ''; }, 1500);
        }
        setTime(data.updated_at, statusLabel);

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
        return currentEntryId;
      } catch (err) {
        setStatus('Offline');
        return null;
      } finally {
        isSaving = false;
        saveInFlight = null;
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
    contentInput.addEventListener('input', markDirty);
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
      const html = clipboard.getData('text/html');
      const plain = clipboard.getData('text/plain');
      if (!html && !plain) return;
      event.preventDefault();
      const text = html ? htmlToText(html) : plain;
      insertAtCursor(contentInput, text);
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


  if (shareGenerateBtn) {
    shareGenerateBtn.addEventListener('click', async () => {
      if (!getActiveEntryId()) {
        await saveEntry();
      }
      const targetId = getActiveEntryId();
      if (!targetId) {
        setStatus('Save page first');
        return;
      }
      const mode = shareModeSelect ? shareModeSelect.value : 'story';
      const shareCanEdit = document.getElementById('shareCanEdit');
      const canEdit = shareCanEdit ? shareCanEdit.checked : false;
      const customCode = shareCodeInput ? shareCodeInput.value.trim() : '';
      try {
        const response = await fetch(`/api/entry/${targetId}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
          body: JSON.stringify({ rotate: Boolean(shareCode && !customCode), mode, custom_code: customCode, can_edit: canEdit }),
        });
        if (!response.ok) throw new Error('Share failed');
        const data = await response.json();
        shareCode = data.share_code;
        shareCanEditValue = data.can_edit;
        if (data.share_type && shareModeSelect) {
          shareModeSelect.value = data.share_type;
        }
        updateShareUI();
      } catch (err) {
        setStatus('Share failed');
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
        updateShareUI();
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
}

