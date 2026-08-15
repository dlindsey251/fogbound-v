import { useEffect, useState } from 'react';
import { subscribeAudioState, toggleMusicPaused } from '../systems/audioSystem';

export default function MusicToggle() {
  const [audioState, setAudioState] = useState({ zone: 'land', paused: false });

  useEffect(() => subscribeAudioState(setAudioState), []);

  if (audioState.zone === 'fog') return null;

  return (
    <button
      className={`music-toggle music-toggle--${audioState.zone}`}
      type="button"
      aria-pressed={!audioState.paused}
      onClick={toggleMusicPaused}
    >
      {audioState.paused ? 'Music Off' : 'Music On'}
    </button>
  );
}
