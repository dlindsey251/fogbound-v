import { useEffect, useRef } from 'react';
import useGameStore from '../store/useGameStore';
import { depthOpacity } from '../utils/depth';

/** Depth window (±) within which a memory is visible */
const WINDOW = 0.09;

/**
 * Memory — a narrative text fragment that fades in when currentNorm
 * is within WINDOW of its `depth` prop, then fades out again.
 */
export default function Memory({ text, depth, className }) {
  const ref = useRef(null);
  const ibitCollected = useGameStore((s) => s.fragments?.ibit);
  const hideAfterIbit = text.trim().toLowerCase() === 'down…' || text.trim().toLowerCase() === 'down...';

  useEffect(() => {
    return useGameStore.subscribe((s) => {
      if (!ref.current) return;
      ref.current.style.opacity = depthOpacity(s.currentNorm, depth, WINDOW);
    });
  }, [depth]);

  if (hideAfterIbit && ibitCollected) return null;

  return (
    <div ref={ref} className={`memory ${className}`} data-depth={depth} aria-live="polite">
      {text}
    </div>
  );
}
