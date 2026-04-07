import { useCallback, useRef } from 'react';

export function useVoice() {
  const lastSpoken = useRef('');
  const cooldowns = useRef({});

  const speak = useCallback((text, cooldownMs = 4000) => {
    if (!window.speechSynthesis) return;
    const now = Date.now();
    if (cooldowns.current[text] && now - cooldowns.current[text] < cooldownMs) return;
    cooldowns.current[text] = now;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1.05;
    utt.pitch = 1;
    utt.volume = 1;
    window.speechSynthesis.speak(utt);
  }, []);

  return { speak };
}
