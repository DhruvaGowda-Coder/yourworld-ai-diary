(function() {
  const ambientAudio = document.getElementById('ambientAudioPlayer');
  const toggleBtn = document.getElementById('audioToggleBtn');
  if (!ambientAudio || !toggleBtn) return;
  
  let isPlaying = localStorage.getItem('yw_sound_enabled') !== 'false';
  const savedTime = parseFloat(localStorage.getItem('yw_sound_time') || '0');
  
  const themeAudioExtensions = {
    earth: 'mp3',
    garden: 'mp3',
    storm: 'mp3',
    wind: 'mp3'
  };

  const themeVolumes = {
    cherry: 1.0,
    campfire: 0.7,
    water: 0.7,
    wind: 0.7,
    earth: 0.7,
    ice: 0.7,
    storm: 0.7,
    space: 0.7,
    garden: 0.7
  };

  const getAudioSrc = (theme) => {
    if (window.UserAudio && window.UserAudio[theme]) {
      return window.UserAudio[theme];
    }
    const ext = themeAudioExtensions[theme] || 'wav';
    return `/static/audio/${theme}.${ext}`;
  };

  let playPromise = null;
  let lastRequestTime = 0;

  const loadAndPlay = async () => {
    const requestTime = Date.now();
    lastRequestTime = requestTime;

    const theme = typeof activeTheme !== 'undefined' ? activeTheme : (document.body.dataset.theme || 'campfire');
    const src = getAudioSrc(theme);
    if (!src) return;

    const targetUrl = new URL(src, window.location.origin).href;
    
    // 1. Stop and reset if source changed
    if (ambientAudio.src !== targetUrl) {
      ambientAudio.pause();
      console.log('Audio: Switching source to:', src);
      ambientAudio.src = src;
      ambientAudio.volume = themeVolumes[theme] || 0.7;
      ambientAudio.load();
      // Always start from 0 for new sources
      ambientAudio.currentTime = 0;
      localStorage.setItem('yw_sound_time', '0');
    } else {
      // Only apply savedTime if the source has NOT changed (e.g. resuming same theme)
      if (ambientAudio.currentTime === 0 && savedTime > 0) {
        ambientAudio.currentTime = savedTime;
      }
    }

    if (isPlaying) {
      try {
        // 2. Wait for any pending play operation to settle
        if (playPromise) await playPromise;
        
        // 3. Concurrency check: If a newer request was made while we were waiting, abort this one
        if (lastRequestTime !== requestTime) return;

        if (ambientAudio.paused) {
          playPromise = ambientAudio.play();
          await playPromise;
          playPromise = null;
          
          toggleBtn.textContent = '🔊 Sound';
          toggleBtn.classList.add('is-active');
          console.log('Audio: Now playing', theme);
        }
      } catch (err) {
        playPromise = null;
        if (err.name !== 'AbortError') {
          console.warn('Audio: Playback error:', err.name);
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
