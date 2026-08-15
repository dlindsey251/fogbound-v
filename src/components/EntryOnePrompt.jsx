import { useEffect, useState } from 'react';
import useGameStore from '../store/useGameStore';
import { initAudio, playGrowl } from '../systems/audioSystem';

const LS_ENTRY1_OFFER = 'fogbound_entry1_offer';
const LS_ENTRY1_PICKED = 'fogbound_entry1_picked';
const LS_BG_AFTER = 'fogbound_bg_after';
const LS_MENU_LOCK_AFTER_ENTRY1 = 'fogbound_menu_locked_after_entry1';

export default function EntryOnePrompt() {
  const lowPower = useGameStore((s) => s.lowPower);
  const triggerEntryOneFlash = useGameStore((s) => s.triggerEntryOneFlash);
  const setWhisperText = useGameStore((s) => s.setWhisperText);
  const [visible, setVisible] = useState(
    () => localStorage.getItem(LS_ENTRY1_OFFER) === '1'
      && localStorage.getItem(LS_ENTRY1_PICKED) !== '1'
      && localStorage.getItem(LS_BG_AFTER) !== '1'
  );

  useEffect(() => {
    const refresh = () => {
      setVisible(
        localStorage.getItem(LS_ENTRY1_OFFER) === '1'
          && localStorage.getItem(LS_ENTRY1_PICKED) !== '1'
          && localStorage.getItem(LS_BG_AFTER) !== '1'
      );
    };
    window.addEventListener('fogbound-entry1-offer', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('fogbound-entry1-offer', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  if (!visible) return null;

  const handlePick = () => {
    localStorage.setItem(LS_ENTRY1_PICKED, '1');
    localStorage.setItem(LS_MENU_LOCK_AFTER_ENTRY1, '1');
    localStorage.removeItem(LS_ENTRY1_OFFER);
    initAudio();
    playGrowl(lowPower);
    triggerEntryOneFlash();
    setWhisperText('Another lie has been told...');
    setTimeout(() => setWhisperText(''), 3600);
    setVisible(false);
    // Swap to forest_after during the red event so the transition is hidden.
    setTimeout(() => {
      localStorage.setItem(LS_BG_AFTER, '1');
      window.dispatchEvent(new CustomEvent('fogbound-bg-after-changed'));
      window.dispatchEvent(new CustomEvent('fogbound-entry1-picked'));
    }, 360);
    window.dispatchEvent(new CustomEvent('fogbound-menu-attention', { detail: { target: 'entry1' } }));
  };

  return (
    <button
      id="entry1-prompt"
      onClick={handlePick}
      aria-label="Pick up Entry 1"
    >
      Entry 1 surfaced. Pick it up.
    </button>
  );
}
