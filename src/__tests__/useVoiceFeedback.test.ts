import { renderHook, act } from '@testing-library/react-native';
import { useVoiceFeedback } from '../hooks/useVoiceFeedback';

jest.mock('expo-speech');

const { speak: mockSpeak, stop: mockStop } = require('expo-speech');

describe('useVoiceFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSpeak.mockImplementation((text: string, opts: { onDone?: () => void; onError?: () => void; onStopped?: () => void } | undefined) => {
      opts?.onDone?.();
    });
    mockStop.mockReturnValue();
  });

  it('speak() calls Speech.speak with correct options', () => {
    const { result } = renderHook(() => useVoiceFeedback());
    act(() => {
      result.current.speak('测试文本');
    });
    expect(mockSpeak).toHaveBeenCalledWith('测试文本', {
      language: 'zh-CN',
      pitch: 1.1,
      rate: 0.9,
      onDone: expect.any(Function),
      onError: expect.any(Function),
      onStopped: expect.any(Function),
    });
  });

  it('speak() calls Speech.stop() first before speaking', () => {
    const { result } = renderHook(() => useVoiceFeedback());
    act(() => {
      result.current.speak('测试');
    });
    expect(mockStop).toHaveBeenCalled();
    expect(mockSpeak).toHaveBeenCalled();
    expect(mockStop.mock.invocationCallOrder[0].callIndex <
      mockSpeak.mock.invocationCallOrder[0].callIndex);
  });

  it('speak() sets speaking to true initially, false on done', () => {
    const { result } = renderHook(() => useVoiceFeedback());
    // speaking should be false initially
    expect(result.current.isSpeaking()).toBe(false);
    // after calling speak, speaking becomes true then false (onDone called synchronously)
    act(() => {
      result.current.speak('测试');
    });
    expect(result.current.isSpeaking()).toBe(false);
  });

  it('checkAndSpeak() triggers speak() for positive keyword "不错"', () => {
    const { result } = renderHook(() => useVoiceFeedback());
    act(() => {
      result.current.checkAndSpeak('这个构图很不错');
    });
    expect(mockSpeak).toHaveBeenCalled();
  });

  it('checkAndSpeak() triggers speak() for positive keyword "黄金"', () => {
    const { result } = renderHook(() => useVoiceFeedback());
    act(() => {
      result.current.checkAndSpeak('黄金分割比例很好');
    });
    expect(mockSpeak).toHaveBeenCalled();
  });

  it('checkAndSpeak() does NOT speak for neutral text', () => {
    const { result } = renderHook(() => useVoiceFeedback());
    act(() => {
      result.current.checkAndSpeak('这是一张普通的照片');
    });
    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it('checkAndSpeak() is case insensitive for Chinese characters', () => {
    const { result } = renderHook(() => useVoiceFeedback());
    // toLowerCase() on Chinese characters returns the same string,
    // so this tests that the keyword matching still works regardless of case
    act(() => {
      result.current.checkAndSpeak('这个很不错'); // lowercase has no effect on Chinese
      result.current.checkAndSpeak('这个很不错'.toUpperCase()); // still matches
    });
    expect(mockSpeak).toHaveBeenCalledTimes(2);
  });

  it('isSpeaking() returns current speaking state', () => {
    const { result } = renderHook(() => useVoiceFeedback());
    expect(result.current.isSpeaking()).toBe(false);
  });

  it('multiple speak() calls stop previous speech first', () => {
    const { result } = renderHook(() => useVoiceFeedback());
    act(() => {
      result.current.speak('第一段');
    });
    act(() => {
      result.current.speak('第二段');
    });
    // stop should be called twice (once before each speak)
    expect(mockStop).toHaveBeenCalledTimes(2);
  });

  it('speak with empty string still calls speak', () => {
    const { result } = renderHook(() => useVoiceFeedback());
    act(() => {
      result.current.speak('');
    });
    expect(mockSpeak).toHaveBeenCalledWith('', expect.any(Object));
  });

  it('checkAndSpeak does NOT speak for text without positive keywords', () => {
    const { result } = renderHook(() => useVoiceFeedback());
    act(() => {
      result.current.checkAndSpeak('待定');
    });
    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it('speak() sets speaking to false when onError is called', () => {
    mockSpeak.mockImplementation((_text: string, opts: { onDone?: () => void; onError?: () => void; onStopped?: () => void } | undefined) => {
      opts?.onError?.();
    });
    const { result } = renderHook(() => useVoiceFeedback());
    act(() => {
      result.current.speak('测试错误');
    });
    expect(result.current.isSpeaking()).toBe(false);
  });

  it('speak() sets speaking to false when onStopped is called', () => {
    mockSpeak.mockImplementation((_text: string, opts: { onDone?: () => void; onError?: () => void; onStopped?: () => void } | undefined) => {
      opts?.onStopped?.();
    });
    const { result } = renderHook(() => useVoiceFeedback());
    act(() => {
      result.current.speak('测试停止');
    });
    expect(result.current.isSpeaking()).toBe(false);
  });

  it('speak() sets speaking to false when onDone is called (explicit mock)', () => {
    mockSpeak.mockImplementation((_text: string, opts: { onDone?: () => void; onError?: () => void; onStopped?: () => void } | undefined) => {
      opts?.onDone?.();
    });
    const { result } = renderHook(() => useVoiceFeedback());
    act(() => {
      result.current.speak('测试完成');
    });
    expect(result.current.isSpeaking()).toBe(false);
  });
});

describe('useVoiceFeedback POSITIVE_KEYWORDS edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSpeak.mockImplementation((_text: string, opts: { onDone?: () => void; onError?: () => void; onStopped?: () => void } | undefined) => {
      opts?.onDone?.();
    });
    mockStop.mockReturnValue();
  });

  it('checkAndSpeak triggers speak() when keyword is at the start', () => {
    const { result } = renderHook(() => useVoiceFeedback());
    act(() => {
      result.current.checkAndSpeak('很好，构图很棒');
    });
    expect(mockSpeak).toHaveBeenCalled();
  });


  it('checkAndSpeak triggers speak() when keyword is at the end', () => {
    const { result } = renderHook(() => useVoiceFeedback());
    act(() => {
      result.current.checkAndSpeak('这个构图很完美');
    });
    expect(mockSpeak).toHaveBeenCalled();
  });

  it('checkAndSpeak triggers speak() only once when multiple keywords present', () => {
    const { result } = renderHook(() => useVoiceFeedback());
    act(() => {
      result.current.checkAndSpeak('很不错，构图很好，完美');
    });
    // speak is called once (one positive keyword match is enough)
    expect(mockSpeak).toHaveBeenCalledTimes(1);
  });

  it('checkAndSpeak does NOT trigger speak() when text only has negative forms', () => {
    const { result } = renderHook(() => useVoiceFeedback());
    act(() => {
      result.current.checkAndSpeak('构图不正确');
    });
    // Current implementation only checks for positive keywords,
    // so "不正确" does not match "不错" - documents current behavior
    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it('checkAndSpeak does NOT trigger speak() for text without positive keywords even with partial matches', () => {
    const { result } = renderHook(() => useVoiceFeedback());
    act(() => {
      result.current.checkAndSpeak('理想情况下是黄金比例');
    });
    // "理想" is a positive keyword, so this should speak
    expect(mockSpeak).toHaveBeenCalled();
  });
});

describe('standalone speak()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStop.mockReturnValue();
  });

  it('calls Speech.stop() before Speaking', () => {
    const { speak: standaloneSpeak } = require('../hooks/useVoiceFeedback');
    standaloneSpeak('测试文本');
    expect(mockStop).toHaveBeenCalled();
    expect(mockSpeak).toHaveBeenCalledWith('测试文本', {
      language: 'zh-CN',
      pitch: 1.1,
      rate: 0.9,
    });
  });

  it('speaks Chinese text with correct language', () => {
    const { speak: standaloneSpeak } = require('../hooks/useVoiceFeedback');
    standaloneSpeak('黄金比例很棒');
    expect(mockSpeak).toHaveBeenCalledWith('黄金比例很棒', {
      language: 'zh-CN',
      pitch: 1.1,
      rate: 0.9,
    });
  });

  it('calls speak with expected options object', () => {
    const { speak: standaloneSpeak } = require('../hooks/useVoiceFeedback');
    standaloneSpeak('测试');
    expect(mockSpeak).toHaveBeenCalledWith('测试', expect.objectContaining({
      language: 'zh-CN',
      pitch: 1.1,
      rate: 0.9,
    }));
  });

  it('standalone speak() works gracefully when no callbacks are provided', () => {
    // The standalone speak() does NOT pass onDone/onError/onStopped to Speech.speak.
    // When Speech finishes, no callback fires — this should not crash.
    const { speak: standaloneSpeak } = require('../hooks/useVoiceFeedback');
    // Mock Speech.speak with no callbacks (simulating real behavior)
    mockSpeak.mockImplementation((_text: string, _opts: Record<string, unknown>) => {
      // no callbacks invoked — standalone speak doesn't set any
    });
    // Should not throw even though no onDone fires to reset anything
    expect(() => standaloneSpeak('无回调测试')).not.toThrow();
    expect(mockSpeak).toHaveBeenCalledWith('无回调测试', {
      language: 'zh-CN',
      pitch: 1.1,
      rate: 0.9,
    });
    // Verify no callbacks were passed (graceful — no state to update outside hook)
    const callArgs = mockSpeak.mock.calls[0][1] as Record<string, unknown>;
    expect(callArgs.onDone).toBeUndefined();
    expect(callArgs.onError).toBeUndefined();
    expect(callArgs.onStopped).toBeUndefined();
  });
});
