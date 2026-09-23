
import { useEffect, useState } from 'react';

const SPRITES = [

   { src: '/fog-forest-cinematic.png',      fullscreen: true    },

];


export default function DeepBackground() {
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

  if (SPRITES.length === 0) return null;

  return (
    <div
      className="parallax-layer"
      style={{ transform: 'translateZ(-520px) scale(1.58)' }}
      aria-hidden="true"
    >
      {SPRITES.map((s, i) => (
        <img
          key={i}
          src={after && s.src === '/fog-forest-cinematic.png' ? '/fog-forest-after-cabin-cinematic.png' : s.src}
          alt=""
          draggable={false}
          className={s.fullscreen ? 'layer-sprite-fullscreen' : 'layer-sprite'}
          style={s.fullscreen
            ? { opacity: s.opacity ?? 1, objectFit: s.fit ?? 'cover' }
            : { left: `${s.x}%`, top: `${s.y}%`, width: s.width ?? 100, opacity: s.opacity ?? 1 }
          }
        />
      ))}
    </div>
  );
}
