// ─────────────────────────────────────────────────────────────────────────────
//  GROUND LAYER
//  On or near the path. Visible parallax movement.
//  Best for: roots, stones, puddles, leaves, small clues, footprints.
//
//  HOW TO ADD A PNG
//  1. Drop your file into the /public folder (e.g. /public/stone.png)
//  2. Add a line inside the SPRITES array below, like this:
//       { src: '/stone.png', x: 55, y: 78, width: 60 }
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

const SPRITES = [

  // { src: '/root.png',     x: 38, y: 76, width: 110 },
  // { src: '/stone.png',    x: 55, y: 79, width:  60 },
  // { src: '/mudprint.png', x: 49, y: 82, width:  45, opacity: 0.7 },

];

// ─────────────────────────────────────────────────────────────────────────────
//  Do not edit below this line.
// ─────────────────────────────────────────────────────────────────────────────

export default function Ground() {
  if (SPRITES.length === 0) return null;

  return (
    <div className="parallax-layer" style={{ transform: 'translateZ(-50px)' }} aria-hidden="true">
      {SPRITES.map((s, i) => (
        <img
          key={i}
          src={s.src}
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
