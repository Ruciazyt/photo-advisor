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

  it('showToast animates message then clears after 1200ms', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toastMessage).toBe('');

    act(() => {
      result.current.showToast('test message');
    });
    expect(result.current.toastMessage).toBe('test message');

    // Advance past the 1200ms timeout
    act(() => {
      jest.advanceTimersByTime(1200);
    });
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

    // Advance 500ms — first timeout would have fired at 1200ms but was cancelled
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.toastMessage).toBe('second');

    // Advance remaining time — second toast clears
    act(() => {
      jest.advanceTimersByTime(800);
    });
    expect(result.current.toastMessage).toBe('');
  });

  it('second showToast replaces first and resets timer independently', () => {
    const { result } = renderHook(() => useToast());

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

    expect(result.current.toastMessage).toBe('msg2');

    // Advance past second toast's full duration
    act(() => {
      jest.advanceTimersByTime(1200);
    });
    expect(result.current.toastMessage).toBe('');
  });

  it('showToast with empty string still clears after timeout', () => {
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

  it('multiple rapid toasts with very short intervals resolve correctly', () => {
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

    expect(result.current.toastMessage).toBe('c');

    act(() => {
      jest.advanceTimersByTime(1300);
    });
    expect(result.current.toastMessage).toBe('');
  });

  it('opacity shared value object exists with value property', () => {
    const { result } = renderHook(() => useToast());
    // The mock useSharedValue returns { value: initial }
    expect(result.current.opacity).toHaveProperty('value');
  });

  it('three toasts in sequence each get their own independent timer', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('one');
    });
    expect(result.current.toastMessage).toBe('one');

    act(() => {
      jest.advanceTimersByTime(400);
    });
    act(() => {
      result.current.showToast('two');
    });
    expect(result.current.toastMessage).toBe('two');

    act(() => {
      jest.advanceTimersByTime(400);
    });
    act(() => {
      result.current.showToast('three');
    });
    expect(result.current.toastMessage).toBe('three');

    // Only 800ms elapsed for third toast — still visible
    act(() => {
      jest.advanceTimersByTime(500);
    });
    // third toast fired at 800ms, fires at 2000ms total
    // at 1300ms it's still pending
    expect(result.current.toastMessage).toBe('three');

    act(() => {
      jest.advanceTimersByTime(700);
    });
    expect(result.current.toastMessage).toBe('');
  });
});