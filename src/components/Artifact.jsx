import { useEffect, useRef } from 'react';
import useGameStore from '../store/useGameStore';
import { trackMetric } from '../utils/metrics';

/** How close (in depth units) the user must be to see an artifact */
const REVEAL_WINDOW = 0.06;
const BEN_SLOW_HINT_MS = 5000;
const LS_BEN_REVEAL_SLOW_SEEN = 'fogbound_ben_reveal_slow_seen';
const LS_BEN_AUTO_OPEN_SEEN = 'fogbound_ben_auto_open_seen';

/**
 * Artifact — an interactive object (fragment or PDF) that becomes
 * visible when the user is within REVEAL_WINDOW of its depth.
 * Disappears permanently once collected.
 *
 * Props:
 *   id        — store key ('ibit' | 'ben')
 *   depth     — normalized depth at which it appears [0, 1]
 *   type      — 'fragment' | 'artifact' (controls CSS class)
 *   onCollect — callback fired when the user clicks it
 *   unlockLoop — minimum loopCount required before artifact can appear
 */
export default function Artifact({ id, depth, type, onCollect, unlockLoop = 0 }) {
  const ref = useRef(null);
  const onCollectRef = useRef(onCollect);
  const reachedRef = useRef(false);
  const collected = useGameStore((s) => s.fragments[id]);

  useEffect(() => {
    onCollectRef.current = onCollect;
  }, [onCollect]);

  useEffect(() => {
    if (collected) return;

    return useGameStore.subscribe((s) => {
      if (!ref.current) return;
      const legacyLoopsRaw = Number(localStorage.getItem('fogbound_loop_count'));
      const legacyLoops = Number.isFinite(legacyLoopsRaw) ? legacyLoopsRaw : 0;
      const effectiveLoops = Math.max(s.loopCount || 0, legacyLoops);
      const unlocked = effectiveLoops >= unlockLoop;
      if (!unlocked) {
        ref.current.style.opacity = '0';
        ref.current.style.pointerEvents = 'none';
        return;
      }
      const dist = Math.abs(s.currentNorm - depth);
      const visible = dist < REVEAL_WINDOW;
      ref.current.style.opacity = visible ? '1' : '0';
      ref.current.style.pointerEvents = visible ? 'auto' : 'none';
      if (id === 'ben' && visible && !reachedRef.current) {
        reachedRef.current = true;
        trackMetric('artifact_reach', { artifactId: 'ben' });
      }
      if (id === 'ben' && visible && localStorage.getItem(LS_BEN_REVEAL_SLOW_SEEN) !== '1') {
        localStorage.setItem(LS_BEN_REVEAL_SLOW_SEEN, '1');
        s.slowDepthFor?.(BEN_SLOW_HINT_MS);
      }
      if (id === 'ben' && visible && localStorage.getItem(LS_BEN_AUTO_OPEN_SEEN) !== '1') {
        localStorage.setItem(LS_BEN_AUTO_OPEN_SEEN, '1');
        onCollectRef.current?.();
      }
    });
  }, [id, depth, collected, unlockLoop]);

  if (collected) return null;

  return (
    <button
      ref={ref}
      id={`${id}-artifact`}
      className={type === 'fragment' ? 'fragment' : 'artifact'}
      data-depth={depth}
      onClick={onCollect}
      aria-label={type === 'fragment' ? "Pick up fragment" : "Read the book"}
      style={{ opacity: 0, pointerEvents: 'none' }}
    />
  );
}
