/**
 * Returns a CSS opacity string [0, 1] based on how close `currentNorm` is
 * to `targetDepth`. Full opacity at exact match, linear fade to '0' at
 * the edge of `window`.
 *
 * Used by Memory.jsx and useNarrativeTriggers to share the same fade formula.
 */
export function depthOpacity(currentNorm, targetDepth, window) {
  const dist = Math.abs(currentNorm - targetDepth);
  return dist < window ? String(Math.max(0, 1 - dist / window)) : '0';
}
