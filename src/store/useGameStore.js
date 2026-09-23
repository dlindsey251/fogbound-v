import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Narrative progress is persisted; animation and open-panel state are not.
const useGameStore = create(
  persist(
    (set) => ({
      // ── Depth navigation ─────────────────────────────────────────────────
      // Normalized target and rendered depth.
      targetNorm: 0,
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

      // Collection and presentation are one user action.
      collectAndOpen: (name) =>
        set((s) => ({
          // Pulse the menu the first time an artifact is found.
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

      // Reset story state without changing saved preferences.
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
      partialize: (s) => ({
        fragments: s.fragments,
        escapeTriggered: s.escapeTriggered,
        loopCount: s.loopCount,
      }),
    }
  )
);

export default useGameStore;
