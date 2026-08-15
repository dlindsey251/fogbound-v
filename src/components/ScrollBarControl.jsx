import { useEffect, useRef, useState } from 'react';
import useGameStore from '../store/useGameStore';
import { initAudio } from '../systems/audioSystem';

const LS_SCROLLBAR_HINT_SEEN = 'fogbound_scrollbar_hint_seen';

export default function ScrollBarControl() {
  const setTargetNorm = useGameStore((s) => s.setTargetNorm);
  const targetNorm = useGameStore((s) => s.targetNorm);
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [hintVisible, setHintVisible] = useState(
    () => localStorage.getItem(LS_SCROLLBAR_HINT_SEEN) !== '1'
  );
  const draggingRef = useRef(false);
  const touchIdRef = useRef(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    const applyFromY = (clientY) => {
      const rect = track.getBoundingClientRect();
      const y = clamp(clientY - rect.top, 0, rect.height);
      const t = rect.height > 0 ? y / rect.height : 0;
      // Top = deepest layer, bottom = nearest layer.
      setTargetNorm(1 - t);
    };

    const markHintSeen = () => {
      localStorage.setItem(LS_SCROLLBAR_HINT_SEEN, '1');
      setHintVisible(false);
    };

    const onPointerDown = (e) => {
      e.preventDefault();
      initAudio();
      markHintSeen();
      draggingRef.current = true;
      setDragging(true);
      applyFromY(e.clientY);
    };

    const onPointerMove = (e) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      applyFromY(e.clientY);
    };

    const onPointerUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
    };

    const touchYById = (e) => {
      const id = touchIdRef.current;
      if (id == null) return e.touches?.[0]?.clientY ?? e.changedTouches?.[0]?.clientY;
      const fromTouches = [...(e.touches || [])].find((t) => t.identifier === id);
      if (fromTouches) return fromTouches.clientY;
      const fromChanged = [...(e.changedTouches || [])].find((t) => t.identifier === id);
      return fromChanged?.clientY;
    };
    const onTouchStart = (e) => {
      e.preventDefault();
      initAudio();
      markHintSeen();
      touchIdRef.current = e.changedTouches?.[0]?.identifier ?? null;
      draggingRef.current = true;
      setDragging(true);
      const y = touchYById(e);
      if (typeof y === 'number') applyFromY(y);
    };
    const onTouchMove = (e) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      const y = touchYById(e);
      if (typeof y === 'number') applyFromY(y);
    };
    const onTouchEnd = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      touchIdRef.current = null;
      setDragging(false);
    };

    track.addEventListener('pointerdown', onPointerDown);
    track.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      track.removeEventListener('pointerdown', onPointerDown);
      track.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      document.removeEventListener('touchmove', onTouchMove, true);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [setTargetNorm]);

  return (
    <div className={`scrollbar-control ${dragging ? 'is-active' : ''}`} aria-hidden="true">
      {hintVisible && (
        <div className="scrollbar-hint">
          <span className="scrollbar-hint-label">scroll bar</span>
          <span className="scrollbar-hint-arrow" />
          <span className="scrollbar-hint-dot" />
        </div>
      )}
      <div className="scrollbar-track" ref={trackRef}>
        <div
          className={`scrollbar-thumb ${dragging ? 'is-dragging' : ''}`}
          style={{ top: `${(1 - targetNorm) * 100}%` }}
        />
      </div>
    </div>
  );
}
