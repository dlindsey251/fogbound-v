import { useEffect } from 'react';

export default function useKeyboardInset(active, cssVarName = '--keyboard-inset') {
  useEffect(() => {
    if (!active) return undefined;

    const root = document.documentElement;
    const updateKeyboardInset = () => {
      const viewport = window.visualViewport;
      if (!viewport) {
        root.style.setProperty(cssVarName, '0px');
        return;
      }
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      root.style.setProperty(cssVarName, `${Math.round(inset)}px`);
    };

    updateKeyboardInset();
    window.visualViewport?.addEventListener('resize', updateKeyboardInset);
    window.visualViewport?.addEventListener('scroll', updateKeyboardInset);
    window.addEventListener('orientationchange', updateKeyboardInset);

    return () => {
      window.visualViewport?.removeEventListener('resize', updateKeyboardInset);
      window.visualViewport?.removeEventListener('scroll', updateKeyboardInset);
      window.removeEventListener('orientationchange', updateKeyboardInset);
      root.style.removeProperty(cssVarName);
    };
  }, [active, cssVarName]);
}
