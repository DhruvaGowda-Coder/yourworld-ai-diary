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

    const targetUrl = new URL(src, window.location.origin).href;
    if (ambientAudio.src !== targetUrl) {
      console.log('Audio: Loading source:', src);
      ambientAudio.src = src;
      ambientAudio.load();
      if (savedTime > 0) ambientAudio.currentTime = savedTime;
    }

    if (isPlaying) {
      try {
        await ambientAudio.play();
        toggleBtn.textContent = '🔊 Sound';
        toggleBtn.classList.add('is-active');
        console.log('Audio: Playing success');
      } catch (err) {
        console.warn('Audio: Playback blocked/failed:', err.name, err.message);
        toggleBtn.textContent = '🔇 Sound';
      }
    } else {
      ambientAudio.pause();
      toggleBtn.textContent = '🔇 Sound';
      toggleBtn.classList.remove('is-active');
    }
  };

  const toggleAudio = async (e) => {
    if (e) e.preventDefault();
    isPlaying = !isPlaying;
    localStorage.setItem('yw_sound_enabled', isPlaying ? 'true' : 'false');
    
    // Hard re-sync before playing
    const theme = typeof activeTheme !== 'undefined' ? activeTheme : 'campfire';
    const src = getAudioSrc(theme);
    ambientAudio.src = src;
    ambientAudio.load();
    
    await loadAndPlay();
  };

  // Error listener for deeper debugging
  ambientAudio.addEventListener('error', (e) => {
    console.error('Audio: Source error detected:', ambientAudio.error);
    if (isPlaying) {
      toggleBtn.textContent = '⚠️ Error';
    }
  });

  toggleBtn.addEventListener('click', toggleAudio);

  window.addEventListener('load', () => {
    // Small delay to ensure UserAudio is fully ready
    setTimeout(loadAndPlay, 100);
  });

  const unlockAudio = () => {
    if (isPlaying && ambientAudio.paused) {
      loadAndPlay();
    }
    document.removeEventListener('touchstart', unlockAudio);
    document.removeEventListener('click', unlockAudio);
  };
  document.addEventListener('touchstart', unlockAudio, { passive: true });
  document.addEventListener('click', unlockAudio, { passive: true });

  setInterval(() => {
    if (isPlaying && !ambientAudio.paused) {
      localStorage.setItem('yw_sound_time', ambientAudio.currentTime);
    }
  }, 2000);

  window.addEventListener('yw:themechange', () => {
    if (isPlaying) loadAndPlay();
  });

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
