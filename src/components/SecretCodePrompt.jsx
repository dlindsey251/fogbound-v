import { useEffect, useMemo, useRef, useState } from 'react';
import useGameStore from '../store/useGameStore';
import { initAudio, playNoxForTeaser } from '../systems/audioSystem';
import useKeyboardInset from '../hooks/useKeyboardInset';

const SECRET = 'THEY ALL DIE';
const SECRET_LETTERS = SECRET.replace(/[^A-Z]/gi, '').toLowerCase();

export default function SecretCodePrompt() {
  const visible = useGameStore((s) => s.secretCodePromptVisible);
  const setVisible = useGameStore((s) => s.setSecretCodePromptVisible);
  const triggerStoryTeaser = useGameStore((s) => s.triggerStoryTeaser);
  const setWhisperText = useGameStore((s) => s.setWhisperText);
  const [value, setValue] = useState('');
  const [hintText, setHintText] = useState('');
  const [hintVisible, setHintVisible] = useState(false);
  const [hintClickCount, setHintClickCount] = useState(0);
  const inputRef = useRef(null);
  const hintTimerRef = useRef(null);

  useKeyboardInset(visible, '--secret-keyboard-inset');

  useEffect(() => {
    if (!visible) return;
    setValue('');
    setHintText('');
    setHintVisible(false);
    setHintClickCount(0);
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }
    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    return () => clearTimeout(focusTimer);
  }, [visible]);

  useEffect(() => {
    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, []);

  const chars = useMemo(() => SECRET.split(''), []);

  const submit = () => {
    const ok = value.replace(/[^a-z]/gi, '').toLowerCase() === SECRET_LETTERS;
    if (ok) {
      initAudio();
      playNoxForTeaser(0.22, 2400);
      triggerStoryTeaser();
      setVisible(false);
      setWhisperText('Code accepted.');
      setTimeout(() => setWhisperText(''), 2800);
      return;
    }
    setWhisperText('Incorrect code.');
    setTimeout(() => setWhisperText(''), 2400);
  };

  if (!visible) return null;
  const typedLetters = value.replace(/[^a-zA-Z]/g, '').toUpperCase();
  let typedLetterIndex = 0;

  return (
    <div className="secret-code-wrap" onClick={() => inputRef.current?.focus()}>
      <button
        type="button"
        className="secret-code-close-btn"
        onClick={(e) => {
          e.stopPropagation();
          setVisible(false);
        }}
        aria-label="Close secret code prompt"
      >
        ×
      </button>
      <button
        type="button"
        className="secret-code-hint-btn"
        onClick={(e) => {
          e.stopPropagation();
          const nextCount = hintClickCount + 1;
          setHintClickCount(nextCount);
          const nextText = nextCount % 2 === 1 ? 'spoken last' : 'Story: What Lies In The Fog';
          setHintText(nextText);
          setHintVisible(true);
          if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
          hintTimerRef.current = setTimeout(() => {
            setHintVisible(false);
          }, 4000);
        }}
        aria-label="Toggle secret code hint"
      >
        Hint
      </button>
      <p className="secret-code-title">What happens when a...</p>
      <p className={`secret-code-hint-text ${hintVisible ? 'is-visible' : ''}`}>{hintText}</p>
      <div className="secret-code-slots" aria-hidden="true">
        {chars.map((target, i) => {
          if (target === ' ') {
            return <span key={`gap-${i}`} className="secret-code-gap" />;
          }
          const typed = typedLetters[typedLetterIndex] || '';
          typedLetterIndex += 1;
          return (
            <span key={`slot-${i}`} className="secret-code-slot">
              {typed || '-'}
            </span>
          );
        })}
      </div>

      <input
        ref={inputRef}
        className="secret-code-input"
        dir="ltr"
        value={value}
        onChange={(e) => {
          const next = e.target.value.replace(/[^a-zA-Z ]/g, '').slice(0, SECRET.length);
          setValue(next);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') setVisible(false);
        }}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        aria-label="Secret code input"
      />

      <div className="secret-code-actions">
        <button type="button" onClick={submit}>Submit</button>
      </div>
    </div>
  );
}
