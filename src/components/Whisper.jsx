import useGameStore from '../store/useGameStore';

/**
 * Whisper — displays transient narrative text driven by useNarrativeTriggers.
 * Fades via CSS opacity transition; text is set/cleared by the trigger hook.
 */
export default function Whisper() {
  const text = useGameStore((s) => s.whisperText);
  const secretCodePromptVisible = useGameStore((s) => s.secretCodePromptVisible);
  const norm = (text || '').trim().toLowerCase();
  const isRed = norm === 'oh...' || norm === 'turn back?' || norm === 'entry 1 surfaced. pick it up.';

  return (
    <div
      id="whisper"
      className={secretCodePromptVisible ? 'whisper--secret-active' : undefined}
      aria-live="polite"
      style={{
        opacity: text ? 1 : 0,
        color: isRed ? 'rgba(255, 92, 92, 0.95)' : undefined,
      }}
    >
      {text}
    </div>
  );
}
