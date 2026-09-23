import { useRef, useEffect } from 'react';
import useGameStore from '../store/useGameStore';
import Forest from './Forest';
import FogLayer from './FogLayer';
import Memory from './Memory';
import Artifact from './Artifact';
import DeepBackground  from '../layers/DeepBackground';
import MidBackground   from '../layers/MidBackground';
import NearFog         from '../layers/NearFog';
import Ground          from '../layers/Ground';
import Scene           from '../layers/Scene';
import NearForeground  from '../layers/NearForeground';
import { trackMetric } from '../utils/metrics';

/**
 * Maximum translateZ applied to #world as currentNorm goes 0 → 1.
 * At 400 px the forest (at z=-520) effectively moves to z=-120,
 * while foreground fog (at z=100) surges to z=500 — good parallax spread.
 */
const MAX_TZ = 400;
const IBIT_UNLOCK_LOOP = 1;

/**
 * World — the 3D scene container.
 *
 * Runs its own requestAnimationFrame loop to smoothly interpolate
 * currentNorm → targetNorm and apply the translateZ transform directly
 * to the DOM (avoids React re-renders every frame).
 * Also writes currentNorm back to the store so child components and
 * narrative triggers can read it.
 */
export default function World() {
  const worldRef = useRef(null);
  const normRef = useRef(0);
  const rafRef = useRef(null);
  const lastReportedRef = useRef(0);
  const lastReportTsRef = useRef(0);
  const isMobileRef = useRef(window.matchMedia('(max-width: 768px)').matches);

  const collectAndOpen = useGameStore((s) => s.collectAndOpen);
  const setCurrentNorm = useGameStore((s) => s.setCurrentNorm);

  // Smooth the requested depth inside the render loop.
  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const onMediaChange = (e) => {
      isMobileRef.current = e.matches;
    };
    if (media.addEventListener) media.addEventListener('change', onMediaChange);
    else media.addListener(onMediaChange);

    const tick = () => {
      const { targetNorm, lowPower, depthSlowUntilTs } = useGameStore.getState();
      const isMobile = isMobileRef.current;
      const slowActive = performance.now() < (depthSlowUntilTs || 0);
      const speed = slowActive ? 0.006 : (lowPower ? 0.018 : (isMobile ? 0.04 : 0.045));

      normRef.current += (targetNorm - normRef.current) * speed;

      if (worldRef.current) {
        worldRef.current.style.transform = `translateZ(${normRef.current * MAX_TZ}px)`;
      }

      // Depth controls glow strength; CSS controls placement.
      const depth = Math.max(0, Math.min(1, normRef.current));
      const afterScene = localStorage.getItem('fogbound_bg_after') === '1';
      const glowScale = (isMobile ? 0.62 : 0.68) + depth * (isMobile ? 0.58 : 0.52);
      const glowAlpha = (afterScene ? 0.38 : 0.28) + depth * (afterScene ? 0.34 : 0.28);
      const rootStyle = document.documentElement.style;
      rootStyle.setProperty('--lantern-depth-scale', glowScale.toFixed(3));
      rootStyle.setProperty('--lantern-glow-alpha', glowAlpha.toFixed(3));

      // Limit mobile store writes to reduce frame drops.
      const now = performance.now();
      if (!isMobile) {
        setCurrentNorm(normRef.current);
        lastReportedRef.current = normRef.current;
        lastReportTsRef.current = now;
      } else {
        const drift = Math.abs(normRef.current - lastReportedRef.current);
        if (drift >= 0.003 || now - lastReportTsRef.current >= 34) {
          setCurrentNorm(normRef.current);
          lastReportedRef.current = normRef.current;
          lastReportTsRef.current = now;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      const rootStyle = document.documentElement.style;
      rootStyle.removeProperty('--lantern-depth-scale');
      rootStyle.removeProperty('--lantern-glow-alpha');
      if (media.removeEventListener) media.removeEventListener('change', onMediaChange);
      else media.removeListener(onMediaChange);
    };
  }, [setCurrentNorm]);

  const handleIbit = () => {
    collectAndOpen('ibit');
    trackMetric('artifact_collect', { artifactId: 'ibit' });
    window.dispatchEvent(new CustomEvent('fogbound-artifact-collected', { detail: { id: 'ibit' } }));
  };

  return (
    <div id="world" ref={worldRef}>

      <Forest />

      <DeepBackground />

      <MidBackground />

      <FogLayer layerClass="layer1" />

      <NearFog />

      <FogLayer layerClass="layer2" />

      <Ground />

      <Scene />

      <div className="foreground fg2" aria-hidden="true" />
      <div className="path"          aria-hidden="true" />

      <NearForeground />

      <Memory text="Down…" depth={0.20} className="intro" />
      <Memory text="The first lie was told out of love." depth={0.58} className="hook" />

      <Artifact id="ibit" depth={0.62} type="fragment" onCollect={handleIbit} unlockLoop={IBIT_UNLOCK_LOOP} />

    </div>
  );
}
