/**
 * FogLayer — an atmospheric mid-ground layer.
 * Pass `layerClass` as "layer1" or "layer2"; CSS positions each at
 * a different Z depth so they drift at distinct parallax rates.
 */
export default function FogLayer({ layerClass }) {
  return (
    <div className={`fog-layer ${layerClass}`} aria-hidden="true">
      <div className="fog-drift" />
    </div>
  );
}
