import { renderHook, act } from '@testing-library/react-native';
import { useBurstMode } from '../hooks/useBurstMode';

describe('useBurstMode', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts with burstActive false, burstCount 0, showBurstSuggestion false', () => {
    const { result } = renderHook(() => useBurstMode());
    expect(result.current.burstActive).toBe(false);
    expect(result.current.burstCount).toBe(0);
    expect(result.current.showBurstSuggestion).toBe(false);
  });

  it('burstSuggestionText ref is initially empty string', () => {
    const { result } = renderHook(() => useBurstMode());
    expect(result.current.burstSuggestionText.current).toBe('');
  });

  it('setBurstActive updates burstActive state', () => {
    const { result } = renderHook(() => useBurstMode());
    act(() => {
      result.current.setBurstActive(true);
    });
    expect(result.current.burstActive).toBe(true);
    act(() => {
      result.current.setBurstActive(false);
    });
    expect(result.current.burstActive).toBe(false);
  });

  it('setBurstCount updates burstCount state', () => {
    const { result } = renderHook(() => useBurstMode());
    act(() => {
      result.current.setBurstCount(3);
    });
    expect(result.current.burstCount).toBe(3);
  });

  it('setShowBurstSuggestion updates showBurstSuggestion state', () => {
    const { result } = renderHook(() => useBurstMode());
    act(() => {
      result.current.setShowBurstSuggestion(true);
    });
    expect(result.current.showBurstSuggestion).toBe(true);
    act(() => {
      result.current.setShowBurstSuggestion(false);
    });
    expect(result.current.showBurstSuggestion).toBe(false);
  });

  it('startBurst does nothing if burstActive is already true', () => {
    const { result } = renderHook(() => useBurstMode());
    const doCapture = jest.fn();
    act(() => {
      result.current.setBurstActive(true);
    });
    act(() => {
      result.current.startBurst(doCapture);
    });
    expect(doCapture).not.toHaveBeenCalled();
    expect(result.current.burstActive).toBe(true);
  });

  it('startBurst calls doCapture 5 times at 700ms intervals then stops', () => {
    const { result } = renderHook(() => useBurstMode());
    const doCapture = jest.fn();

    act(() => {
      result.current.startBurst(doCapture);
    });

    // burstActive should be true immediately
    expect(result.current.burstActive).toBe(true);
    // First shot is immediate (shot=1), so burstCount is 1 right away
    expect(result.current.burstCount).toBe(1);
    // doCapture called once immediately (first shot)
    expect(doCapture).toHaveBeenCalledTimes(1);

    // Advance 700ms for second shot
    act(() => {
      jest.advanceTimersByTime(700);
    });
    expect(result.current.burstCount).toBe(2);
    expect(doCapture).toHaveBeenCalledTimes(2);

    // Advance 700ms for third shot
    act(() => {
      jest.advanceTimersByTime(700);
    });
    expect(result.current.burstCount).toBe(3);
    expect(doCapture).toHaveBeenCalledTimes(3);

    // Advance 700ms for fourth shot
    act(() => {
      jest.advanceTimersByTime(700);
    });
    expect(result.current.burstCount).toBe(4);
    expect(doCapture).toHaveBeenCalledTimes(4);

    // Advance 700ms for fifth (final) shot
    act(() => {
      jest.advanceTimersByTime(700);
    });
    expect(result.current.burstCount).toBe(5);
    expect(doCapture).toHaveBeenCalledTimes(5);
    // After 5 shots, burstActive should be false
    expect(result.current.burstActive).toBe(false);

    // Advance 700ms more - interval should be cleared, no more calls
    act(() => {
      jest.advanceTimersByTime(700);
    });
    expect(result.current.burstCount).toBe(5);
    expect(doCapture).toHaveBeenCalledTimes(5);
  });

  it('startBurst calls setSuggestions with completion message after 5 shots', () => {
    const setSuggestions = jest.fn();
    const { result } = renderHook(() => useBurstMode({ setSuggestions }));
    const doCapture = jest.fn();

    act(() => {
      result.current.startBurst(doCapture);
    });

    // Advance through all 5 shots (5 * 700ms = 3500ms)
    act(() => {
      jest.advanceTimersByTime(3500);
    });

    expect(setSuggestions).toHaveBeenCalledWith(expect.any(Function));
    // The callback should add the completion message
    const updateFn = setSuggestions.mock.calls[0][0];
    const prev: string[] = [];
    const next = updateFn(prev);
    expect(next).toContain('连拍完成：共5张');
  });
});
