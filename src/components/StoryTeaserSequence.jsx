import { useEffect, useMemo, useState } from 'react';
import useGameStore from '../store/useGameStore';
import { fadeOutNoxForTeaser } from '../systems/audioSystem';

const RED_LINES = [
  'the cabin waits',
  'blood remembers',
  'the door is still open',
  'you were let in once',
  'the fog keeps names',
  'listen to the wood crack',
  'shadows circle the light',
  'someone is watching you',
];

const VIOLET_LINES = [
  'word is bond',
  'a relic-shaped absence',
  'better a snake in front',
  'ghost feelings return',
  'a challenge at dusk',
  'four seconds to decide',
  'life and death in the tongue',
  'some promises become curses',
];

const POSITIONS = [
  { left: '10%', top: '16%' },
  { left: '68%', top: '18%' },
  { left: '22%', top: '36%' },
  { left: '75%', top: '48%' },
  { left: '14%', top: '58%' },
  { left: '62%', top: '68%' },
  { left: '36%', top: '80%' },
  { left: '84%', top: '74%' },
];

function buildWhispers(lines, phaseOffsetMs) {
  return lines.map((text, i) => ({
    id: `${phaseOffsetMs}-${i}-${text}`,
    text,
    atMs: phaseOffsetMs + i * 1300,
    lifeMs: 2600,
    pos: POSITIONS[i % POSITIONS.length],
    big: i % 3 === 0,
  }));
}

export default function StoryTeaserSequence() {
  const teaserTick = useGameStore((s) => s.storyTeaserTick);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState('none');
  const [startAt, setStartAt] = useState(0);
  const [now, setNow] = useState(0);

  const whispers = useMemo(
    () => [
      ...buildWhispers(VIOLET_LINES, 0),
      ...buildWhispers(RED_LINES, 12000),
    ],
    [],
  );

  useEffect(() => {
    if (!teaserTick) return undefined;

    const start = performance.now();
    setRunning(true);
    setPhase('violet');
    setStartAt(start);
    setNow(start);

    let raf = 0;
    const tick = () => {
      const t = performance.now();
      setNow(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const toRed = setTimeout(() => setPhase('red-1'), 12000);
    // Begin earlier with a longer fade so stop is never abrupt.
    const toNoxFade = setTimeout(() => fadeOutNoxForTeaser(18000), 12000);
    const toFadeOut = setTimeout(() => setPhase('out'), 24000);
    const end = setTimeout(() => {
      setRunning(false);
      setPhase('none');
    }, 30000);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(toRed);
      clearTimeout(toNoxFade);
      clearTimeout(toFadeOut);
      clearTimeout(end);
      fadeOutNoxForTeaser(3200);
    };
  }, [teaserTick]);

  if (!running) return null;

  const elapsed = now - startAt;
  const visibleWhispers = whispers.filter(
    (w) => elapsed >= w.atMs && elapsed <= w.atMs + w.lifeMs,
  );

  return (
    <div className={`story-teaser story-teaser--${phase}`} aria-hidden="true">
      <div className="story-teaser-layer story-teaser-red" />
      <div className="story-teaser-layer story-teaser-violet" />
      <div className="story-teaser-whispers">
        {visibleWhispers.map((w) => (
          <span
            key={w.id}
            className={`story-teaser-line ${w.big ? 'is-big' : 'is-small'}`}
            style={{ '--teaser-left': w.pos.left, '--teaser-top': w.pos.top }}
          >
            {w.text}
          </span>
        ))}
      </div>
    </div>
  );
}
