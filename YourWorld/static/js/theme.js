const themeForm = document.getElementById('themeForm');
if (themeForm) {
  const themeInputs = Array.from(themeForm.querySelectorAll('input[name="theme"]'));
  const themeTiles = Array.from(themeForm.querySelectorAll('.theme-tile[data-theme-preview]'));
  let audioCtx = null;
  const themeToneMap = {
    campfire: [220, 294, 247],
    water: [196, 262, 220],
    wind: [294, 370, 330],
    earth: [165, 220, 196],
    ice: [330, 392, 440],
    storm: [247, 330, 392],
    space: [220, 277, 349],
    garden: [196, 247, 294],
  };

  const playThemeTone = (theme) => {
    if (reducedMotion) return;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    if (!audioCtx) audioCtx = new AudioCtor();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    const notes = themeToneMap[theme] || themeToneMap.campfire;
    const now = audioCtx.currentTime;
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.045, now + (idx * 0.08) + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (idx * 0.08) + 0.21);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + (idx * 0.08));
      osc.stop(now + (idx * 0.08) + 0.24);
    });
  };

  const setThemePreview = (theme) => {
    if (!bodyEl) return;
    const resolved = THEME_META[theme] ? theme : 'campfire';
    bodyEl.dataset.themePreview = resolved;
  };

  const clearThemePreview = () => {
    if (!bodyEl) return;
    delete bodyEl.dataset.themePreview;
  };

  themeTiles.forEach((tile) => {
    const preview = tile.getAttribute('data-theme-preview');
    if (!preview) return;
    tile.addEventListener('click', (event) => {
      setThemePreview(preview);
    });
  });

  document.addEventListener('click', (event) => {
    if (!themeForm) return;
    if (!event.target) return;
    if (themeForm.contains(event.target)) return;
    clearThemePreview();
  });

  themeInputs.forEach((input) => {
    input.addEventListener('change', () => {
      const selectedTheme = input.value || 'campfire';
      setThemeState(selectedTheme);
      queueParticleRebuild(selectedTheme);
      playThemeTone(selectedTheme);
    });
  });

  const selected = themeInputs.find((input) => input.checked);
  if (selected) {
    setThemeState(selected.value);
    queueParticleRebuild(selected.value);
  }
}

const activityHeatmap = document.getElementById('activityHeatmap');
if (activityHeatmap) {
  const toIsoDate = (date) => date.toISOString().slice(0, 10);
  const formatLabel = (date) =>
    date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  const buildHeatmap = (counts, days) => {
    activityHeatmap.innerHTML = '';
    const today = new Date();
    const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const start = new Date(utcToday);
    start.setUTCDate(utcToday.getUTCDate() - (days - 1));

    const startDay = start.getUTCDay();
    const totalCells = startDay + days;
    const columns = Math.ceil(totalCells / 7);
    activityHeatmap.style.setProperty('--columns', columns);

    const addCell = (className, title) => {
      const cell = document.createElement('div');
      cell.className = `heatmap-cell ${className}`;
      if (title) cell.title = title;
      if (title) cell.setAttribute('aria-label', title);
      activityHeatmap.appendChild(cell);
    };

    for (let i = 0; i < startDay; i += 1) {
      addCell('empty');
    }

    for (let i = 0; i < days; i += 1) {
      const day = new Date(start);
      day.setUTCDate(start.getUTCDate() + i);
      const iso = toIsoDate(day);
      const count = counts[iso] || 0;
      let level = 0;
      if (count >= 7) level = 4;
      else if (count >= 4) level = 3;
      else if (count >= 2) level = 2;
      else if (count >= 1) level = 1;
      addCell(`level-${level}`, `${formatLabel(day)} - ${count} update${count === 1 ? '' : 's'}`);
    }
  };

  fetch('/api/activity?days=365')
    .then((response) => response.json())
    .then((data) => {
      buildHeatmap(data.counts || {}, data.days || 365);
      
      const pageCountEl = document.getElementById('profilePageCount');
      if (pageCountEl && data.total_pages !== undefined) {
        pageCountEl.textContent = data.total_pages;
      }
      
      const streakEl = document.getElementById('profileStreak');
      if (streakEl && data.streak !== undefined) {
        streakEl.textContent = data.streak;
      }
      
      const activeDaysEl = document.getElementById('profileDaysActive');
      if (activeDaysEl && data.active_days !== undefined) {
        activeDaysEl.textContent = data.active_days;
      }
    })
    .catch(() => {
      activityHeatmap.textContent = 'Activity data unavailable.';
    });
}

const handleResendButton = (btnId) => {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (btn.disabled) return;

    const originalText = btn.textContent;
    btn.textContent = 'Sending...';
    btn.style.opacity = '0.7';
    btn.style.cursor = 'wait';
    btn.disabled = true;

    try {
      let url;
      if (btn.hasAttribute('formaction')) {
        url = btn.getAttribute('formaction');
      } else if (btn.dataset.url) {
        url = btn.dataset.url;
      } else {
        const path = window.location.pathname.replace(/\/+$/, '');
        url = `${path}/resend`;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });

      const contentType = response.headers.get('content-type');
      const data = (contentType && contentType.includes('application/json'))
        ? await response.json().catch(() => ({}))
        : {};

      if (response.ok) {
        btn.textContent = '✓ Code Sent';
        btn.style.opacity = '1';
        btn.style.cursor = 'default';
        
        if (btn.animate) {
          btn.animate([
            { transform: 'scale(1)' },
            { transform: 'scale(1.05)' },
            { transform: 'scale(1)' }
          ], { duration: 300, easing: 'ease-out' });
        }

        setTimeout(() => {
          btn.style.transition = 'opacity 0.3s';
          btn.style.opacity = '0.5';
          setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = '';
            btn.style.transition = '';
          }, 300);
        }, 5000);
      } else {
        if (data.redirect) {
          window.location.href = data.redirect;
          return;
        }
        btn.textContent = data.error || 'Failed';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.disabled = false;
          btn.style.opacity = '1';
          btn.style.cursor = '';
        }, 3000);
      }
    } catch (err) {
      console.error(err);
      btn.textContent = 'Error';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = '';
      }, 3000);
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  handleResendButton('resendCodeBtn');
  handleResendButton('verifyResendBtn');
});

const forgotPasswordForm = document.querySelector('form[action*="forgot-password"]');
if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener('submit', () => {
    const btn = forgotPasswordForm.querySelector('button[type="submit"]');
    if (btn) {
      btn.textContent = 'Sending...';
      btn.disabled = true;
    }
  });
}

const publicPagesData = document.getElementById('publicPagesData');
if (publicPagesData) {
  let pages = [];
  try {
    pages = JSON.parse(publicPagesData.textContent || '[]');
  } catch {
    pages = [];
  }

  const titleEl = document.getElementById('publicTitle');
  const contentEl = document.getElementById('publicContent');
  const illustrationWrap = document.getElementById('publicIllustration');
  const illustrationImg = document.getElementById('publicIllustrationImg');
  const prevBtn = document.getElementById('publicPrevBtn');
  const nextBtn = document.getElementById('publicNextBtn');
  const countEl = document.getElementById('publicPageCount');
  const controls = document.getElementById('publicControls');
  const pageList = document.getElementById('publicPageList');

  let index = 0;

  const renderPageList = () => {
    if (!pageList) return;
    pageList.innerHTML = '';
    pages.forEach((page, idx) => {
      const item = document.createElement('div');
      const title = (page.title || '').trim();
      item.className = `public-page-item${idx === index ? ' is-active' : ''}`;
      item.textContent = title || `Page ${idx + 1}`;
      item.addEventListener('click', () => {
        index = idx;
        renderPage();
      });
      pageList.appendChild(item);
    });
  };

  const renderPage = () => {
    if (!pages.length) return;
    const page = pages[index] || {};
    const title = (page.title || '').trim();
    const content = page.content || '';
    if (titleEl) titleEl.textContent = title || `Page ${index + 1}`;
    if (contentEl) contentEl.textContent = content;
    if (illustrationWrap && illustrationImg) {
      if (page.image_attached && page.image_url) {
        illustrationImg.src = page.image_url;
        illustrationWrap.style.display = 'block';
        if (page.image_style) {
           try {
              const style = JSON.parse(page.image_style);
              illustrationWrap.style.width = style.width ? `${style.width}px` : '250px';
              illustrationWrap.style.height = style.height ? `${style.height}px` : 'auto';
              illustrationWrap.style.transform = `translate(${style.x || 0}px, ${style.y || 0}px)`;
           } catch(e) {}
        } else {
           illustrationWrap.style.width = '250px';
           illustrationWrap.style.height = 'auto';
           illustrationWrap.style.transform = 'translate(0px, 0px)';
        }
      } else {
        illustrationImg.removeAttribute('src');
        illustrationWrap.style.display = 'none';
      }
    }
    if (countEl) {
      countEl.textContent = pages.length > 1 ? `Page ${index + 1} of ${pages.length}` : '';
    }
    if (prevBtn) prevBtn.disabled = index <= 0;
    if (nextBtn) nextBtn.disabled = index >= pages.length - 1;
    renderPageList();
  };

  const publicSaveBtn = document.getElementById('publicSaveBtn');
  if (controls && pages.length <= 1 && !publicSaveBtn) {
    controls.classList.add('is-hidden');
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (index <= 0) return;
      index -= 1;
      renderPage();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (index >= pages.length - 1) return;
      index += 1;
      renderPage();
    });
  }

  if (publicSaveBtn) {
    publicSaveBtn.addEventListener('click', async () => {
      const page = pages[index];
      if (!page) return;
      const newTitle = titleEl ? titleEl.innerText : '';
      const newContent = contentEl ? contentEl.innerHTML : '';
      
      publicSaveBtn.textContent = 'Saving...';
      try {
        const metaCsrf = document.querySelector('meta[name="csrf-token"]');
        const token = metaCsrf ? metaCsrf.getAttribute('content') : '';
        const response = await fetch('/api/entry/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token },
          body: JSON.stringify({
            id: page.id,
            title: newTitle,
            content: newContent,
            type: 'story',
            image_url: page.image_url,
            image_attached: page.image_attached ? 1 : 0,
            image_style: page.image_style,
            image_prompt: page.image_prompt
          })
        });
        if (response.ok) {
          publicSaveBtn.textContent = 'Saved!';
          page.title = newTitle;
          page.content = newContent;
        } else {
          publicSaveBtn.textContent = 'Error';
        }
      } catch(e) {
        publicSaveBtn.textContent = 'Error';
      }
      setTimeout(() => { publicSaveBtn.textContent = 'Save Changes'; }, 2000);
    });
  }

  renderPage();
}

// Global pointer events for dragging pageIllustration inside the book layout
document.addEventListener('DOMContentLoaded', () => {
  const pageIllustration = document.getElementById('pageIllustration');
  const resizeHandle = document.getElementById('resizeHandle');
  if (pageIllustration && resizeHandle) {
    let isDragging = false;
    let isResizing = false;
    let startX = 0, startY = 0;
    let initialX = 0, initialY = 0;
    let initialWidth = 0, initialHeight = 0;

    pageIllustration.addEventListener('pointerdown', (e) => {
      if (e.target === resizeHandle || pageIllustration.style.display === 'none') return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const transform = pageIllustration.style.transform || '';
      const match = transform.match(/translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)/);
      if (match) {
        initialX = parseFloat(match[1]);
        initialY = parseFloat(match[2]);
      } else {
        initialX = 0;
        initialY = 0;
      }
      pageIllustration.setPointerCapture(e.pointerId);
    });

    resizeHandle.addEventListener('pointerdown', (e) => {
      isResizing = true;
      e.stopPropagation();
      startX = e.clientX;
      startY = e.clientY;
      const rect = pageIllustration.getBoundingClientRect();
      initialWidth = rect.width;
      initialHeight = rect.height;
      resizeHandle.setPointerCapture(e.pointerId);
    });

    const onPointerMove = (e) => {
      if (isDragging) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const pageEl = document.getElementById('page');
        const maxScrollW = pageEl ? Math.max(10, pageEl.clientWidth - 100) : 800;
        let newX = Math.max(-20, Math.min(initialX + dx, maxScrollW));
        let newY = Math.max(-60, initialY + dy);
        
        // This is a bit hacky to update the state from outside the main app scope,
        // but it will be persisted when saveEntry is triggered inside the main scope
        // since saveEntry reads imageStyleState. We need to dispatch a custom event
        // or ensure imageStyleState is global. Since it's trapped in DOMContentLoaded,
        // we'll dispatch an event to the document.
        pageIllustration.style.transform = `translate(${newX}px, ${newY}px)`;
        document.dispatchEvent(new CustomEvent('imageStyleUpdate', {
            detail: { x: newX, y: newY }
        }));
      } else if (isResizing) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let newW = Math.max(100, initialWidth + dx);
        let newH = Math.max(100, initialHeight + dy);
        pageIllustration.style.width = `${newW}px`;
        pageIllustration.style.height = `${newH}px`;
        document.dispatchEvent(new CustomEvent('imageStyleUpdate', {
            detail: { width: newW, height: newH }
        }));
      }
    };

    const onPointerUp = (e) => {
      if (isDragging) {
        isDragging = false;
        pageIllustration.releasePointerCapture(e.pointerId);
      }
      if (isResizing) {
        isResizing = false;
        resizeHandle.releasePointerCapture(e.pointerId);
      }
    };

    pageIllustration.addEventListener('pointermove', onPointerMove);
    pageIllustration.addEventListener('pointerup', onPointerUp);
    resizeHandle.addEventListener('pointermove', onPointerMove);
    resizeHandle.addEventListener('pointerup', onPointerUp);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  let path = window.location.pathname;
  if (path === '/') path = '/home';
  document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
    let href = link.getAttribute('href');
    if (href === path || link.dataset.page === path.substring(1) || (path === '/home' && link.dataset.page === 'home')) {
      link.classList.add('active');
    }
  });
});

// --- Ambient Audio Management (continuous across pages via localStorage) ---
document.addEventListener('DOMContentLoaded', () => {
  const audioPlayer = document.getElementById('ambientAudioPlayer');
  const toggleBtn = document.getElementById('audioToggleBtn');
  
  if (!audioPlayer || !toggleBtn) return;
  
  // Read persisted state from localStorage
  const savedEnabled = localStorage.getItem('yw_sound_enabled') === 'true';
  const savedTime = parseFloat(localStorage.getItem('yw_sound_time') || '0');
  let isPlaying = savedEnabled;
  
  toggleBtn.textContent = isPlaying ? '🔊 Sound' : '🔇 Sound';
  
  const getAudioSrc = (theme) => {
    if (window.UserAudio && window.UserAudio[theme]) {
      return window.UserAudio[theme];
    }
    return `/static/audio/${theme}.wav`;
  };

  const loadAndPlay = (theme, seekTo) => {
    const src = getAudioSrc(theme);
    
    // Explicitly stop and clear before switching to avoid layering or carry-over
    audioPlayer.pause();
    audioPlayer.src = "";
    audioPlayer.load();
    
    // Set new src
    audioPlayer.src = src;
    
    if (isPlaying) {
      const onCanPlay = () => {
        audioPlayer.removeEventListener('canplay', onCanPlay);
        if (seekTo > 0 && isFinite(audioPlayer.duration) && seekTo < audioPlayer.duration) {
          audioPlayer.currentTime = seekTo;
        }
        audioPlayer.play().catch(e => {
          console.warn('Autoplay prevented — click Sound to start', e);
          isPlaying = false;
          toggleBtn.textContent = '🔇 Sound';
          toggleBtn.classList.add('pulse-highlight'); // Visual hint
        });
      };
      audioPlayer.addEventListener('canplay', onCanPlay);
      audioPlayer.load();
    }
  };
  
  // Save position continuously so we never lose more than ~250ms
  setInterval(() => {
    if (isPlaying && audioPlayer && !audioPlayer.paused) {
      localStorage.setItem('yw_sound_time', String(audioPlayer.currentTime));
    }
  }, 250);
  
  // Also save right before leaving the page
  window.addEventListener('beforeunload', () => {
    if (isPlaying && audioPlayer) {
      localStorage.setItem('yw_sound_time', String(audioPlayer.currentTime));
    }
  });
  
  toggleBtn.addEventListener('click', () => {
    if (isPlaying) {
      audioPlayer.pause();
      isPlaying = false;
      localStorage.setItem('yw_sound_enabled', 'false');
      localStorage.setItem('yw_sound_time', '0');
      toggleBtn.textContent = '🔇 Sound';
    } else {
      // If no src is loaded yet, load the current theme
      if (!audioPlayer.src || audioPlayer.src === window.location.href) {
        const curTheme = typeof activeTheme !== 'undefined' ? activeTheme : 'campfire';
        audioPlayer.src = getAudioSrc(curTheme);
      }
      audioPlayer.play().then(() => {
        isPlaying = true;
        localStorage.setItem('yw_sound_enabled', 'true');
        toggleBtn.textContent = '🔊 Sound';
        toggleBtn.classList.remove('pulse-highlight');
      }).catch(err => {
        console.warn(err);
        toggleBtn.classList.add('pulse-highlight');
      });
    }
  });

  // Theme observer
  window.addEventListener('yw:themechange', (event) => {
    const nextTheme = event && event.detail ? event.detail.theme : (typeof activeTheme !== 'undefined' ? activeTheme : 'campfire');
    // Theme changed — restart from beginning
    localStorage.setItem('yw_sound_time', '0');
    loadAndPlay(nextTheme, 0);
  });

  // Expose a global function so the settings page can reload audio after uploading a custom song
  window.reloadThemeAudio = (theme, url) => {
    if (url && window.UserAudio) {
      window.UserAudio[theme] = url;
      // Also persist to localStorage for guest users
      try {
        const stored = JSON.parse(localStorage.getItem('yw_custom_audio') || '{}');
        stored[theme] = url;
        localStorage.setItem('yw_custom_audio', JSON.stringify(stored));
      } catch(e) {}
    }
    isPlaying = true;
    localStorage.setItem('yw_sound_enabled', 'true');
    toggleBtn.textContent = '🔊 Sound';
    loadAndPlay(theme, 0);
  };

  // Expose a function to remove custom audio for a theme
  window.removeThemeAudio = (theme) => {
    if (window.UserAudio) {
      window.UserAudio[theme] = '';
    }
    try {
      const stored = JSON.parse(localStorage.getItem('yw_custom_audio') || '{}');
      delete stored[theme];
      localStorage.setItem('yw_custom_audio', JSON.stringify(stored));
    } catch(e) {}
    const curTheme = typeof activeTheme !== 'undefined' ? activeTheme : 'campfire';
    if (theme === curTheme) {
      loadAndPlay(theme, 0);
    }
  };
  
  // Initialize — load track and seek to saved position
  loadAndPlay(typeof activeTheme !== 'undefined' ? activeTheme : 'campfire', savedTime);
});

