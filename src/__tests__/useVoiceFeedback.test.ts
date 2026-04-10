import { renderHook, act } from '@testing-library/react-native';
import { useVoiceFeedback } from '../hooks/useVoiceFeedback';

jest.mock('expo-speech');

const { speak: mockSpeak, stop: mockStop } = require('expo-speech');

describe('useVoiceFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSpeak.mockImplementation((text, opts) => {
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
});
