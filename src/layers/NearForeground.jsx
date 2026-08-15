// ─────────────────────────────────────────────────────────────────────────────
//  NEAR FOREGROUND LAYER
//  In front of the viewer. Strongest parallax shift of any layer.
//  Best for: overhanging branches, close silhouettes, foreground grass edges.
//
//  HOW TO ADD A PNG
//  1. Drop your file into the /public folder (e.g. /public/branch.png)
//  2. Add a line inside the SPRITES array below, like this:
//       { src: '/branch.png', x: 5, y: 10, width: 260 }
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

  // { src: '/branch-left.png',  x:  3, y: 12, width: 280 },
  // { src: '/branch-right.png', x: 97, y:  8, width: 240 },
  // { src: '/grass-edge.png',   x: 50, y: 98, width: 900, opacity: 0.9 },

];

// ─────────────────────────────────────────────────────────────────────────────
//  Do not edit below this line.
// ─────────────────────────────────────────────────────────────────────────────

export default function NearForeground() {
  if (SPRITES.length === 0) return null;

  return (
    <div className="parallax-layer" style={{ transform: 'translateZ(100px)' }} aria-hidden="true">
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
