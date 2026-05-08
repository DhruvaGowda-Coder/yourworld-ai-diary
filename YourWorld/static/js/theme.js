(function() {
  const ambientAudio = document.getElementById('ambientAudioPlayer');
  const toggleBtn = document.getElementById('audioToggleBtn');
  if (!ambientAudio || !toggleBtn) return;
  
  let isPlaying = localStorage.getItem('yw_sound_enabled') === 'true';
  const savedTime = parseFloat(localStorage.getItem('yw_sound_time') || '0');
  
  const getAudioSrc = (theme) => {
    if (window.UserAudio && window.UserAudio[theme]) {
      return window.UserAudio[theme];
    }
    return `/static/audio/${theme}.wav`;
  };

  const loadAndPlay = async () => {
    const theme = typeof activeTheme !== 'undefined' ? activeTheme : (document.body.dataset.theme || 'campfire');
    const src = getAudioSrc(theme);
    if (!src) return;

    // Direct comparison of source
    const targetUrl = new URL(src, window.location.origin).href;
    if (ambientAudio.src !== targetUrl) {
      ambientAudio.src = src;
      ambientAudio.load();
      if (savedTime > 0) ambientAudio.currentTime = savedTime;
    }

    if (isPlaying) {
      try {
        await ambientAudio.play();
        toggleBtn.textContent = '🔊 Sound';
        toggleBtn.classList.add('active');
      } catch (err) {
        console.warn('Autoplay blocked.', err);
        toggleBtn.textContent = '🔇 Paused';
      }
    } else {
      ambientAudio.pause();
      toggleBtn.textContent = '🔇 Off';
      toggleBtn.classList.remove('active');
    }
  };

  const toggleAudio = async (e) => {
    if (e) e.preventDefault();
    isPlaying = !isPlaying;
    localStorage.setItem('yw_sound_enabled', isPlaying ? 'true' : 'false');
    
    if (isPlaying) {
      // Force a re-load on click to ensure it's fresh
      const theme = typeof activeTheme !== 'undefined' ? activeTheme : 'campfire';
      ambientAudio.src = getAudioSrc(theme);
      ambientAudio.load();
    }
    
    await loadAndPlay();
  };

  toggleBtn.addEventListener('click', toggleAudio);

  // Initialize on page load
  window.addEventListener('load', () => {
    loadAndPlay();
  });

  // Mobile/Tablet fix: Resume on first interaction
  const unlockAudio = () => {
    if (isPlaying && ambientAudio.paused) {
      loadAndPlay();
    }
    document.removeEventListener('touchstart', unlockAudio);
    document.removeEventListener('click', unlockAudio);
  };
  document.addEventListener('touchstart', unlockAudio, { passive: true });
  document.addEventListener('click', unlockAudio, { passive: true });

  // Save progress every 2 seconds
  setInterval(() => {
    if (isPlaying && !ambientAudio.paused) {
      localStorage.setItem('yw_sound_time', ambientAudio.currentTime);
    }
  }, 2000);

  // Theme change listener
  window.addEventListener('yw:themechange', () => {
    if (isPlaying) loadAndPlay();
  });

  // Library updates
  window.reloadThemeAudio = (theme, url) => {
    if (window.UserAudio) window.UserAudio[theme] = url;
    if (isPlaying && (typeof activeTheme !== 'undefined' ? activeTheme : 'campfire') === theme) {
      loadAndPlay();
    }
  };
  window.removeThemeAudio = (theme) => {
    if (window.UserAudio) window.UserAudio[theme] = "";
    if (isPlaying && (typeof activeTheme !== 'undefined' ? activeTheme : 'campfire') === theme) {
      loadAndPlay();
    }
  };
})();
