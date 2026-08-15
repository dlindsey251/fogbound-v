import { LAYER_SPRITES } from '../config/layers';

/**
 * How far back (or forward) each named layer sits in 3D space.
 * These Z values match the existing fog/foreground layers so sprites
 * sit naturally on the same plane as those elements.
 *
 * Negative = further away (moves less when scrolling)
 * Positive = closer to viewer (moves more when scrolling)
 */
const LAYER_Z = {
  deepBackground:  -400,
  midBackground:   -200,
  nearFog:          -80,
  ground:           -50,
  scene:              0,
  nearForeground:   100,
};

/**
 * SpriteGroup — renders all PNG sprites for one depth layer.
 * Each sprite is absolutely positioned using the x/y percentages from
 * the config, centered on that coordinate point.
 */
function SpriteGroup({ layerName, z }) {
  const sprites = LAYER_SPRITES[layerName];
  if (!sprites || sprites.length === 0) return null;

  return (
    <div
      className="sprite-group"
      style={{ transform: `translateZ(${z}px)` }}
      aria-hidden="true"
    >
      {sprites.map((sprite, index) => (
        <img
          key={sprite.label ?? `${layerName}-${index}`}
          src={sprite.src}
          alt=""
          draggable={false}
          style={{
            position:      'absolute',
            left:          `${sprite.x}%`,
            top:           `${sprite.y}%`,
            width:         sprite.width ?? 100,
            opacity:       sprite.opacity ?? 1,
            // Shift the image so x/y points to the CENTER of the image,
            // not the top-left corner. Makes positioning more intuitive.
            transform:     'translate(-50%, -50%)',
            pointerEvents: 'none',
            userSelect:    'none',
          }}
        />
      ))}
    </div>
  );
}

/**
 * SceneSprites — renders all layers defined in src/config/layers.js.
 * Drop this once inside <World> and it handles everything automatically.
 * To add new images, only edit layers.js — never this file.
 */
export default function SceneSprites() {
  return (
    <>
      {Object.entries(LAYER_Z).map(([layerName, z]) => (
        <SpriteGroup key={layerName} layerName={layerName} z={z} />
      ))}
    </>
  );
}
