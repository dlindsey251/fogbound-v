/**
 * Lantern — a subtle light source at the viewer's position.
 * The local glow pulses via CSS animation; the cone fades downward.
 */
export default function Lantern() {
  return (
    <div id="lantern" aria-hidden="true">
      <div className="lantern-local-glow" />
      <div className="lantern-cone" />
    </div>
  );
}
