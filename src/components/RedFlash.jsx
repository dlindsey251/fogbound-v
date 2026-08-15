import { useEffect, useRef } from 'react';
import useGameStore from '../store/useGameStore';

const ENTRY_ONE_SHAKE_MS = 3000;
const RED_COVER_EXTRA_MS = 250;
const RED_FADE_MS = 2400;

/**
 * RedFlash — a full-screen red pulse tied to Entry 1 being triggered.
 * Subscribes to a dedicated store tick rather than loopCount.
 */
export default function RedFlash() {
  const ref = useRef(null);
  const prevTick = useRef(useGameStore.getState().entryOneFlashTick);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const unsub = useGameStore.subscribe((s) => {
      if (s.entryOneFlashTick > prevTick.current) {
        prevTick.current = s.entryOneFlashTick;
        if (!ref.current) return;
        ref.current.style.transition = 'none';
        ref.current.style.opacity = '0.85';
        void ref.current.offsetWidth;
        ref.current.style.transition = `opacity ${RED_FADE_MS}ms ease-out`;
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          if (ref.current) ref.current.style.opacity = '0';
        }, ENTRY_ONE_SHAKE_MS + RED_COVER_EXTRA_MS);
      }
    });

    return () => {
      unsub();
      clearTimeout(timeoutRef.current);
    };
  }, []);

  return <div id="red-flash" ref={ref} aria-hidden="true" />;
}
