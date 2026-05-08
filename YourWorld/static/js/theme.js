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

  let playPromise = null;

  const loadAndPlay = async () => {
    const theme = typeof activeTheme !== 'undefined' ? activeTheme : (document.body.dataset.theme || 'campfire');
    const src = getAudioSrc(theme);
    if (!src) return;

    const targetUrl = new URL(src, window.location.origin).href;
    
    // 1. Explicitly stop and reset before loading a new source to prevent overlaps
    if (ambientAudio.src !== targetUrl) {
      ambientAudio.pause();
      console.log('Audio: Loading source:', src);
      ambientAudio.src = src;
      ambientAudio.load();
      if (savedTime > 0) ambientAudio.currentTime = savedTime;
    }

    if (isPlaying) {
      try {
        // 2. Prevent concurrent play() requests which can cause race conditions/overlapping
        if (playPromise) await playPromise;
        
        if (ambientAudio.paused) {
          playPromise = ambientAudio.play();
          await playPromise;
          playPromise = null;
          
          toggleBtn.textContent = '🔊 Sound';
          toggleBtn.classList.add('is-active');
          console.log('Audio: Playing', theme);
        }
      } catch (err) {
        playPromise = null;
        if (err.name !== 'AbortError') {
          console.warn('Audio: Playback blocked or failed:', err.name);
          toggleBtn.textContent = '🔇 Sound';
        }
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
    
    // Stop current immediately on toggle off
    if (!isPlaying) {
      ambientAudio.pause();
    }
    
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
    // Small delay to ensure state is ready
    setTimeout(loadAndPlay, 150);
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
    const current = typeof activeTheme !== 'undefined' ? activeTheme : 'campfire';
    if (isPlaying && current === theme) {
      loadAndPlay();
    }
  };
  window.removeThemeAudio = (theme) => {
    if (window.UserAudio) window.UserAudio[theme] = "";
    const current = typeof activeTheme !== 'undefined' ? activeTheme : 'campfire';
    if (isPlaying && current === theme) {
      loadAndPlay();
    }
  };
})();
