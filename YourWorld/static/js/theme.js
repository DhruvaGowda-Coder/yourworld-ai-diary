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
    const src = getAudioSrc(typeof activeTheme !== 'undefined' ? activeTheme : 'campfire');
    if (!src) return;

    if (ambientAudio.src !== new URL(src, window.location.origin).href) {
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
        console.warn('Autoplay blocked. Waiting for interaction.', err);
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
    await loadAndPlay();
  };

  toggleBtn.addEventListener('click', toggleAudio);

  // Initial attempt
  document.addEventListener('DOMContentLoaded', () => {
    loadAndPlay();
    // Mobile fix: start on first touch if enabled
    const mobileInit = () => {
      if (isPlaying && ambientAudio.paused) loadAndPlay();
      document.removeEventListener('touchstart', mobileInit);
    };
    document.addEventListener('touchstart', mobileInit);
  });

  // Save progress
  setInterval(() => {
    if (isPlaying && !ambientAudio.paused) {
      localStorage.setItem('yw_sound_time', ambientAudio.currentTime);
    }
  }, 1000);

  // Handle theme changes
  window.addEventListener('yw:themechange', (e) => {
    if (isPlaying) loadAndPlay();
  });

  // Global exports
  window.reloadThemeAudio = (theme, url) => {
    if (window.UserAudio) window.UserAudio[theme] = url;
    if (isPlaying && theme === activeTheme) loadAndPlay();
  };
  window.removeThemeAudio = (theme) => {
    if (window.UserAudio) window.UserAudio[theme] = "";
    if (isPlaying && theme === activeTheme) loadAndPlay();
  };
})();
