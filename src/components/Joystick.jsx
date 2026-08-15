import { useRef, useEffect, useState } from 'react';
import useGameStore from '../store/useGameStore';
import { initAudio } from '../systems/audioSystem';

const BASE_RADIUS = 50;   // px — half of the joystick base diameter
const KNOB_CLAMP  = 40;   // px — max knob travel from centre
const TICK_MS     = 16;   // ~60 fps update interval

/**
 * Joystick — an on-screen virtual joystick for mobile navigation.
 * Hidden on desktop via CSS media query.
 *
 * Dragging the knob up/down adjusts targetNorm continuously while held.
 * Releasing the knob snaps it back to centre and stops movement.
 *
 * Also calls initAudio() on first touch to satisfy browser autoplay policy.
 */
export default function Joystick() {
  const setTargetNorm = useGameStore((s) => s.setTargetNorm);
  const [knobY, setKnobY] = useState(0);

  const baseRef    = useRef(null);
  const deltaRef   = useRef(0);   // current y-delta from drag
  const intervalRef = useRef(null);
  const activeRef  = useRef(false);

  useEffect(() => {
    const base = baseRef.current;
    if (!base) return;

    const onTouchStart = (e) => {
      initAudio(); // unlock audio on first gesture
      activeRef.current = true;
      const startY = e.touches[0].clientY;

      const onTouchMove = (ev) => {
        if (!activeRef.current) return;
        const dy = ev.touches[0].clientY - startY;
        const clamped = Math.max(-KNOB_CLAMP, Math.min(KNOB_CLAMP, dy));
        deltaRef.current = clamped;
        setKnobY(clamped);
      };

      const onTouchEnd = () => {
        activeRef.current = false;
        deltaRef.current = 0;
        setKnobY(0);
        clearInterval(intervalRef.current);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
      };

      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', onTouchEnd, { once: true });

      // Continuously nudge targetNorm while the knob is held
      intervalRef.current = setInterval(() => {
        if (!activeRef.current) return;
        const step = (deltaRef.current / KNOB_CLAMP) * 0.006;
        const { targetNorm } = useGameStore.getState();
        setTargetNorm(targetNorm + step);
      }, TICK_MS);
    };

    base.addEventListener('touchstart', onTouchStart, { passive: true });
    return () => {
      base.removeEventListener('touchstart', onTouchStart);
      clearInterval(intervalRef.current);
    };
  }, [setTargetNorm]);

  return (
    <div className="joystick-container" aria-hidden="true">
      <div
        className="joystick-base"
        ref={baseRef}
        style={{ width: BASE_RADIUS * 2, height: BASE_RADIUS * 2 }}
      >
        <div
          className="joystick-knob"
          style={{ transform: `translateY(${knobY}px)` }}
        />
      </div>
    </div>
  );
}
