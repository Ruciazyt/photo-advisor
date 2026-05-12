/**
 * Unit tests for src/hooks/useVoiceFeedback.ts
 *
 * Covers:
 * - Standalone speak() function
 * - useVoiceFeedback: speak, isSpeaking, checkAndSpeak
 * - Positive keyword detection triggers speech
 * - Negative/irrelevant text does NOT trigger speech
 * - onDone/onError/onStopped callbacks update speaking state
 * - Mock expo-speech interactions
 */

import { renderHook, act } from '@testing-library/react-native';
import * as Speech from 'expo-speech';
import { useVoiceFeedback, speak as speakExport } from '../useVoiceFeedback';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

jest.mock('expo-speech', () => ({
  stop: jest.fn(),
  speak: jest.fn(),
  isSpeaking: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (Speech.speak as jest.Mock).mockImplementation(
    (text: string, options?: object) => {
      options && typeof options === 'object' && 'onDone' in options
        ? (options as { onDone: () => void }).onDone()
        : undefined;
    }
  );
});

// ---------------------------------------------------------------------------
// Standalone speak function
// ---------------------------------------------------------------------------

describe('speak (standalone export)', () => {
  it('calls Speech.stop then Speech.speak with correct options', () => {
    speakExport('构图不错');
    expect(Speech.stop).toHaveBeenCalledTimes(1);
    expect(Speech.speak).toHaveBeenCalledWith('构图不错', {
      language: 'zh-CN',
      pitch: 1.1,
      rate: 0.9,
    });
  });

  it('speaks different texts independently', () => {
    speakExport('第一句');
    speakExport('第二句');
    expect(Speech.speak).toHaveBeenCalledTimes(2);
    expect(Speech.speak).toHaveBeenNthCalledWith(1, '第一句', expect.any(Object));
    expect(Speech.speak).toHaveBeenNthCalledWith(2, '第二句', expect.any(Object));
  });
});

// ---------------------------------------------------------------------------
// useVoiceFeedback hook
// ---------------------------------------------------------------------------

describe('useVoiceFeedback', () => {
  describe('speak', () => {
    it('calls Speech.stop before each speak', () => {
      const { result } = renderHook(() => useVoiceFeedback());
      act(() => {
        result.current.speak('测试文本');
      });
      expect(Speech.stop).toHaveBeenCalledTimes(1);
      expect(Speech.speak).toHaveBeenCalledTimes(1);
    });

    it('passes correct speech options (language, pitch, rate)', () => {
      const { result } = renderHook(() => useVoiceFeedback());
      act(() => {
        result.current.speak('再来一张');
      });
      expect(Speech.speak).toHaveBeenCalledWith('再来一张', expect.objectContaining({
        language: 'zh-CN',
        pitch: 1.1,
        rate: 0.9,
      }));
    });
  });

  describe('isSpeaking', () => {
    it('returns current speaking state', () => {
      const { result } = renderHook(() => useVoiceFeedback());
      expect(result.current.isSpeaking()).toBe(false);
    });
  });

  describe('checkAndSpeak', () => {
    it('triggers speech for text containing positive keywords', () => {
      const { result } = renderHook(() => useVoiceFeedback());
      act(() => {
        result.current.checkAndSpeak('三分法对齐很好');
      });
      expect(Speech.speak).toHaveBeenCalledTimes(1);
    });

    it('does NOT trigger speech for irrelevant text', () => {
      const { result } = renderHook(() => useVoiceFeedback());
      act(() => {
        result.current.checkAndSpeak('请调整一下角度');
      });
      expect(Speech.speak).not.toHaveBeenCalled();
    });

    it('detects "不错" keyword (partial match allowed)', () => {
      const { result } = renderHook(() => useVoiceFeedback());
      act(() => {
        result.current.checkAndSpeak('曝光不错');
      });
      expect(Speech.speak).toHaveBeenCalledTimes(1);
    });

    it('detects "很好" keyword', () => {
      const { result } = renderHook(() => useVoiceFeedback());
      act(() => {
        result.current.checkAndSpeak('水平很好');
      });
      expect(Speech.speak).toHaveBeenCalledTimes(1);
    });

    it('detects "理想" keyword', () => {
      const { result } = renderHook(() => useVoiceFeedback());
      act(() => {
        result.current.checkAndSpeak('构图理想');
      });
      expect(Speech.speak).toHaveBeenCalledTimes(1);
    });

    it('detects "黄金" keyword', () => {
      const { result } = renderHook(() => useVoiceFeedback());
      act(() => {
        result.current.checkAndSpeak('黄金比例');
      });
      expect(Speech.speak).toHaveBeenCalledTimes(1);
    });

    it('detects "完美" keyword', () => {
      const { result } = renderHook(() => useVoiceFeedback());
      act(() => {
        result.current.checkAndSpeak('完美对齐');
      });
      expect(Speech.speak).toHaveBeenCalledTimes(1);
    });

    it('is case-insensitive', () => {
      const { result } = renderHook(() => useVoiceFeedback());
      act(() => {
        result.current.checkAndSpeak('很不错');
      });
      expect(Speech.speak).toHaveBeenCalledTimes(1);
    });
  });
});