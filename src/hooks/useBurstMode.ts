/**
 * useBurstMode — manages burst photo capture mode.
 *
 * Responsibilities:
 * - Burst active state and shot counter
 * - Burst suggestion overlay visibility
 * - Suggestion text ref for overlay display
 * - startBurst(doCapture) triggers 5 captures at 700ms intervals
 */

import { useState, useCallback, useRef } from 'react';

export interface UseBurstModeOptions {
  setSuggestions?: React.Dispatch<React.SetStateAction<string[]>>;
}

export interface UseBurstModeReturn {
  burstActive: boolean;
  setBurstActive: React.Dispatch<React.SetStateAction<boolean>>;
  burstCount: number;
  setBurstCount: React.Dispatch<React.SetStateAction<number>>;
  showBurstSuggestion: boolean;
  setShowBurstSuggestion: React.Dispatch<React.SetStateAction<boolean>>;
  burstSuggestionText: React.MutableRefObject<string>;
  startBurst: (doCapture: () => void) => void;
}

export function useBurstMode({ setSuggestions }: UseBurstModeOptions = {}): UseBurstModeReturn {
  const [burstActive, setBurstActive] = useState(false);
  const [burstCount, setBurstCount] = useState(0);
  const [showBurstSuggestion, setShowBurstSuggestion] = useState(false);
  const burstSuggestionText = useRef('');

  const startBurst = useCallback((doCapture: () => void) => {
    if (burstActive) return;
    setBurstActive(true);
    setBurstCount(0);
    let shot = 0;
    doCapture(); // immediate first shot
    shot++;
    setBurstCount(shot);
    const burstInterval = setInterval(() => {
      doCapture();
      shot++;
      setBurstCount(shot);
      if (shot >= 5) {
        clearInterval(burstInterval);
        setBurstActive(false);
        setSuggestions?.(prev => [...prev, `连拍完成：共${shot}张`]);
      }
    }, 700);
  }, [burstActive, setSuggestions]);

  return {
    burstActive,
    setBurstActive,
    burstCount,
    setBurstCount,
    showBurstSuggestion,
    setShowBurstSuggestion,
    burstSuggestionText,
    startBurst,
  };
}
