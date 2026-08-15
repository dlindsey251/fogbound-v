import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Global state store for the Fogbound experience.
 *
 * Persisted keys (localStorage): fragments, escapeTriggered, loopCount
 * Transient keys: targetNorm, currentNorm, depthSlowUntilTs, whispersOn, lowPower, activeOverlay, activeOverlaySource, whisperText, loopVeilVisible, entryOneFlashTick, pendingMenuPulseOverlay, menuAttentionTarget, secretCodePromptVisible, secretCodeSolved, storyTeaserTick
 */
const useGameStore = create(
  persist(
    (set) => ({
      // ── Depth navigation ─────────────────────────────────────────────────
      // targetNorm: desired depth [0, 1], set by scroll or joystick
      targetNorm: 0,
      // currentNorm: smoothed depth written by the RAF loop in World
      currentNorm: 0,
      depthSlowUntilTs: 0,

      // ── Loop system ───────────────────────────────────────────────────────
      loopCount: 0,
      loopVeilVisible: false,

      // ── User settings ─────────────────────────────────────────────────────
      whispersOn: true,
      lowPower: false,
      joystickEnabled: true,

      // ── Narrative state ───────────────────────────────────────────────────
      escapeTriggered: false,

      // ── Collected fragments ───────────────────────────────────────────────
      // ibit: Ibit's Fragment (depth 0.34)
      // ben:  Ben's Story / PDF artifact (depth 0.74)
      fragments: {
        ibit: false,
        ben: false,
      },

      // ── UI ────────────────────────────────────────────────────────────────
      activeOverlay: null, // 'ibit' | 'ben' | 'entry1' | null
      activeOverlaySource: null, // 'pickup' | 'menu' | null
      whisperText: '',
      entryOneFlashTick: 0,
      pendingMenuPulseOverlay: null,
      menuAttentionTarget: null,
      secretCodePromptVisible: false,
      secretCodeSolved: false,
      storyTeaserTick: 0,

      // ── Actions ───────────────────────────────────────────────────────────
      setTargetNorm: (value) =>
        set({ targetNorm: Math.max(0, Math.min(1, value)) }),

      setCurrentNorm: (value) =>
        set({ currentNorm: value }),

      slowDepthFor: (durationMs) =>
        set({ depthSlowUntilTs: performance.now() + Math.max(0, durationMs) }),

      incrementLoop: () =>
        set((s) => ({ loopCount: s.loopCount + 1 })),

      setLoopVeilVisible: (visible) =>
        set({ loopVeilVisible: visible }),

      toggleWhispers: () =>
        set((s) => ({ whispersOn: !s.whispersOn })),

      toggleLowPower: () =>
        set((s) => ({ lowPower: !s.lowPower })),

      toggleJoystick: () =>
        set((s) => ({ joystickEnabled: !s.joystickEnabled })),

      triggerEscape: () =>
        set({ escapeTriggered: true }),

      collectFragment: (name) =>
        set((s) => ({ fragments: { ...s.fragments, [name]: true } })),

      // Atomically mark a fragment collected and open its overlay — these
      // two operations are always paired, so keeping them together avoids
      // the two-call pattern at every call site.
      collectAndOpen: (name) =>
        set((s) => ({
          // Queue a menu pulse only for first-time interaction with this artifact.
          pendingMenuPulseOverlay: s.fragments[name] ? s.pendingMenuPulseOverlay : name,
          fragments: { ...s.fragments, [name]: true },
          activeOverlay: name,
          activeOverlaySource: 'pickup',
          entryOneFlashTick: s.entryOneFlashTick,
        })),

      setActiveOverlay: (overlay, source = 'menu') =>
        set({ activeOverlay: overlay, activeOverlaySource: source }),

      dismissOverlay: () =>
        set((s) => ({
          activeOverlay: null,
          activeOverlaySource: null,
          menuAttentionTarget:
            s.activeOverlay && s.pendingMenuPulseOverlay === s.activeOverlay
              ? s.activeOverlay
              : s.menuAttentionTarget,
          pendingMenuPulseOverlay:
            s.activeOverlay && s.pendingMenuPulseOverlay === s.activeOverlay
              ? null
              : s.pendingMenuPulseOverlay,
        })),

      clearMenuAttention: () =>
        set({ menuAttentionTarget: null }),

      triggerMenuAttention: (target) =>
        set({ menuAttentionTarget: target }),

      setWhisperText: (text) =>
        set({ whisperText: text }),

      setSecretCodePromptVisible: (visible) =>
        set({ secretCodePromptVisible: visible }),

      setSecretCodeSolved: (solved) =>
        set({ secretCodeSolved: solved }),

      triggerStoryTeaser: () =>
        set((s) => ({ storyTeaserTick: s.storyTeaserTick + 1 })),

      triggerEntryOneFlash: () =>
        set((s) => ({ entryOneFlashTick: s.entryOneFlashTick + 1 })),

      // Local testing reset: clears narrative progress and transient scene state
      // without changing global app code or server data (everything is local).
      resetForTesting: () =>
        set((s) => ({
          targetNorm: 0,
          currentNorm: 0,
          depthSlowUntilTs: 0,
          loopCount: 0,
          loopVeilVisible: false,
          whispersOn: s.whispersOn,
          lowPower: s.lowPower,
          joystickEnabled: s.joystickEnabled,
          escapeTriggered: false,
          fragments: {
            ibit: false,
            ben: false,
          },
          activeOverlay: null,
          activeOverlaySource: null,
          whisperText: '',
          entryOneFlashTick: 0,
          pendingMenuPulseOverlay: null,
          menuAttentionTarget: null,
          secretCodePromptVisible: false,
          secretCodeSolved: false,
          storyTeaserTick: 0,
        })),
    }),
    {
      name: 'fogbound-state',
      // Only persist narrative progress — not transient animation state
      partialize: (s) => ({
        fragments: s.fragments,
        escapeTriggered: s.escapeTriggered,
        loopCount: s.loopCount,
      }),
    }
  )
);

export default useGameStore;
