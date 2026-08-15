import { useEffect } from 'react';
import useGameStore from '../store/useGameStore';

/**
 * Maps window scroll position → targetNorm [0, 1].
 * Works with the 260vh #spacer element that provides scrollable height.
 */
export function useScrollInput() {
  const setTargetNorm = useGameStore((s) => s.setTargetNorm);
  const joystickEnabled = useGameStore((s) => s.joystickEnabled);

  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    // In mobile slider mode, decouple depth from native page scroll entirely.
    if (isMobile && joystickEnabled) return undefined;

    let rafId = 0;
    let queuedY = null;

    const flush = () => {
      rafId = 0;
      const y = queuedY;
      queuedY = null;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return;
      setTargetNorm(y / maxScroll);
    };

    const onScroll = () => {
      queuedY = window.scrollY;
      if (!rafId) rafId = requestAnimationFrame(flush);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    // Prime from current position once on mount.
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [setTargetNorm, joystickEnabled]);

  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const lockNativeScroll = isMobile && joystickEnabled;
    if (!lockNativeScroll) return undefined;

    const nativeScrollSelector = [
      '.scrollbar-control',
      '.cabin-panel',
      '.stripe-checkout-panel',
      '.menu-panel',
      '.overlay-panel',
      'input',
      'textarea',
      'select',
      '[contenteditable="true"]',
    ].join(',');

    const allowsNativeInteraction = (target) => (
      target instanceof Element && Boolean(target.closest(nativeScrollSelector))
    );

    const preventSceneScroll = (e) => {
      if (allowsNativeInteraction(e.target)) return;
      e.preventDefault();
    };

    const preventScrollKeys = (e) => {
      if (allowsNativeInteraction(e.target)) return;
      const key = e.key;
      if (
        key === 'ArrowUp'
        || key === 'ArrowDown'
        || key === 'PageUp'
        || key === 'PageDown'
        || key === 'Home'
        || key === 'End'
        || key === ' '
      ) {
        e.preventDefault();
      }
    };
    const onTouchMoveCapture = (e) => {
      preventSceneScroll(e);
    };

    // Keep the document pinned while mobile slider input drives depth.
    window.scrollTo({ top: 0, behavior: 'auto' });
    document.documentElement.style.overflowY = 'hidden';
    document.body.style.overflowY = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.overscrollBehavior = 'none';

    window.addEventListener('wheel', preventSceneScroll, { passive: false });
    window.addEventListener('touchmove', preventSceneScroll, { passive: false });
    window.addEventListener('keydown', preventScrollKeys, { passive: false });
    document.addEventListener('touchmove', onTouchMoveCapture, { passive: false, capture: true });

    return () => {
      window.removeEventListener('wheel', preventSceneScroll);
      window.removeEventListener('touchmove', preventSceneScroll);
      window.removeEventListener('keydown', preventScrollKeys);
      document.removeEventListener('touchmove', onTouchMoveCapture, true);
      document.documentElement.style.overflowY = '';
      document.body.style.overflowY = '';
      document.documentElement.style.overscrollBehavior = '';
      document.body.style.overscrollBehavior = '';
    };
  }, [joystickEnabled]);
}
