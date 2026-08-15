import { useEffect, useRef } from 'react';
import useGameStore from '../store/useGameStore';

/**
 * ProgressBar — thin line at the bottom of the viewport showing
 * how far through the scene the user has traveled.
 * Reads currentNorm from the store and applies width directly to
 * the fill element to avoid re-renders on every frame.
 */
export default function ProgressBar() {
  const fillRef = useRef(null);

  useEffect(() => {
    return useGameStore.subscribe((s) => {
      if (fillRef.current) {
        fillRef.current.style.width = `${s.currentNorm * 100}%`;
      }
    });
  }, []);

  return (
    <div id="progress" aria-hidden="true">
      <div id="progress-fill" ref={fillRef} />
    </div>
  );
}
