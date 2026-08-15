import { initAudio as initSharedAudio, playGrowl as playSharedGrowl } from '/src/systems/audioSystem.js';
import useGameStore from '/src/store/useGameStore.js';

(() => {
  'use strict';

  const LS = {
    loopCount: 'fogbound_loop_count',
    turnBackDisabled: 'fogbound_turn_back_disabled',
    escapeLineShown: 'fogbound_escape_line_shown',
    entry1Picked: 'fogbound_entry1_picked',
    ibitInteracted: 'fogbound_ibit_interacted',
    benInteracted: 'fogbound_ben_interacted',
    benAheadDisabled: 'fogbound_ben_ahead_disabled',
    bgAfter: 'fogbound_bg_after',
    momentaryEscapeShown: 'fogbound_momentary_escape_shown',
  };

  const DEPTH = {
    escapeNearStart: 0.18,
    turnBackPrompt: 0.4,
    benLayer: 0.74,
    deepEnd: 0.99,
    progressed: 0.35,
  };

  const RED = {
    shakeMs: 3000,
    slowMs: 10000,
    bgSwapDelayMs: 360,
  };
  const SCRIPT_LOOP_RESET_MS = 1100;
  const LANTERN_GLOW = {
    forest: { x: '52%', y: '70%' },
    forestMobile: { x: '49%', y: '65%' },
    after: { x: '50%', y: '69%' },
    afterMobile: { x: '51%', y: '64%' },
  };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = {
    loopCount: readNum(LS.loopCount, 0),
    sessionLoops: 0,
    currentNorm: 0,
    targetNorm: 0,
    prevNorm: 0,
    movingForward: false,
    movingBackward: false,
    loopInProgress: false,
    rafId: null,
    lowPower: false,
    speedMultiplier: 1,
    speedSlowUntilTs: 0,
    escapeTriggered: false,
    escapeLineShownTotal: readBool(LS.escapeLineShown, false),
    entry1EscapeCompleted: false,
    ibitClickedThisRun: readBool(LS.ibitInteracted, false),
    benClickedThisRun: readBool(LS.benInteracted, false),
    turnBackPromptedThisLoop: false,
    turnBackShownThisLoop: false,
    progressedThisLoop: false,
    aheadShownThisLoop: false,
    aheadDismissedThisLoop: false,
    benAheadDisabled: readBool(LS.benAheadDisabled, false),
    momentaryEscapeShownTotal: readBool(LS.momentaryEscapeShown, false),
    momentaryEscapeToggleOn: false,
    entry1Picked: readBool(LS.entry1Picked, false),
    ibitInteracted: readBool(LS.ibitInteracted, false),
    benInteracted: readBool(LS.benInteracted, false),
    introLockedOff: readNum(LS.loopCount, 0) > 0,
    shaking: false,
    joystickHooked: false,
  };

  const dom = {
    world: document.getElementById('world'),
    scene: document.getElementById('scene'),
    forest: document.getElementById('forest'),
    whisper: document.getElementById('whisper'),
    redFlash: document.getElementById('red-flash'),
    menu: document.querySelector('.menu-panel') || document.querySelector('#menu'),
    ibitArtifact: document.getElementById('ibit-artifact'),
    benArtifact: document.getElementById('ben-artifact'),
    lowPowerButton: null,
    joystickBase: null,
  };

  let booted = false;
  let afterBgPreloaded = false;
  waitForAppMount();

  function readBool(key, fallback) {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === '1';
  }

  function refreshDomRefs() {
    dom.world = dom.world || document.getElementById('world');
    dom.scene = dom.scene || document.getElementById('scene');
    dom.forest = dom.forest || document.getElementById('forest');
    dom.whisper = dom.whisper || document.getElementById('whisper');
    dom.redFlash = dom.redFlash || document.getElementById('red-flash');
    dom.menu = dom.menu || document.querySelector('.menu-panel') || document.querySelector('#menu');
    dom.ibitArtifact = dom.ibitArtifact || document.getElementById('ibit-artifact');
    dom.benArtifact = dom.benArtifact || document.getElementById('ben-artifact');
    dom.joystickBase = dom.joystickBase || document.querySelector('.joystick-base');
  }

  function waitForAppMount() {
    if (booted) return;
    refreshDomRefs();
    if (dom.world && dom.forest) {
      booted = true;
      applyBackgroundVariant();
      applyLanternGlowAnchor();
      applyLanternDepthScale();
      preloadAfterBackground();
      hideIntroMemoriesIfNeeded();
      installOwnerlessMenuStateSync();
      installArtifactHooks();
      installArtifactBridgeHook();
      installMomentaryEscapeToggleHook();
      installLowPowerHook();
      installGoDeeperWhisperHook();
      installInputHooks();
      installEntry1WhisperIfNeeded();
      runTick();
      return;
    }
    requestAnimationFrame(waitForAppMount);
  }

  function writeBool(key, value) {
    localStorage.setItem(key, value ? '1' : '0');
  }

  function readNum(key, fallback) {
    const raw = Number(localStorage.getItem(key));
    return Number.isFinite(raw) ? raw : fallback;
  }

  function writeNum(key, value) {
    localStorage.setItem(key, String(value));
  }

  function installInputHooks() {
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    ensureJoystickHooks();
  }

  function ensureJoystickHooks() {
    if (state.joystickHooked) return;
    refreshDomRefs();
    const base = dom.joystickBase || document.querySelector('.joystick-base');
    if (!base) return;

    let touchActive = false;
    let startY = 0;
    let currentY = 0;
    let intervalId = null;

    const stopTouch = () => {
      touchActive = false;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    base.addEventListener('touchstart', (e) => {
      if (!e.touches[0]) return;
      touchActive = true;
      startY = e.touches[0].clientY;
      currentY = startY;
      if (!intervalId) {
        intervalId = setInterval(() => {
          if (!touchActive) return;
          const delta = clamp((startY - currentY) / 160, -1, 1);
          if (Math.abs(delta) < 0.02) return;
          const step = (state.lowPower ? 0.0018 : 0.0032) * delta;
          setTarget(state.targetNorm + step);
        }, state.lowPower ? 70 : 34);
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!touchActive || !e.touches[0]) return;
      currentY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchend', stopTouch, { passive: true });
    window.addEventListener('touchcancel', stopTouch, { passive: true });
    state.joystickHooked = true;
  }

  function onScroll() {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    setTarget(window.scrollY / maxScroll);
  }

  function setTarget(value) {
    state.targetNorm = clamp(value, 0, 1);
    ensureRaf();
  }

  function ensureRaf() {
    if (state.rafId !== null) return;
    state.rafId = requestAnimationFrame(runTick);
  }

  function runTick() {
    refreshDomRefs();
    ensureJoystickHooks();
    syncFromReactStore();
    state.rafId = null;

    const now = performance.now();
    if (state.speedSlowUntilTs > 0 && now >= state.speedSlowUntilTs) {
      state.speedSlowUntilTs = 0;
      state.speedMultiplier = 1;
    }

    const base = state.lowPower ? 0.018 : 0.045;
    const speed = Math.max(0.004, base * state.speedMultiplier);
    const delta = state.targetNorm - state.currentNorm;
    const prev = state.currentNorm;
    state.currentNorm += delta * speed;

    if (Math.abs(state.currentNorm - prev) < 0.00001) {
      state.currentNorm = prev;
    }

    // Keep direction detection sensitive enough for joystick-only mobile flow.
    state.movingForward = state.currentNorm - state.prevNorm > 0.0002;
    state.movingBackward = state.currentNorm - state.prevNorm < -0.0002;
    state.prevNorm = state.currentNorm;

    if (state.currentNorm >= DEPTH.progressed) {
      state.progressedThisLoop = true;
    }

    handleWorldDepthVisual();
    installArtifactHooks();
    handleLooping();
    handleIntroMemorySuppression();
    handleTurnBackAndEscape();
    handleAheadWhisper();
    handleMomentaryEscapeMessage();
    applyLanternDepthScale();
    installEntry1WhisperIfNeeded();

    const shouldContinue = Math.abs(state.targetNorm - state.currentNorm) > 0.0008
      || state.speedSlowUntilTs > 0
      || state.shaking;

    if (shouldContinue) {
      state.rafId = requestAnimationFrame(runTick);
    }
  }

  function handleWorldDepthVisual() {
    // React's World RAF is the single writer for #world transform.
    // Keeping script.js read-only here avoids transform jitter/fighting.
  }

  function handleLooping() {
    // React narrative triggers own loop resets/veil. Here we only observe
    // loop count changes and reset script-local per-loop flags accordingly.
    const effectiveLoops = getEffectiveLoopCount();
    if (effectiveLoops <= state.loopCount) return;

    state.loopCount = effectiveLoops;
    state.sessionLoops = effectiveLoops;
    state.introLockedOff = true;
    hideIntroMemoriesIfNeeded();

    state.turnBackPromptedThisLoop = false;
    state.turnBackShownThisLoop = false;
    state.progressedThisLoop = false;
    state.aheadShownThisLoop = false;
    state.aheadDismissedThisLoop = false;
    state.escapeTriggered = false;
    state.entry1EscapeCompleted = false;

    installEntry1WhisperIfNeeded();
    installOwnerlessMenuStateSync();
  }

  function handleIntroMemorySuppression() {
    if (state.loopCount > 0 && !state.introLockedOff) {
      state.introLockedOff = true;
      hideIntroMemoriesIfNeeded();
    }
  }

  function hideIntroMemoriesIfNeeded() {
    if (!state.introLockedOff) return;
    const introTexts = new Set([
      'Down…',
      'It thickens…',
      'Every step feels remembered.',
      'You were here before.',
    ]);
    document.querySelectorAll('.memory').forEach((el) => {
      const text = (el.textContent || '').trim();
      if (introTexts.has(text)) {
        el.style.display = 'none';
        el.style.opacity = '0';
      }
    });
  }

  function handleTurnBackAndEscape() {
    if (state.entry1Picked) return;
    if (!isEntryOneLoopEligible()) return;

    if (!state.turnBackShownThisLoop && state.currentNorm >= DEPTH.turnBackPrompt) {
      state.turnBackShownThisLoop = true;
      state.turnBackPromptedThisLoop = true;
      showWhisper('turn back?', 3200, { color: 'rgba(255, 92, 92, 0.95)' });
    }

    if (
      state.turnBackPromptedThisLoop
      && state.currentNorm <= DEPTH.escapeNearStart
    ) {
      state.entry1EscapeCompleted = true;
      if (!state.escapeLineShownTotal) {
        state.escapeLineShownTotal = true;
        writeBool(LS.escapeLineShown, true);
        showWhisper('The fog thins. Slightly more aware.', 4000);
      }
      installEntry1WhisperIfNeeded(true);
    }
  }

  function handleAheadWhisper() {
    if (state.benAheadDisabled || state.benInteracted) return;
    if (getEffectiveLoopCount() < 2) return;

    if (!state.aheadShownThisLoop && state.movingForward && state.currentNorm > 0.2 && state.currentNorm < DEPTH.benLayer) {
      state.aheadShownThisLoop = true;
      showWhisper('something is ahead', 0);
    }

    if (!state.aheadDismissedThisLoop && state.currentNorm >= DEPTH.benLayer) {
      state.aheadDismissedThisLoop = true;
      clearWhisperIf('something is ahead');
    }
  }

  function handleMomentaryEscapeMessage() {
    if (!state.momentaryEscapeToggleOn) return;
    if (state.momentaryEscapeShownTotal) return;
    if (state.loopCount < 2) return;
    if (!state.progressedThisLoop) return;
    if (!state.movingBackward) return;
    if (state.currentNorm > DEPTH.escapeNearStart) return;

    state.momentaryEscapeShownTotal = true;
    writeBool(LS.momentaryEscapeShown, true);
    showWhisper('The fog thins. Slightly more aware.', 3400);
  }

  function installGoDeeperWhisperHook() {
    window.addEventListener('fogbound-menu-or-view-exit', () => {
      if (!state.ibitInteracted) return;
      if (state.benInteracted) {
        if (isEntryOneLoopEligible()) return;
        showWhisper('Go even deeper?', 3800, {
          color: 'rgba(178, 130, 255, 0.97)',
          pulseViolet: true,
        });
        return;
      }
      showWhisper('Go deeper?', 3800, { color: 'rgba(178, 130, 255, 0.95)' });
    });
  }

  function showWhisper(text, durationMs, options = {}) {
    if (!dom.whisper) return;
    dom.whisper.textContent = text;
    dom.whisper.style.color = options.color || '';
    dom.whisper.classList.toggle('whisper-pulse-violet', !!options.pulseViolet);
    dom.whisper.style.opacity = '1';
    if (durationMs > 0) {
      window.setTimeout(() => {
        clearWhisperIf(text, options);
      }, durationMs);
    }
  }

  function clearWhisperIf(text, _options) {
    if (!dom.whisper) return;
    if ((dom.whisper.textContent || '').trim() !== text) return;
    dom.whisper.style.opacity = '0';
    dom.whisper.textContent = '';
    dom.whisper.style.color = '';
    dom.whisper.classList.remove('whisper-pulse-violet');
  }

  function installEntry1WhisperIfNeeded(forceShow = false) {
    const existing = document.getElementById('entry-one-whisper-btn');
    if (state.entry1Picked) {
      if (existing) existing.remove();
      return;
    }
    // Entry 1 can only be offered after, in the current run:
    // 1) loop 2+, 2) Ibit clicked, 3) Ben clicked, 4) turn-back escape completed.
    if (!isEntryOneLoopEligible()) {
      if (existing) existing.remove();
      return;
    }
    if (!state.entry1EscapeCompleted && !forceShow) {
      if (existing) existing.remove();
      return;
    }

    let btn = document.getElementById('entry-one-whisper-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'entry-one-whisper-btn';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Pick up Entry 1');
      btn.textContent = 'Entry 1 surfaced. Pick it up.';
      Object.assign(btn.style, {
        position: 'fixed',
        left: '50%',
        bottom: '120px',
        transform: 'translateX(-50%)',
        zIndex: '120',
        color: '#ffb3b3',
        border: '1px solid rgba(255, 80, 80, 0.8)',
        background: 'rgba(95, 0, 0, 0.45)',
        fontSize: '0.92rem',
        letterSpacing: '0.06em',
        padding: '10px 16px',
        cursor: 'pointer',
        backdropFilter: 'blur(6px)',
      });
      btn.addEventListener('click', onEntry1Picked);
      document.body.appendChild(btn);
    }
  }

  function onEntry1Picked() {
    state.entry1Picked = true;
    writeBool(LS.entry1Picked, true);
    window.dispatchEvent(new CustomEvent('fogbound-menu-attention', { detail: { target: 'entry1' } }));
    installOwnerlessMenuStateSync();

    const btn = document.getElementById('entry-one-whisper-btn');
    if (btn) btn.remove();

    startRedSequence();
  }

  function startRedSequence() {
    const overlay = dom.redFlash;
    if (overlay) {
      overlay.style.transition = 'none';
      overlay.style.background = 'rgba(180,0,0,0.92)';
      overlay.style.opacity = '0.92';
      // Keep movement dramatically slow while tint fades out.
      state.speedMultiplier = 0.08;
      state.speedSlowUntilTs = performance.now() + RED.slowMs;
      window.setTimeout(() => {
        overlay.style.transition = `opacity ${Math.round(RED.slowMs / 1000)}s linear`;
        overlay.style.opacity = '0';
      }, 20);
    } else {
      state.speedMultiplier = 0.08;
      state.speedSlowUntilTs = performance.now() + RED.slowMs;
    }

    window.setTimeout(() => {
      // Swap while the red tint is still strongly visible.
      setAfterBackground();
    }, RED.bgSwapDelayMs);

    initSharedAudio();
    playSharedGrowl(false);
    startViolentShake();
    ensureRaf();
  }

  function startViolentShake() {
    if (reducedMotion) return;
    if (!dom.scene) return;

    state.shaking = true;
    const start = performance.now();
    const baseTransform = dom.scene.style.transform || '';

    const step = () => {
      const elapsed = performance.now() - start;
      if (elapsed >= RED.shakeMs) {
        dom.scene.style.transform = baseTransform;
        state.shaking = false;
        return;
      }

      const t = 1 - elapsed / RED.shakeMs;
      const amp = 24 * t;
      const x = (Math.random() * 2 - 1) * amp;
      const y = (Math.random() * 2 - 1) * amp;
      const r = (Math.random() * 2 - 1) * 1.8 * t;
      dom.scene.style.transform = `${baseTransform} translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${r.toFixed(2)}deg)`;
      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }

  function setAfterBackground() {
    writeBool(LS.bgAfter, true);
    applyBackgroundVariant();
    window.dispatchEvent(new CustomEvent('fogbound-bg-after-changed'));
    window.dispatchEvent(new CustomEvent('fogbound-entry1-picked'));
  }

  function preloadAfterBackground() {
    if (afterBgPreloaded) return;
    const img = new Image();
    img.src = '/forest_after.jpg';
    img.onload = () => {
      afterBgPreloaded = true;
    };
  }

  function applyBackgroundVariant() {
    if (!readBool(LS.bgAfter, false)) return;
    if (dom.forest) {
      dom.forest.style.backgroundImage = "url('/forest_after.jpg')";
    }
    // Deep fullscreen forest layer can visually cover #forest, so swap it too.
    document.querySelectorAll('.layer-sprite-fullscreen').forEach((img) => {
      if (!(img instanceof HTMLImageElement)) return;
      const src = img.getAttribute('src') || '';
      if (src.includes('/forest.png')) {
        img.setAttribute('src', '/forest_after.jpg');
      }
    });
    applyAfterNarrativeCopy();
    applyLanternGlowAnchor();
    ensureRaf();
  }

  function applyLanternGlowAnchor() {
    const after = readBool(LS.bgAfter, false);
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const glow = after
      ? (isMobile ? LANTERN_GLOW.afterMobile : LANTERN_GLOW.after)
      : (isMobile ? LANTERN_GLOW.forestMobile : LANTERN_GLOW.forest);
    document.documentElement.style.setProperty('--lantern-glow-x', glow.x);
    document.documentElement.style.setProperty('--lantern-glow-y', glow.y);
    document.documentElement.style.setProperty('--lantern-glow-alpha', after ? '0.42' : '0.24');
  }

  function applyLanternDepthScale() {
    // Grow only until halfway depth, then hold steady so it no longer
    // feels attached to continued scroll motion.
    const depthForScale = Math.min(state.currentNorm, 0.5);
    const t = depthForScale / 0.5;
    const scale = clamp(0.35 + t * 0.65, 0.35, 1);
    document.documentElement.style.setProperty('--lantern-depth-scale', scale.toFixed(3));
  }

  function applyAfterNarrativeCopy() {
    const from = 'The first lie was told out of love.';
    const to = 'Another lie has been told...';
    document.querySelectorAll('.memory').forEach((el) => {
      const text = (el.textContent || '').trim();
      if (text === from) {
        el.textContent = to;
      }
    });
  }

  function installArtifactHooks() {
    dom.ibitArtifact = document.getElementById('ibit-artifact');
    dom.benArtifact = document.getElementById('ben-artifact');
    if (dom.ibitArtifact && !dom.ibitArtifact.dataset.fogHooked) {
      dom.ibitArtifact.dataset.fogHooked = '1';
      dom.ibitArtifact.addEventListener('click', () => {
        state.ibitInteracted = true;
        state.ibitClickedThisRun = true;
        writeBool(LS.ibitInteracted, true);
        installOwnerlessMenuStateSync();
        installEntry1WhisperIfNeeded();
      });
    }
    if (dom.benArtifact && !dom.benArtifact.dataset.fogHooked) {
      dom.benArtifact.dataset.fogHooked = '1';
      dom.benArtifact.addEventListener('click', () => {
        state.benInteracted = true;
        state.benClickedThisRun = true;
        writeBool(LS.benInteracted, true);
        state.benAheadDisabled = true;
        writeBool(LS.benAheadDisabled, true);
        clearWhisperIf('something is ahead');
        installOwnerlessMenuStateSync();
        installEntry1WhisperIfNeeded();
      });
    }
  }

  function installArtifactBridgeHook() {
    window.addEventListener('fogbound-artifact-collected', (e) => {
      const id = e?.detail?.id;
      if (id === 'ibit') {
        state.ibitInteracted = true;
        state.ibitClickedThisRun = true;
        writeBool(LS.ibitInteracted, true);
        installOwnerlessMenuStateSync();
        installEntry1WhisperIfNeeded();
      }
      if (id === 'ben') {
        state.benInteracted = true;
        state.benClickedThisRun = true;
        writeBool(LS.benInteracted, true);
        state.benAheadDisabled = true;
        writeBool(LS.benAheadDisabled, true);
        clearWhisperIf('something is ahead');
        installOwnerlessMenuStateSync();
        installEntry1WhisperIfNeeded();
      }
    });
  }

  function readReactLoopCount() {
    try {
      const raw = localStorage.getItem('fogbound-state');
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      const loopCount = Number(parsed?.state?.loopCount);
      return Number.isFinite(loopCount) ? loopCount : 0;
    } catch (_err) {
      return 0;
    }
  }

  function syncFromReactStore() {
    try {
      const react = useGameStore.getState?.();
      if (!react) return;
      if (Number.isFinite(react.targetNorm)) {
        state.targetNorm = clamp(react.targetNorm, 0, 1);
      }
    } catch (_err) {
      // Optional bridge only; ignore read failures.
    }
  }

  function hasReactFragment(name) {
    try {
      const raw = localStorage.getItem('fogbound-state');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return !!parsed?.state?.fragments?.[name];
    } catch (_err) {
      return false;
    }
  }

  function getEffectiveLoopCount() {
    const legacy = readNum(LS.loopCount, 0);
    const reactCount = readReactLoopCount();
    return Math.max(state.loopCount || 0, legacy, reactCount);
  }

  function isEntryOneLoopEligible() {
    const ibitReady = state.ibitInteracted || hasReactFragment('ibit');
    const benReady = state.benInteracted || hasReactFragment('ben');
    return ibitReady && benReady && getEffectiveLoopCount() >= 2;
  }

  function installMomentaryEscapeToggleHook() {
    const candidates = [
      '#momentary-escape-toggle',
      '#menu-toggle-momentary-escape',
      '[data-toggle="momentary-escape"]',
    ];
    const toggle = document.querySelector(candidates.join(','));
    if (!toggle) return;

    const sync = () => {
      if (toggle instanceof HTMLInputElement && toggle.type === 'checkbox') {
        state.momentaryEscapeToggleOn = !!toggle.checked;
      } else {
        state.momentaryEscapeToggleOn = toggle.getAttribute('aria-pressed') === 'true';
      }
    };
    sync();
    toggle.addEventListener('click', () => {
      setTimeout(sync, 0);
    });
    toggle.addEventListener('change', sync);
  }

  function installLowPowerHook() {
    const buttons = Array.from(document.querySelectorAll('button'));
    dom.lowPowerButton = buttons.find((b) => /low power/i.test((b.textContent || '').trim())) || null;
    if (!dom.lowPowerButton) return;

    const sync = () => {
      const text = (dom.lowPowerButton.textContent || '').toLowerCase();
      const aria = dom.lowPowerButton.getAttribute('aria-pressed');
      state.lowPower = aria === 'true' || text.includes('low power: on');
      ensureRaf();
    };
    sync();
    dom.lowPowerButton.addEventListener('click', () => setTimeout(sync, 0));
  }

  function installOwnerlessMenuStateSync() {
    // Entry unlock visibility should be interaction-driven only.
    setMenuEntryVisible(['entry1', 'entry-1', 'entry_one'], state.entry1Picked);
    setMenuEntryVisible(['ibit', 'ibit-shaw', 'ibit_fragment'], state.ibitInteracted);
    setMenuEntryVisible(['ben', 'bens-story', 'ben_story'], state.benInteracted);
  }

  function setMenuEntryVisible(tokens, visible) {
    const selectors = [];
    tokens.forEach((token) => {
      selectors.push(`[data-entry="${token}"]`);
      selectors.push(`[data-menu-item="${token}"]`);
      selectors.push(`#menu-${token}`);
      selectors.push(`#${token}-menu-item`);
    });
    const nodes = document.querySelectorAll(selectors.join(','));
    nodes.forEach((node) => {
      node.style.display = visible ? '' : 'none';
      node.setAttribute('aria-hidden', visible ? 'false' : 'true');
    });
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
})();
