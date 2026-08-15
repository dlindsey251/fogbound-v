import { useEffect, useState } from 'react';
import World        from './components/World';
import Menu         from './components/Menu';
import Overlay      from './components/Overlay';
import CabinLanding from './components/CabinLanding';
import MusicToggle  from './components/MusicToggle';
import ScrollBarControl from './components/ScrollBarControl';
import ProgressBar  from './components/ProgressBar';
import Whisper      from './components/Whisper';
import EntryOnePrompt from './components/EntryOnePrompt';
import RedFlash     from './components/RedFlash';
import SecretCodePrompt from './components/SecretCodePrompt';
import StoryTeaserSequence from './components/StoryTeaserSequence';
import { useScrollInput }        from './hooks/useScrollInput';
import { useNarrativeTriggers }  from './hooks/useNarrativeTriggers';
import { initAudio, setAudioZone } from './systems/audioSystem';
import { clearProgressStorage, LS_GLOBAL_RESET_APPLIED, LS_GLOBAL_RESET_EPOCH } from './utils/resetProgress';
import { setMetricsOptOut, trackMetric } from './utils/metrics';
import useGameStore              from './store/useGameStore';
import './styles/global.css';

/**
 * LoopVeil — full-screen black overlay that fades in/out on loop resets.
 * Kept here because it needs a direct store subscription and is tiny.
 */
function LoopVeil() {
  return (
    <div
      id="loop-veil"
      aria-hidden="true"
      style={{
        opacity: useGameStore((s) => s.loopVeilVisible) ? 1 : 0,
      }}
    />
  );
}

/**
 * App — root component.
 * Mounts core systems (scroll input, narrative triggers) and composes
 * the full scene layout.
 */
export default function App() {
  const [forestEntered, setForestEntered] = useState(false);
  const joystickEnabled = useGameStore((s) => s.joystickEnabled);
  // ── Core input / narrative systems ──────────────────────────────────────
  useScrollInput();
  useNarrativeTriggers();

  // ── Start audio immediately; fallback to first gesture if autoplay blocks ─
  useEffect(() => {
    initAudio();
    const unlock = () => initAudio();
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('test_device') === '1') {
      setMetricsOptOut(true);
    }
    trackMetric('site_visit');
  }, []);

  useEffect(() => {
    document.body.classList.toggle('cabin-mode', !forestEntered);
    setAudioZone(forestEntered ? 'fog' : 'land');
    return () => document.body.classList.remove('cabin-mode');
  }, [forestEntered]);

  useEffect(() => {
    let disposed = false;
    let intervalId = null;

    const applyEpoch = (epoch) => {
      if (!epoch) return;
      const applied = localStorage.getItem(LS_GLOBAL_RESET_APPLIED);
      if (applied === epoch) return;
      localStorage.setItem(LS_GLOBAL_RESET_EPOCH, epoch);
      localStorage.setItem(LS_GLOBAL_RESET_APPLIED, epoch);
      clearProgressStorage({ preserveGlobalResetMeta: true });
      window.location.reload();
    };

    const pollGlobalReset = async () => {
      try {
        const res = await fetch('/api/global-reset', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (disposed) return;
        applyEpoch(data?.epoch ? String(data.epoch) : null);
      } catch (_err) {
        // API unavailable (e.g., local dev). Keep local fallback only.
      }
    };

    // Local fallback path for same-browser tab sync.
    const applyLocalFallbackIfNeeded = () => {
      const localEpoch = localStorage.getItem(LS_GLOBAL_RESET_EPOCH);
      if (!localEpoch) return;
      applyEpoch(localEpoch);
    };

    pollGlobalReset();
    intervalId = window.setInterval(pollGlobalReset, 15000);
    applyLocalFallbackIfNeeded();

    const onStorage = (e) => {
      if (e.key === LS_GLOBAL_RESET_EPOCH) applyLocalFallbackIfNeeded();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') pollGlobalReset();
    };

    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      disposed = true;
      if (intervalId) window.clearInterval(intervalId);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    let shakeTimer = null;
    const onEntryOnePicked = () => {
      const scene = document.getElementById('scene');
      if (!scene) return;
      scene.classList.remove('fogbound-screen-shake');
      void scene.offsetWidth;
      scene.classList.add('fogbound-screen-shake');
      clearTimeout(shakeTimer);
      shakeTimer = window.setTimeout(() => {
        scene.classList.remove('fogbound-screen-shake');
      }, 3000);
    };

    window.addEventListener('fogbound-entry1-picked', onEntryOnePicked);
    return () => {
      window.removeEventListener('fogbound-entry1-picked', onEntryOnePicked);
      clearTimeout(shakeTimer);
    };
  }, []);

  return (
    <>
      {!forestEntered && (
        <CabinLanding
          onEnter={() => {
            setForestEntered(true);
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
        />
      )}

      {forestEntered && (
        <button
          className="forest-return"
          type="button"
          onClick={() => {
            setForestEntered(false);
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
        >
          Study
        </button>
      )}

      <MusicToggle />

      {/* ── Ambient overlays (fixed, pointer-events: none) ── */}
      <div id="lantern-glow" aria-hidden="true" />
      <div id="vignette"     aria-hidden="true" />
      <LoopVeil />
      <RedFlash />

      {/* ── HUD ── */}
      <Menu />
      <ProgressBar />

      {/* ── 3D scene ── */}
      <div id="scene">
        <World />
      </div>

      {/* ── Narrative UI ── */}
      <Whisper />
      <EntryOnePrompt />
      <SecretCodePrompt />
      <StoryTeaserSequence />
      <div id="ground-hint" aria-hidden="true">something on the ground…</div>

      {/* ── Scrollable spacer (provides the scroll depth for the scene) ── */}
      <div id="spacer" aria-hidden="true" />

      {/* ── Mobile depth slider control ── */}
      {joystickEnabled && <ScrollBarControl />}

      {/* ── Artifact collect modal ── */}
      <Overlay />
    </>
  );
}
