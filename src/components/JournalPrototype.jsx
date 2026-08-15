import { useEffect, useRef, useState } from 'react';
import { trackMetric } from '../utils/metrics';

const SPREADS = [
  {
    left: '/journal-pages/title-left.webp',
    right: '/journal-pages/title-right.webp',
    label: 'Title spread',
  },
  {
    left: '/journal-pages/entry0-left.webp',
    right: '/journal-pages/entry0-right.webp',
    label: "Entry 0 · Ben's Story",
    excerpt: 'Violet pooled low against the roots of the trees, curling around them the way smoke does when it’s undecided about leaving the ground.',
  },
  {
    left: '/journal-pages/entry1-left.webp',
    right: '/journal-pages/entry1-right.webp',
    label: 'Entry 1 · Nested Dolls',
    excerpt: '“You believe in heaven?” Kelly asked. “You askin’ ’cause you’re scared, or ’cause you’re bored?”',
  },
  {
    left: '/journal-pages/entry2-left.webp',
    right: '/journal-pages/entry2-right.webp',
    label: 'Entry 2 · 18:21',
    excerpt: 'The rusting knife fell between them. Kelly’s eyes were calm, as if this moment between life and death was home. Tail’s were filled with pain. It had only been a matter of time.',
    excerptPosition: 'high',
    purchaseSlip: true,
  },
  {
    left: '/journal-pages/what-lies-left-v2.png',
    right: '/journal-pages/what-lies-right.png',
    label: 'Recovered Story · What Lies in the Fog',
    excerpt: 'Five strangers shelter in a cabin while violet fog gathers outside. To survive the night, they begin telling stories.',
    excerptPosition: 'high',
  },
];

const STORY_BOOKMARKS = {
  1: {
    title: "Ben's Story",
    href: '/Fogbound%20V%20Entry%20Stories.pdf',
  },
  2: {
    title: 'Nested Dolls',
    href: '/Nested%20Dolls--.pdf',
  },
  4: {
    title: 'What Lies in the Fog',
    action: 'what-lies-offer',
    eyebrow: 'Play the Audio',
    meta: 'Free preview',
  },
};

export default function JournalPrototype({ onClose, onPurchase, onPlayWhatLies, onRecoverWhatLies, isOwned = false }) {
  const [spread, setSpread] = useState(0);
  const [turnDirection, setTurnDirection] = useState('');
  const [pendingSpread, setPendingSpread] = useState(null);
  const pointerStart = useRef(null);
  const closeRef = useRef(null);
  const swapTimer = useRef(null);
  const finishTimer = useRef(null);
  const storyBookmark = STORY_BOOKMARKS[spread];

  const turnPage = (nextSpread) => {
    if (nextSpread < 0 || nextSpread >= SPREADS.length || turnDirection) return;
    const direction = nextSpread > spread ? 'next' : 'previous';
    setTurnDirection(direction);
    setPendingSpread(nextSpread);
    swapTimer.current = window.setTimeout(() => {
      setSpread(nextSpread);
    }, 520);
    finishTimer.current = window.setTimeout(() => {
      setPendingSpread(null);
      setTurnDirection('');
    }, 760);
  };

  useEffect(() => {
    const nextSpread = SPREADS[spread + 1];
    if (!nextSpread) return;
    [nextSpread.left, nextSpread.right].forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }, [spread]);

  useEffect(() => {
    trackMetric('journal_spread_view', {
      spread: String(spread),
      entry: SPREADS[spread].label,
    });
  }, [spread]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') turnPage(spread + 1);
      if (event.key === 'ArrowLeft') turnPage(spread - 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, spread, turnDirection]);

  useEffect(() => () => {
    window.clearTimeout(swapTimer.current);
    window.clearTimeout(finishTimer.current);
  }, []);

  const handlePointerDown = (event) => {
    pointerStart.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 46 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    turnPage(deltaX < 0 ? spread + 1 : spread - 1);
  };

  return (
    <div
      className="journal-prototype"
      role="dialog"
      aria-modal="true"
      aria-label="Illustrated recovered journal"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { pointerStart.current = null; }}
    >
      <div className="journal-prototype__room" aria-hidden="true">
        <div className="cabin-landing__image" />
        <div className="cabin-landing__shade" />
      </div>
      <div className="journal-prototype__status">
        Recovered journal · {SPREADS[spread].label}
      </div>
      <button
        ref={closeRef}
        className="journal-prototype__close"
        type="button"
        aria-label="Close recovered journal"
        onClick={onClose}
      >
        Close journal
      </button>

      <div className="journal-book" aria-live="polite">
        <div className="journal-book__cover" aria-hidden="true" />
        <div className={`journal-book__page journal-book__page--left ${turnDirection ? 'journal-book__page--departing' : ''}`}>
          <img
            src={SPREADS[spread].left}
            alt=""
            draggable="false"
            style={{ objectPosition: SPREADS[spread].leftImagePosition || 'center' }}
          />
        </div>
        <div className={`journal-book__page journal-book__page--right ${turnDirection ? 'journal-book__page--departing' : ''}`}>
          <img src={SPREADS[spread].right} alt="" draggable="false" />
        </div>
        {pendingSpread !== null && (
          <>
            <div className="journal-book__page journal-book__page--left journal-book__page--incoming">
              <img
                src={SPREADS[pendingSpread].left}
                alt=""
                draggable="false"
                style={{ objectPosition: SPREADS[pendingSpread].leftImagePosition || 'center' }}
              />
            </div>
            <div className="journal-book__page journal-book__page--right journal-book__page--incoming">
              <img src={SPREADS[pendingSpread].right} alt="" draggable="false" />
            </div>
          </>
        )}
        <div className="journal-book__spine" aria-hidden="true" />

        {turnDirection && (
          <div
            className={`journal-book__cinematic-turn journal-book__cinematic-turn--${turnDirection}`}
            aria-hidden="true"
          >
            <div className="journal-book__cinematic-paper" />
          </div>
        )}

        {SPREADS[spread].excerpt && !turnDirection && (
          <blockquote
            className={`journal-book__excerpt ${SPREADS[spread].excerptPosition === 'high' ? 'journal-book__excerpt--high' : ''}`}
          >
            {SPREADS[spread].excerpt}
          </blockquote>
        )}

        {storyBookmark?.action === 'what-lies-offer' && !turnDirection ? (
          <div
            className="journal-book__volume-tab journal-book__volume-tab--audio"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <small>Recovered recording</small>
            <strong>{storyBookmark.title}</strong>
            <button
              type="button"
              onClick={() => {
                trackMetric('what_lies_audio_preview_play', { source: 'journal' });
                onPlayWhatLies?.();
              }}
            >
              Play the Audio
            </button>
            <button
              type="button"
              onClick={() => {
                trackMetric('what_lies_audio_recover_open', { source: 'journal' });
                onRecoverWhatLies?.();
              }}
            >
              Recover the full audio
            </button>
          </div>
        ) : storyBookmark && !turnDirection && (
          <button
            className="journal-book__volume-tab"
            type="button"
            aria-label={`Open ${storyBookmark.title}, ${storyBookmark.meta || 'priceless'}`}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onClick={() => {
              trackMetric('journal_story_bookmark_open', { story: storyBookmark.title });
              window.open(storyBookmark.href, '_blank', 'noopener,noreferrer');
            }}
          >
            <small>{storyBookmark.eyebrow || 'Recovered story'}</small>
            <strong>{storyBookmark.title}</strong>
            <span>{storyBookmark.meta || 'Priceless · Open'}</span>
          </button>
        )}

        {SPREADS[spread].purchaseSlip && !turnDirection && (
          <button
            className="journal-book__purchase-slip"
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onClick={onPurchase}
          >
            <small>{isOwned ? 'Archive Key recognized' : 'Filed with this entry'}</small>
            <strong>{isOwned ? 'Return to 18:21' : 'Claim the recovered volume'}</strong>
            <span>{isOwned ? 'Open recovered volume' : '18:21 · complete collection · $4.99'}</span>
          </button>
        )}
      </div>

      {spread > 0 && (
        <button
          className="journal-prototype__page-edge journal-prototype__page-edge--previous"
          type="button"
          onClick={() => turnPage(spread - 1)}
          disabled={Boolean(turnDirection)}
          aria-label="Turn to previous journal spread"
        >
          Previous
        </button>
      )}
      {spread < SPREADS.length - 1 ? (
        <button
          className="journal-prototype__page-edge journal-prototype__page-edge--next"
          type="button"
          onClick={() => turnPage(spread + 1)}
          disabled={Boolean(turnDirection)}
          aria-label={`Turn to ${SPREADS[spread + 1].label}`}
        >
          {spread === 0 ? 'Begin' : 'Next'}
        </button>
      ) : (
        <button
          className="journal-prototype__page-edge journal-prototype__page-edge--next"
          type="button"
          onClick={onClose}
          aria-label="Close the recovered journal"
        >
          Close
        </button>
      )}

      <p className="journal-prototype__hint">
        {spread === 0 && 'Swipe left, tap Begin, or press →'}
        {spread > 0 && spread < SPREADS.length - 1 && `${SPREADS[spread].label} · swipe to turn the page`}
        {spread === SPREADS.length - 1 && 'Recovered story · play the preview or swipe right to revisit'}
      </p>
    </div>
  );
}
