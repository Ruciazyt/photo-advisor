import * as Speech from 'expo-speech';
import { useCallback, useState } from 'react';

const POSITIVE_KEYWORDS = [
  '不错',
  '很好',
  '理想',
  '对齐',
  '水平',
  '平衡',
  '对称',
  '居中',
  '推荐',
  '黄金',
  '三分',
  '佳',
  '完美',
  '棒',
];

// Standalone speak function for use outside of React components
export function speak(text: string) {
  Speech.stop();
  Speech.speak(text, {
    language: 'zh-CN',
    pitch: 1.1,
    rate: 0.9,
  });
}

export function useVoiceFeedback() {
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback((text: string) => {
    Speech.stop();
    setSpeaking(true);
    Speech.speak(text, {
      language: 'zh-CN',
      pitch: 1.1,
      rate: 0.9,
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
    });
  }, []);

  const isSpeaking = useCallback(() => speaking, [speaking]);

  const checkAndSpeak = useCallback((text: string) => {
    const lower = text.toLowerCase();
    const hasPositive = POSITIVE_KEYWORDS.some(kw => lower.includes(kw));
    if (hasPositive) {
      speak(text);
    }
  }, [speak]);

  return { speak, isSpeaking, checkAndSpeak };
}
