// ─────────────────────────────────────────────────────────────────────────────
//  NEAR FOG LAYER
//  Closer fog plane. Moderate scroll movement.
//  Best for: fog patches, haze wisps, near shrubs, low ground cover.
//
//  HOW TO ADD A PNG
//  1. Drop your file into the /public folder (e.g. /public/fog-wisp.png)
//  2. Add a line inside the SPRITES array below, like this:
//       { src: '/fog-wisp.png', x: 30, y: 80, width: 300, opacity: 0.6 }
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

  // { src: '/fog-wisp.png', x: 25, y: 78, width: 340, opacity: 0.55 },
  // { src: '/fog-wisp.png', x: 75, y: 76, width: 280, opacity: 0.45 },
  // { src: '/bush.png',     x: 10, y: 80, width: 130 },

];

// ─────────────────────────────────────────────────────────────────────────────
//  Do not edit below this line.
// ─────────────────────────────────────────────────────────────────────────────

export default function NearFog() {
  if (SPRITES.length === 0) return null;

  return (
    <div className="parallax-layer" style={{ transform: 'translateZ(-80px)' }} aria-hidden="true">
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
