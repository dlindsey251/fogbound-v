// ─────────────────────────────────────────────────────────────────────────────
//  DEEP BACKGROUND LAYER
//  The furthest layer from the viewer. Barely moves when scrolling.
//  Best for: distant tree lines, far-off structures, horizon shapes, mist.
//
//  HOW TO ADD A PNG
//  1. Drop your file into the /public folder (e.g. /public/far-tree.png)
//  2. Add a line inside the SPRITES array below, like this:
//       { src: '/far-tree.png', x: 20, y: 65, width: 180 }
//  3. Save. Done.
//
//  COORDINATES  (x and y are percentages of the screen)
//    x →  0 = left edge     50 = center     100 = right edge
//    y →  0 = top edge      50 = middle     100 = bottom edge
//    The x/y point lands at the CENTER of your image.
//
//  PROPERTIES
//    src        — '/filename.png'  (must start with /)
//    x          — left ↔ right position  (0–100)
//    y          — top ↔ bottom position  (0–100)
//    width      — width in pixels  (height scales automatically)  default: 100
//    opacity    — 0.0 invisible → 1.0 fully solid               default: 1
//    fullscreen — true = image fills this entire layer plane     default: false
//                 (x, y, and width are ignored when fullscreen)
//    fit        — when fullscreen: 'cover' or 'contain'          default: 'cover'
//                 cover   = fills the plane, may crop edges
//                 contain = fits inside the plane, may show gaps
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

const SPRITES = [

  // { src: '/far-tree.png',      x: 12, y: 68, width: 200 },
   { src: '/fog-forest-cinematic.png',      fullscreen: true    },
  // { src: '/distant-hill.png',  x: 50, y: 72, width: 600 },

];

// ─────────────────────────────────────────────────────────────────────────────
//  Do not edit below this line.
// ─────────────────────────────────────────────────────────────────────────────

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
