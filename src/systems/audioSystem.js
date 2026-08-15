/**
 * Thin audio manager kept outside React so the Audio object
 * is created once and survives component re-renders.
 * Call initAudio() on the first user gesture to satisfy
 * browser autoplay policies.
 */

let growlAudio = null;
let nightAudio = null;
let noxAudio = null;
let landAudio = null;
let initialized = false;
let activeZone = 'land';
let growlFadeInterval = null;
let growlFadeStartTimer = null;
let growlStopTimer = null;
let noxFadeInterval = null;
let noxFadeTimer = null;
let noxIsFadingOut = false;
let noxFadeRaf = null;
const DEFAULT_LAND_TRACK = '/Parlez-Moi%20d%27Amour.wav';
let landTrackSrc = DEFAULT_LAND_TRACK;
let landPlaylist = [landTrackSrc];
let landPlaylistIndex = 0;
let landPreviewEnd = null;
let musicPausedByUser = false;
let pageHidden = typeof document !== 'undefined' ? document.hidden : false;
const audioSubscribers = new Set();

function emitAudioState() {
  const state = getAudioState();
  audioSubscribers.forEach((subscriber) => subscriber(state));
}

function shouldPlayZoneBackground() {
  return !musicPausedByUser && !pageHidden;
}

function pauseAllAudio() {
  if (landAudio) landAudio.pause();
  if (nightAudio) nightAudio.pause();
  if (noxAudio) noxAudio.pause();
  if (growlAudio) growlAudio.pause();
}

function clearGrowlTimers() {
  if (growlFadeInterval) {
    clearInterval(growlFadeInterval);
    growlFadeInterval = null;
  }
  if (growlFadeStartTimer) {
    clearTimeout(growlFadeStartTimer);
    growlFadeStartTimer = null;
  }
  if (growlStopTimer) {
    clearTimeout(growlStopTimer);
    growlStopTimer = null;
  }
}

function clearNoxTimers() {
  if (noxFadeRaf) {
    cancelAnimationFrame(noxFadeRaf);
    noxFadeRaf = null;
  }
  if (noxFadeInterval) {
    clearInterval(noxFadeInterval);
    noxFadeInterval = null;
  }
  if (noxFadeTimer) {
    clearTimeout(noxFadeTimer);
    noxFadeTimer = null;
  }
}

function normalizePlaylist(tracks = [landTrackSrc]) {
  const unique = tracks
    .map((track) => String(track || '').trim())
    .filter(Boolean)
    .filter((track, index, array) => array.indexOf(track) === index);
  return unique.length > 0 ? unique : [landTrackSrc];
}

function advanceLandPlaylist() {
  if (!landAudio || activeZone !== 'land' || landPlaylist.length <= 0) return;
  landPlaylistIndex = (landPlaylistIndex + 1) % landPlaylist.length;
  landTrackSrc = landPlaylist[landPlaylistIndex];
  landAudio.src = landTrackSrc;
  landAudio.currentTime = 0;
  if (shouldPlayZoneBackground()) {
    landAudio.play().catch(() => {});
  }
  emitAudioState();
}

function enforceLandPreviewEnd() {
  if (!landAudio || !Number.isFinite(landPreviewEnd)) return;
  if (landAudio.currentTime < landPreviewEnd) return;
  landPreviewEnd = null;
  playLandPlaylist([DEFAULT_LAND_TRACK], DEFAULT_LAND_TRACK);
}

function scheduleHalfGrowlFadeOut() {
  if (!growlAudio) return;
  const duration = Number(growlAudio.duration);
  if (!Number.isFinite(duration) || duration <= 0) return;

  const stopAtMs = (duration * 1000) / 2;
  // Fade through the last chunk of the first half for a natural tail.
  const fadeMs = Math.min(1400, Math.max(700, stopAtMs * 0.45));
  const fadeStartMs = Math.max(0, stopAtMs - fadeMs);
  const baseVolume = 1;

  clearGrowlTimers();
  growlAudio.volume = baseVolume;

  growlFadeStartTimer = setTimeout(() => {
    const started = performance.now();
    growlFadeInterval = setInterval(() => {
      const t = (performance.now() - started) / fadeMs;
      const next = Math.max(0, baseVolume * (1 - t));
      growlAudio.volume = next;
      if (t >= 1) {
        clearInterval(growlFadeInterval);
        growlFadeInterval = null;
      }
    }, 60);
  }, fadeStartMs);

  growlStopTimer = setTimeout(() => {
    growlAudio.pause();
    growlAudio.currentTime = 0;
    growlAudio.volume = baseVolume;
    clearGrowlTimers();
  }, stopAtMs);
}

export function initAudio() {
  if (!initialized) {
    initialized = true;

    nightAudio = new Audio('/night.mp3');
    nightAudio.preload = 'auto';
    nightAudio.loop = true;
    nightAudio.volume = 0.05;

    growlAudio = new Audio('/growl.mp3');
    growlAudio.preload = 'auto';

    noxAudio = new Audio('/Nox.mp3');
    noxAudio.preload = 'auto';
    noxAudio.loop = true;

    landAudio = new Audio(landTrackSrc);
    landAudio.preload = 'auto';
    landAudio.loop = false;
    landAudio.volume = 0.12;
    landAudio.addEventListener('ended', advanceLandPlaylist);
    landAudio.addEventListener('timeupdate', emitAudioState);
    landAudio.addEventListener('timeupdate', enforceLandPreviewEnd);
    landAudio.addEventListener('loadedmetadata', emitAudioState);

    document.addEventListener('visibilitychange', () => {
      pageHidden = document.hidden;
      if (pageHidden) {
        pauseAllAudio();
        emitAudioState();
        return;
      }
      initAudio();
    });
  }

  // Always retry playback on each init call so a later user gesture can
  // unlock audio if the initial autoplay attempt was blocked.
  if (!shouldPlayZoneBackground()) {
    emitAudioState();
    return;
  }

  if (activeZone === 'land' && landAudio) {
    landAudio.play().catch(() => {
      // Harmless if blocked; next gesture-triggered initAudio call retries.
    });
  } else if (activeZone === 'fog' && nightAudio && localStorage.getItem('fogbound_bg_after') !== '1') {
    nightAudio.play().catch(() => {
      // Harmless if blocked; next gesture-triggered initAudio call retries.
    });
  }
  emitAudioState();
}

export function setAudioZone(zone) {
  activeZone = zone === 'fog' ? 'fog' : 'land';
  initAudio();

  if (activeZone === 'land') {
    if (nightAudio) {
      nightAudio.pause();
      nightAudio.currentTime = 0;
    }
    if (noxAudio) {
      noxAudio.pause();
      noxAudio.currentTime = 0;
      noxAudio.volume = 0;
      noxIsFadingOut = false;
      clearNoxTimers();
    }
    if (growlAudio) {
      growlAudio.pause();
      growlAudio.currentTime = 0;
      clearGrowlTimers();
    }
    if (landAudio && shouldPlayZoneBackground()) {
      landAudio.loop = false;
      landAudio.play().catch(() => {});
    }
    emitAudioState();
    return;
  }

  if (landAudio) landAudio.pause();
  if (nightAudio && shouldPlayZoneBackground() && localStorage.getItem('fogbound_bg_after') !== '1') {
    nightAudio.play().catch(() => {});
  }
  emitAudioState();
}

export function playLandTrack(src = landTrackSrc) {
  landPreviewEnd = null;
  activeZone = 'land';
  musicPausedByUser = false;
  initAudio();
  if (!landAudio) return;

  if (src !== landTrackSrc) {
    landTrackSrc = src;
    landAudio.src = src;
  }

  if (nightAudio) nightAudio.pause();
  if (noxAudio) noxAudio.pause();
  landAudio.loop = false;
  landAudio.currentTime = 0;
  landAudio.play().catch(() => {});
  emitAudioState();
}

export function playLandPreview(src, endTime) {
  playLandTrack(src);
  landPreviewEnd = Number.isFinite(Number(endTime)) ? Number(endTime) : null;
}

export function playLandTrackFrom(src, startTime = 0) {
  const requestedTime = Math.max(0, Number(startTime) || 0);
  playLandTrack(src);
  if (!landAudio) return;

  const seekAndPlay = () => {
    try {
      landAudio.currentTime = requestedTime;
      if (shouldPlayZoneBackground()) landAudio.play().catch(() => {});
      emitAudioState();
    } catch (_err) {
      // A later metadata event will retry on browsers that cannot seek yet.
    }
  };

  if (landAudio.readyState >= 1) seekAndPlay();
  else landAudio.addEventListener('loadedmetadata', seekAndPlay, { once: true });
}

export function playLandPlaylist(tracks = [landTrackSrc], startSrc = tracks[0]) {
  activeZone = 'land';
  musicPausedByUser = false;
  landPlaylist = normalizePlaylist(tracks);
  const startIndex = landPlaylist.indexOf(startSrc);
  landPlaylistIndex = startIndex >= 0 ? startIndex : 0;
  playLandTrack(landPlaylist[landPlaylistIndex]);
}

export function stopLandTrack() {
  if (!landAudio) return;
  landAudio.pause();
  emitAudioState();
}

export function setMusicPaused(paused) {
  musicPausedByUser = Boolean(paused);
  initAudio();

  if (musicPausedByUser) {
    if (landAudio) landAudio.pause();
    if (nightAudio) nightAudio.pause();
    if (noxAudio) noxAudio.pause();
    emitAudioState();
    return;
  }

  if (activeZone === 'land' && landAudio) {
    landAudio.play().catch(() => {});
  } else if (activeZone === 'fog' && nightAudio && localStorage.getItem('fogbound_bg_after') !== '1') {
    nightAudio.play().catch(() => {});
  }
  emitAudioState();
}

export function toggleMusicPaused() {
  setMusicPaused(!musicPausedByUser);
}

export function getAudioState() {
  return {
    zone: activeZone,
    paused: musicPausedByUser,
    src: landTrackSrc,
    currentTime: Number(landAudio?.currentTime) || 0,
    duration: Number.isFinite(Number(landAudio?.duration)) ? Number(landAudio.duration) : 0,
  };
}

export function subscribeAudioState(subscriber) {
  audioSubscribers.add(subscriber);
  subscriber(getAudioState());
  return () => audioSubscribers.delete(subscriber);
}

/**
 * @param {boolean} muted - pass store.lowPower to respect the setting
 */
export function playGrowl(muted = false) {
  if (muted || !growlAudio) return;
  if (landAudio) landAudio.pause();
  if (nightAudio) nightAudio.pause();
  clearGrowlTimers();
  growlAudio.volume = 1;
  growlAudio.currentTime = 0;
  growlAudio.play().then(() => {
    if (growlAudio.readyState >= 1) {
      scheduleHalfGrowlFadeOut();
      return;
    }
    growlAudio.addEventListener('loadedmetadata', scheduleHalfGrowlFadeOut, { once: true });
  }).catch(() => {
    // Autoplay blocked — harmless; user hasn't interacted yet
  });
}

export function playNoxForTeaser(targetVolume = 0.22, fadeInMs = 2200, startOffsetSec = 3.0) {
  if (!noxAudio) return;
  if (landAudio) landAudio.pause();
  if (nightAudio) nightAudio.pause();
  clearNoxTimers();
  noxIsFadingOut = false;
  const startPlayback = () => {
    const safeOffset = Math.max(0, Number(startOffsetSec) || 0);
    try {
      noxAudio.currentTime = safeOffset;
    } catch (_err) {
      noxAudio.currentTime = 0;
    }
    noxAudio.play().then(() => {
      const start = performance.now();
      noxFadeInterval = setInterval(() => {
        const t = Math.min(1, (performance.now() - start) / fadeInMs);
        noxAudio.volume = targetVolume * t;
        if (t >= 1) {
          clearInterval(noxFadeInterval);
          noxFadeInterval = null;
        }
      }, 60);
    }).catch(() => {
      // blocked until gesture; harmless
    });
  };
  noxAudio.muted = false;
  noxAudio.volume = 0;
  if (noxAudio.readyState >= 1) {
    startPlayback();
    return;
  }
  noxAudio.addEventListener('loadedmetadata', startPlayback, { once: true });
}

export function fadeOutNoxForTeaser(fadeOutMs = 6200) {
  if (!noxAudio) return;
  if (noxIsFadingOut) return;
  noxIsFadingOut = true;
  clearNoxTimers();
  const startVolume = Math.max(0, Number(noxAudio.volume) || 0);
  const start = performance.now();
  const tick = () => {
    const t = Math.min(1, (performance.now() - start) / fadeOutMs);
    const k = 1 - t;
    noxAudio.volume = Math.max(0, startVolume * k);
    if (t < 1) {
      noxFadeRaf = requestAnimationFrame(tick);
      return;
    }
    noxAudio.volume = 0;
    // Leave a short silent tail before pausing to avoid abrupt stop artifacts on iOS.
    noxFadeTimer = setTimeout(() => {
      noxAudio.pause();
      noxAudio.currentTime = 0;
      noxAudio.volume = 0;
      noxIsFadingOut = false;
    }, 1200);
  };
  noxFadeRaf = requestAnimationFrame(tick);
}
