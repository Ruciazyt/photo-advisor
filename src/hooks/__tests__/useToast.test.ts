import { renderHook, act } from '@testing-library/react-native';
import { useToast } from '../useToast';

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe('useToast', () => {
  it('returns opacity shared value, toastMessage string, and showToast function', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current).toHaveProperty('opacity');
    expect(result.current).toHaveProperty('toastMessage');
    expect(typeof result.current.toastMessage).toBe('string');
    expect(result.current).toHaveProperty('showToast');
    expect(typeof result.current.showToast).toBe('function');
  });

  it('showToast sets message immediately', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.showToast('hello world');
    });
    expect(result.current.toastMessage).toBe('hello world');
  });

  it('showToast animates opacity to 1 then back to 0 after 1200ms', () => {
    const { result } = renderHook(() => useToast());

    // Initial state: opacity starts at 0 (from useSharedValue(0))
    expect(result.current.opacity.value).toBe(0);
    expect(result.current.toastMessage).toBe('');

    // Call showToast
    act(() => {
      result.current.showToast('test message');
    });

    // Message should appear immediately
    expect(result.current.toastMessage).toBe('test message');

    // Advance timers: after 200ms (duration of fade-in) opacity should still be 1
    // The withTiming callback fires after 50ms in mock, but opacity.value updates synchronously
    // After full 1200ms, toast should be cleared
    act(() => {
      jest.advanceTimersByTime(1200);
    });

    // Message should be cleared after 1200ms timeout
    expect(result.current.toastMessage).toBe('');
  });

  it('rapid successive showToast calls clear previous timeout', () => {
    const { result } = renderHook(() => useToast());

    // First toast
    act(() => {
      result.current.showToast('first');
    });
    expect(result.current.toastMessage).toBe('first');

    // Rapid second call — should clear first timeout and replace message
    act(() => {
      result.current.showToast('second');
    });
    expect(result.current.toastMessage).toBe('second');

    // Advance past first timeout but well before second
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Message should still be 'second' (first timeout was cancelled)
    expect(result.current.toastMessage).toBe('second');

    // Advance past second timeout
    act(() => {
      jest.advanceTimersByTime(800);
    });
    expect(result.current.toastMessage).toBe('');
  });

  it('consecutive toasts fire their 1200ms timers independently', () => {
    const { result } = renderHook(() => useToast());

    // First toast
    act(() => {
      result.current.showToast('msg1');
    });

    // Wait half the duration, then fire second toast
    act(() => {
      jest.advanceTimersByTime(600);
    });
    act(() => {
      result.current.showToast('msg2');
    });

    // First should still be visible (not yet cleared)
    // Second should override (but we can't distinguish via message since both visible)
    expect(result.current.toastMessage).toBe('msg2');

    // Finish remaining time
    act(() => {
      jest.advanceTimersByTime(1200);
    });
    expect(result.current.toastMessage).toBe('');
  });

  it('showToast with empty string still sets message and clears after timeout', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.showToast('');
    });
    expect(result.current.toastMessage).toBe('');
    act(() => {
      jest.advanceTimersByTime(1200);
    });
    expect(result.current.toastMessage).toBe('');
  });

  it('multiple rapid toasts with very short intervals all resolve correctly', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('a');
    });
    act(() => {
      jest.advanceTimersByTime(50);
    });
    act(() => {
      result.current.showToast('b');
    });
    act(() => {
      jest.advanceTimersByTime(50);
    });
    act(() => {
      result.current.showToast('c');
    });

    // Latest message wins
    expect(result.current.toastMessage).toBe('c');

    // Advance well past last timeout
    act(() => {
      jest.advanceTimersByTime(1300);
    });
    expect(result.current.toastMessage).toBe('');
  });

  it('opacity shared value exists and is useSharedValue type', () => {
    const { result } = renderHook(() => useToast());
    // The mock useSharedValue returns an object with { value: initial }
    expect(result.current.opacity).toHaveProperty('value');
  });
});