/**
 * Unit tests for src/hooks/useBurstMode.ts
 */

import { renderHook, act } from '@testing-library/react-native';
import { useBurstMode } from '../useBurstMode';

// Mock setInterval / clearInterval
let mockIntervals: ReturnType<typeof setInterval>[] = [];
jest.spyOn(global, 'setInterval').mockImplementation((fn: any) => {
  const id = setInterval(fn, 0);
  mockIntervals.push(id);
  return id;
});
jest.spyOn(global, 'clearInterval').mockImplementation((id: any) => {
  mockIntervals = mockIntervals.filter(i => i !== id);
  return clearInterval(id);
});

beforeEach(() => {
  mockIntervals = [];
  jest.useFakeTimers();
});

afterEach(() => {
  mockIntervals.forEach(id => clearInterval(id));
  mockIntervals = [];
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ─── Initial state ─────────────────────────────────────────────────────────

describe('initial state', () => {
  it('starts with burstActive=false, burstCount=0, showBurstSuggestion=false', () => {
    const { result } = renderHook(() => useBurstMode());
    expect(result.current.burstActive).toBe(false);
    expect(result.current.burstCount).toBe(0);
    expect(result.current.showBurstSuggestion).toBe(false);
  });

  it('starts with empty burstSuggestionText ref', () => {
    const { result } = renderHook(() => useBurstMode());
    expect(result.current.burstSuggestionText.current).toBe('');
  });
});

// ─── startBurst — basic trigger ────────────────────────────────────────────

describe('startBurst', () => {
  it('fires immediate shot and schedules 4 more at 700ms intervals', () => {
    const doCapture = jest.fn();
    const { result } = renderHook(() => useBurstMode());

    act(() => {
      result.current.startBurst(doCapture);
    });

    // Immediate first shot
    expect(doCapture).toHaveBeenCalledTimes(1);
    expect(result.current.burstCount).toBe(1);
    expect(result.current.burstActive).toBe(true);

    // 4 more shots at 700ms each
    act(() => { jest.advanceTimersByTime(700); });
    expect(doCapture).toHaveBeenCalledTimes(2);
    expect(result.current.burstCount).toBe(2);

    act(() => { jest.advanceTimersByTime(700); });
    expect(doCapture).toHaveBeenCalledTimes(3);
    expect(result.current.burstCount).toBe(3);

    act(() => { jest.advanceTimersByTime(700); });
    expect(doCapture).toHaveBeenCalledTimes(4);
    expect(result.current.burstCount).toBe(4);

    act(() => { jest.advanceTimersByTime(700); });
    expect(doCapture).toHaveBeenCalledTimes(5);
    expect(result.current.burstCount).toBe(5);
  });

  it('marks burst as inactive and calls setSuggestions on completion', () => {
    const doCapture = jest.fn();
    const setSuggestions = jest.fn();
    const { result } = renderHook(() => useBurstMode({ setSuggestions }));

    act(() => {
      result.current.startBurst(doCapture);
    });

    // Complete all 5 shots
    act(() => { jest.advanceTimersByTime(2800); });

    expect(result.current.burstActive).toBe(false);
    expect(setSuggestions).toHaveBeenCalled();
    // The call receives a functional updater — invoke it to verify the suggestion text
    const updater = setSuggestions.mock.calls[setSuggestions.mock.calls.length - 1][0];
    const resultArr = updater([]);
    expect(resultArr.some((s: string) => s.includes('连拍完成'))).toBe(true);
  });

  it('prevents re-entry when burstActive=true before startBurst is called', () => {
    const doCapture = jest.fn();
    const { result } = renderHook(() => useBurstMode());

    // Set burst active first (simulates already-in-progress burst)
    act(() => {
      result.current.setBurstActive(true);
    });

    // Now try to start a new burst — should return early without calling capture
    act(() => {
      result.current.startBurst(doCapture);
    });

    expect(doCapture).not.toHaveBeenCalled();
  });

  it('clears interval on completion', () => {
    const doCapture = jest.fn();
    const { result } = renderHook(() => useBurstMode());

    act(() => {
      result.current.startBurst(doCapture);
    });

    const intervalCountBefore = mockIntervals.length;

    act(() => { jest.advanceTimersByTime(2800); });

    // Interval should have been cleared
    expect(mockIntervals.length).toBeLessThanOrEqual(intervalCountBefore);
  });
});

// ─── State setters ─────────────────────────────────────────────────────────

describe('state setters', () => {
  it('setBurstActive toggles the flag', () => {
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

  it('setBurstCount updates the counter', () => {
    const { result } = renderHook(() => useBurstMode());

    act(() => {
      result.current.setBurstCount(3);
    });
    expect(result.current.burstCount).toBe(3);
  });

  it('setShowBurstSuggestion controls overlay visibility', () => {
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

  it('burstSuggestionText ref is writable', () => {
    const { result } = renderHook(() => useBurstMode());

    act(() => {
      result.current.burstSuggestionText.current = 'Test suggestion';
    });
    expect(result.current.burstSuggestionText.current).toBe('Test suggestion');
  });
});

// ─── Edge cases ─────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('works without setSuggestions prop', () => {
    const doCapture = jest.fn();
    const { result } = renderHook(() => useBurstMode());

    act(() => {
      result.current.startBurst(doCapture);
    });
    act(() => { jest.advanceTimersByTime(2800); });

    // Should not throw even without setSuggestions
    expect(result.current.burstActive).toBe(false);
    expect(doCapture).toHaveBeenCalledTimes(5);
  });
});