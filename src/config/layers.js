/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  FOGBOUND — LAYER SPRITE DICTIONARY
 *  src/config/layers.js
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  HOW TO ADD A PNG TO THE SCENE
 *  ─────────────────────────────
 *  1. Drop your PNG into the  /public  folder (same place as forest.jpg).
 *  2. Find the layer below where you want it to live.
 *  3. Add one object to that layer's array, like this:
 *
 *       { src: '/my-image.png', x: 50, y: 60, width: 120 }
 *
 *  That's it. Save the file and the image appears in the scene.
 *
 *
 *  COORDINATE GUIDE
 *  ─────────────────
 *   x  →  0 = far left edge of screen      50 = center      100 = far right
 *   y  →  0 = top edge of screen           50 = middle      100 = bottom
 *
 *   The x/y point is the CENTER of the image, so x:50 y:50 puts the middle
 *   of your PNG exactly in the middle of the screen.
 *
 *
 *  PROPERTY REFERENCE
 *  ───────────────────
 *   src     (required) — path to your PNG.  Must start with /
 *                        e.g.  '/fog-patch.png'
 *
 *   x       (required) — horizontal position, 0–100
 *
 *   y       (required) — vertical position, 0–100
 *
 *   width   (optional) — width of the image in pixels. Default: 100
 *                        Height scales automatically to keep proportions.
 *
 *   opacity (optional) — transparency, 0.0 (invisible) to 1.0 (solid).
 *                        Default: 1.0
 *
 *   label   (optional) — a note to yourself about what this image is.
 *                        Does not appear on screen.
 *
 *
 *  LAYER DEPTH GUIDE
 *  ──────────────────
 *   Think of the layers like panels in a shadow box, stacked front-to-back.
 *   Objects in back layers appear smaller and barely move when you scroll.
 *   Objects in front layers appear larger and shift more dramatically.
 *
 *   LAYER             DEPTH    BEST USED FOR
 *   ───────────────────────────────────────────────────────────────────────
 *   deepBackground    far      Distant silhouettes, far tree lines, sky shapes
 *   midBackground     medium   Mid-distance trees, rocks, structures
 *   nearFog           medium   Fog wisps, haze patches, near shrubs
 *   ground            close    Path objects, roots, leaves, small items
 *   scene             viewer   Key story objects, characters, artifacts
 *   nearForeground    front    Overhanging branches, foreground silhouettes
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const LAYER_SPRITES = {

  // ── Deep Background ────────────────────────────────────────────────────
  // Furthest away. Barely moves when scrolling.
  // Good for: distant trees, far-off shapes, horizon objects.
  deepBackground: [
    // { src: '/distant-tree.png', x: 15, y: 70, width: 180, label: 'far left tree' },
    // { src: '/distant-tree.png', x: 85, y: 68, width: 150, label: 'far right tree' },
  ],

  // ── Mid Background ──────────────────────────────────────────────────────
  // Middle distance. Moves slowly.
  // Good for: mid-range trees, rock formations, wooden structures.
  midBackground: [
    // { src: '/oak.png', x: 22, y: 65, width: 200, label: 'left oak' },
    // { src: '/oak.png', x: 78, y: 63, width: 160, label: 'right oak' },
  ],

  // ── Near Fog ────────────────────────────────────────────────────────────
  // Close fog plane. Moderate movement.
  // Good for: fog patches, near bushes, low haze layers.
  nearFog: [
    // { src: '/fog-wisp.png', x: 30, y: 80, width: 300, opacity: 0.6, label: 'left wisp' },
    // { src: '/fog-wisp.png', x: 70, y: 78, width: 260, opacity: 0.5, label: 'right wisp' },
  ],

  // ── Ground ──────────────────────────────────────────────────────────────
  // On or near the ground path. Closer than fog.
  // Good for: roots, stones, leaves, footprints, small clues.
  ground: [
    // { src: '/root.png',  x: 40, y: 78, width: 90,  label: 'gnarled root' },
    // { src: '/stone.png', x: 58, y: 80, width: 55,  label: 'wet stone' },
  ],

  // ── Scene (Viewer Level) ────────────────────────────────────────────────
  // Same depth as the viewer — no parallax shift on this layer.
  // Good for: key story objects, characters, interactive hints, signs.
  scene: [
    // { src: '/lantern-post.png', x: 50, y: 55, width: 60, label: 'lantern post' },
    // { src: '/figure.png',       x: 35, y: 50, width: 80, label: 'distant figure' },
  ],

  // ── Near Foreground ─────────────────────────────────────────────────────
  // In front of the viewer. Creates the strongest parallax shift.
  // Good for: overhanging branches, foreground grass, silhouetted shapes.
  nearForeground: [
    // { src: '/branch-left.png',  x: 5,  y: 15, width: 250, label: 'left branch' },
    // { src: '/branch-right.png', x: 95, y: 20, width: 200, label: 'right branch' },
  ],

};
