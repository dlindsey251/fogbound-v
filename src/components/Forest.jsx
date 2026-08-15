import { useEffect, useState } from 'react';

/**
 * Forest — deepest background layer.
 * CSS places it at translateZ(-520px) scale(1.58) so it barely moves
 * when the world container is pushed forward, creating the parallax effect.
 */
export default function Forest() {
  const [after, setAfter] = useState(() => localStorage.getItem('fogbound_bg_after') === '1');

  useEffect(() => {
    const sync = (e) => {
      if (e?.type === 'fogbound-entry1-picked') {
        localStorage.setItem('fogbound_bg_after', '1');
      }
      setAfter(localStorage.getItem('fogbound_bg_after') === '1');
    };
    window.addEventListener('fogbound-bg-after-changed', sync);
    window.addEventListener('fogbound-entry1-picked', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('fogbound-bg-after-changed', sync);
      window.removeEventListener('fogbound-entry1-picked', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return (
    <div
      id="forest"
      aria-hidden="true"
      style={{ backgroundImage: `url('${after ? '/fog-forest-after-cabin-cinematic.png' : '/fog-forest-cinematic.png'}')` }}
    />
  );
}
