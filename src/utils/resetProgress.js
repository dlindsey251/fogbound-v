export const LS_GLOBAL_RESET_EPOCH = 'fogbound_global_reset_epoch';
export const LS_GLOBAL_RESET_APPLIED = 'fogbound_global_reset_applied_epoch';

const LOCAL_KEYS = [
  'fogbound-state',
  'fogbound_bg_after',
  'fogbound_loop_count',
  'fogbound_turn_back_disabled',
  'fogbound_escape_line_shown',
  'fogbound_entry1_picked',
  'fogbound_entry1_offer',
  'fogbound_ibit_interacted',
  'fogbound_ben_interacted',
  'fogbound_ben_ahead_disabled',
  'fogbound_momentary_escape_shown',
  'fogbound_ibit_full',
  'fogbound_ibit_menu_reveal',
  'fogbound_menu_locked_after_entry1',
  'fogbound_artifact_email_prompt_suppressed',
  'fogbound_scrollbar_hint_seen',
  'fogbound_ben_reveal_slow_seen',
  'fogbound_ben_auto_open_seen',
  'fogbound_has_visited',
];

const SESSION_KEYS = [
  'fogbound-menu-unlocked-session',
];

export function clearProgressStorage({ preserveGlobalResetMeta = true } = {}) {
  LOCAL_KEYS.forEach((k) => localStorage.removeItem(k));
  SESSION_KEYS.forEach((k) => sessionStorage.removeItem(k));

  if (!preserveGlobalResetMeta) {
    localStorage.removeItem(LS_GLOBAL_RESET_EPOCH);
    localStorage.removeItem(LS_GLOBAL_RESET_APPLIED);
  }
}
