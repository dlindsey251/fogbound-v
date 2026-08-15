// ─────────────────────────────────────────────────────────────────────────────
//  SCENE LAYER  (viewer level — z = 0)
//  The same depth as the viewer. No parallax drift on this plane.
//  Best for: key story objects, characters, signs, lantern posts, props.
//
//  HOW TO ADD A PNG
//  1. Drop your file into the /public folder (e.g. /public/figure.png)
//  2. Add a line inside the SPRITES array below, like this:
//       { src: '/figure.png', x: 35, y: 52, width: 80 }
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

  // { src: '/post.png',   x: 50, y: 55, width:  50 },
  // { src: '/figure.png', x: 35, y: 52, width:  80, opacity: 0.8 },
  // { src: '/sign.png',   x: 62, y: 60, width: 100 },

];

// ─────────────────────────────────────────────────────────────────────────────
//  Do not edit below this line.
// ─────────────────────────────────────────────────────────────────────────────

export default function Scene() {
  if (SPRITES.length === 0) return null;

  return (
    <div className="parallax-layer" style={{ transform: 'translateZ(0px)' }} aria-hidden="true">
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
