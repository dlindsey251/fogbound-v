import { useEffect, useRef } from 'react';
import useGameStore from '../store/useGameStore';
import { depthOpacity } from '../utils/depth';

/**
 * Depth thresholds at which whisper text appears.
 * Each entry fires once per loop pass.
 */
const WHISPER_CUES = [
  { depth: 0.08, text: "You shouldn't have come here." },
  { depth: 0.22, text: 'The fog remembers everything.' },
  { depth: 0.38, text: "She's still out there." },
  { depth: 0.52, text: 'Turn back while you can.' },
  { depth: 0.67, text: 'This is where it happened.' },
  { depth: 0.83, text: 'You know the truth now.' },
];

// Post-Entry-1 whispers: imply pre-cabin moments without stating them.
const AFTER_ENTRY_ONE_CUES = [
  { depth: 0.08, text: 'The fog parts just enough.' },
  { depth: 0.22, text: 'Woodsmoke. Close now.' },
  { depth: 0.38, text: 'A shape in the fog: a cabin.' },
  { depth: 0.52, text: 'You hear more than one voice.' },
  { depth: 0.67, text: 'A door opens from inside.' },
  { depth: 0.83, text: 'Oh...' },
];

/** How long (ms) a whisper stays visible */
const WHISPER_DURATION = 4000;
const LOOP_VEIL_FADE_MS = 850;
const LOOP_RESET_DELAY_MS = 1050;
const LOOP_VEIL_HOLD_MS = 900;

/** Depth window around which the ground-hint fades in */
const GROUND_HINT_DEPTH = 0.62;
const GROUND_HINT_WINDOW = 0.07;
const IBIT_UNLOCK_LOOP = 1;
const TURN_BACK_DEPTH = 0.4;
const ESCAPE_DEPTH = 0.18;
const EPS = 0.0008;
const LS_BG_AFTER = 'fogbound_bg_after';
const LS_LOOP_COUNT = 'fogbound_loop_count';
const LS_TURN_BACK_DISABLED = 'fogbound_turn_back_disabled';
const LS_ESCAPE_LINE_SHOWN = 'fogbound_escape_line_shown';
const LS_ENTRY1_OFFER = 'fogbound_entry1_offer';

export function useNarrativeTriggers() {
  const fired = useRef(new Set());
  const whisperTimer = useRef(null);
  const endCodePromptArmed = useRef(true);
  const afterWhispersResetAtStart = useRef(false);
  const prevNorm = useRef(0);
  const turnBackPromptedThisLoop = useRef(false);
  const turnBackLoopRef = useRef(-1);

  useEffect(() => {
    // Cache the ground-hint element once rather than querying the DOM every frame.
    let hintEl = null;

    const unsub = useGameStore.subscribe((state) => {
      const afterSceneReached = localStorage.getItem(LS_BG_AFTER) === '1';
      const turnBackDisabled = localStorage.getItem(LS_TURN_BACK_DISABLED) === '1';
      const {
        currentNorm,
        whispersOn,
        fragments,
        loopCount,
        loopVeilVisible,
        secretCodePromptVisible,
        setWhisperText,
        setSecretCodePromptVisible,
        incrementLoop,
        setLoopVeilVisible,
        setTargetNorm,
      } = state;
      const delta = currentNorm - prevNorm.current;
      const movingForward = delta > EPS;
      const movingBack = delta < -EPS;
      prevNorm.current = currentNorm;
      const effectiveLoops = Math.max(loopCount || 0, Number(localStorage.getItem(LS_LOOP_COUNT) || 0));

      if (turnBackLoopRef.current !== effectiveLoops) {
        turnBackLoopRef.current = effectiveLoops;
        turnBackPromptedThisLoop.current = false;
      }

      // ── Whispers ──────────────────────────────────────────────────────────
      // After Entry 1, loops stop; re-arm after-cues whenever user returns
      // near the start so whispers can play again on the next forward pass.
      if (afterSceneReached) {
        if (currentNorm <= 0.06 && !afterWhispersResetAtStart.current) {
          fired.current.forEach((key) => {
            if (key.startsWith('after-whisper-')) fired.current.delete(key);
          });
          afterWhispersResetAtStart.current = true;
        } else if (currentNorm >= 0.2) {
          afterWhispersResetAtStart.current = false;
        }
      } else {
        afterWhispersResetAtStart.current = false;
      }

      if (whispersOn) {
        const inAfterState = localStorage.getItem(LS_BG_AFTER) === '1';
        const cues = inAfterState ? AFTER_ENTRY_ONE_CUES : WHISPER_CUES;
        const prefix = inAfterState ? 'after' : 'base';

        for (const cue of cues) {
          const key = `${prefix}-whisper-${cue.depth}`;
          if (!fired.current.has(key) && currentNorm >= cue.depth) {
            fired.current.add(key);
            setWhisperText(cue.text);
            clearTimeout(whisperTimer.current);
            whisperTimer.current = setTimeout(() => {
              setWhisperText('');
            }, WHISPER_DURATION);
          }
        }
      }

      // ── Turn-back -> escape -> Entry 1 offer ────────────────────────────
      const entryReady = !afterSceneReached
        && !turnBackDisabled
        && effectiveLoops >= 1
        && !!fragments?.ibit;
      if (
        entryReady
        && !turnBackPromptedThisLoop.current
        && movingForward
        && currentNorm >= TURN_BACK_DEPTH
      ) {
        turnBackPromptedThisLoop.current = true;
        setWhisperText('turn back?');
        clearTimeout(whisperTimer.current);
        whisperTimer.current = setTimeout(() => setWhisperText(''), 3200);
      }
      if (
        entryReady
        && turnBackPromptedThisLoop.current
        && movingBack
        && currentNorm <= ESCAPE_DEPTH
      ) {
        localStorage.setItem(LS_TURN_BACK_DISABLED, '1');
        localStorage.setItem(LS_ENTRY1_OFFER, '1');
        if (localStorage.getItem(LS_ESCAPE_LINE_SHOWN) !== '1') {
          localStorage.setItem(LS_ESCAPE_LINE_SHOWN, '1');
          setWhisperText('The fog thins. Slightly more aware.');
          clearTimeout(whisperTimer.current);
          whisperTimer.current = setTimeout(() => setWhisperText(''), 3000);
        }
        window.dispatchEvent(new CustomEvent('fogbound-entry1-offer'));
      }

      // ── Ground hint (near ibit fragment) ─────────────────────────────────
      if (!hintEl) hintEl = document.getElementById('ground-hint');
      if (hintEl) {
        if (effectiveLoops >= IBIT_UNLOCK_LOOP && !fragments?.ibit) {
          hintEl.style.opacity = depthOpacity(currentNorm, GROUND_HINT_DEPTH, GROUND_HINT_WINDOW);
        } else {
          hintEl.style.opacity = '0';
        }
      }

      // ── End-state secret code prompt (post Entry 1) ──────────────────────
      if (afterSceneReached && currentNorm < 0.95) {
        endCodePromptArmed.current = true;
      }
      if (
        afterSceneReached
        && currentNorm >= 0.99
        && endCodePromptArmed.current
        && !secretCodePromptVisible
      ) {
        endCodePromptArmed.current = false;
        setSecretCodePromptVisible(true);
      }

      // Never show the code UI before the Entry 1 background transition.
      if (!afterSceneReached && secretCodePromptVisible) {
        setSecretCodePromptVisible(false);
      }

      // ── Loop: when depth reaches end, fade to black and reset ────────────
      if (currentNorm >= 0.99 && !fired.current.has('loop') && !loopVeilVisible && !afterSceneReached) {
        fired.current.add('loop');
        setLoopVeilVisible(true);
        incrementLoop();
        localStorage.setItem(LS_LOOP_COUNT, String(effectiveLoops + 1));

        setTimeout(() => {
          window.scrollTo({ top: 0 });
          setTargetNorm(0);
        }, LOOP_RESET_DELAY_MS);

        setTimeout(() => {
          setLoopVeilVisible(false);
          // Clear all per-pass triggers so they fire again on the next loop.
          fired.current.clear();
        }, LOOP_RESET_DELAY_MS + LOOP_VEIL_HOLD_MS + LOOP_VEIL_FADE_MS);
      }
    });

    return () => {
      unsub();
      clearTimeout(whisperTimer.current);
    };
  }, []);
}
