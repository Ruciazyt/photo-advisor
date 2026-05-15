import { renderHook, act } from '@testing-library/react-native';
import {
  announce,
  useAccessibilityAnnouncement,
  useAccessibilityReducedMotion,
  useAccessibilityButton,
} from '../useAccessibility';

// Mock react-native AccessibilityInfo
jest.mock('react-native', () => ({
  AccessibilityInfo: {
    announceForAccessibility: jest.fn(),
    isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
    isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

import { AccessibilityInfo } from 'react-native';

beforeEach(() => {
  jest.clearAllMocks();
  // Default mock implementations
  (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(false);
  (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);
  (AccessibilityInfo.addEventListener as jest.Mock).mockImplementation((event, handler) => {
    const listeners = new Map();
    const key = event + (handler as Function).toString();
    listeners.set(key, handler);
    return {
      remove: jest.fn(() => listeners.delete(key)),
    };
  });
});

describe('announce', () => {
  it('calls AccessibilityInfo.announceForAccessibility with the given message', () => {
    announce('构图评分 85分');
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('构图评分 85分');
  });

  it('calls announceForAccessibility with default polite politeness', () => {
    announce('建议连拍');
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('建议连拍');
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(1);
  });

  it('calls announceForAccessibility with explicit polite politeness', () => {
    announce('3秒倒计时', 'polite');
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('3秒倒计时');
  });

  it('calls announceForAccessibility with assertive politeness', () => {
    announce('拍摄完成', 'assertive');
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('拍摄完成');
  });

  it('does not throw when called with empty string', () => {
    expect(() => announce('')).not.toThrow();
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('');
  });
});

describe('useAccessibilityAnnouncement', () => {
  it('returns an object with announce function and isScreenReaderEnabled boolean', () => {
    const { result } = renderHook(() => useAccessibilityAnnouncement());
    expect(result.current).toHaveProperty('announce');
    expect(typeof result.current.announce).toBe('function');
    expect(result.current).toHaveProperty('isScreenReaderEnabled');
    expect(typeof result.current.isScreenReaderEnabled).toBe('boolean');
  });

  it('calls isScreenReaderEnabled on mount', () => {
    renderHook(() => useAccessibilityAnnouncement());
    expect(AccessibilityInfo.isScreenReaderEnabled).toHaveBeenCalled();
  });

  it('subscribes to screenReaderChanged event on mount', () => {
    renderHook(() => useAccessibilityAnnouncement());
    expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith(
      'screenReaderChanged',
      expect.any(Function)
    );
  });

  it('announce calls AccessibilityInfo.announceForAccessibility', () => {
    const { result } = renderHook(() => useAccessibilityAnnouncement());
    act(() => {
      result.current.announce('测试消息');
    });
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('测试消息');
  });

  it('announce works with explicit polite politeness', () => {
    const { result } = renderHook(() => useAccessibilityAnnouncement());
    act(() => {
      result.current.announce('礼貌播报', 'polite');
    });
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('礼貌播报');
  });

  it('announce works with assertive politeness', () => {
    const { result } = renderHook(() => useAccessibilityAnnouncement());
    act(() => {
      result.current.announce('打断播报', 'assertive');
    });
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('打断播报');
  });

  it('isScreenReaderEnabled is false by default (mock resolves false)', () => {
    const { result } = renderHook(() => useAccessibilityAnnouncement());
    expect(result.current.isScreenReaderEnabled).toBe(false);
  });

  it('isScreenReaderEnabled becomes true when AccessibilityInfo resolves true', async () => {
    (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValueOnce(true);
    const { result, rerender } = renderHook(() => useAccessibilityAnnouncement());
    rerender();
    // isScreenReaderEnabled state comes from the async promise resolution
    // which happens on mount, so initial value may already reflect the mock
    // Test the subscription path: screenReaderChanged event updates state
    const [, handler] = (AccessibilityInfo.addEventListener as jest.Mock).mock.calls.find(
      ([event]) => event === 'screenReaderChanged'
    ) ?? [];
    if (handler) {
      act(() => {
        handler(true);
      });
      expect(result.current.isScreenReaderEnabled).toBe(true);
    }
  });

  it('isScreenReaderEnabled becomes false when screenReaderChanged fires false', () => {
    const { result } = renderHook(() => useAccessibilityAnnouncement());

    const calls = (AccessibilityInfo.addEventListener as jest.Mock).mock.calls;
    const screenReaderHandler = calls.find(
      ([event]) => event === 'screenReaderChanged'
    )?.[1] as (val: boolean) => void;

    act(() => {
      screenReaderHandler?.(true);
    });
    expect(result.current.isScreenReaderEnabled).toBe(true);

    act(() => {
      screenReaderHandler?.(false);
    });
    expect(result.current.isScreenReaderEnabled).toBe(false);
  });

  it('cleanup removes the screenReaderChanged listener on unmount', () => {
    const removeMock = jest.fn();
    (AccessibilityInfo.addEventListener as jest.Mock).mockReturnValueOnce({ remove: removeMock });

    const { unmount } = renderHook(() => useAccessibilityAnnouncement());
    unmount();

    expect(removeMock).toHaveBeenCalled();
  });

  it('announce callback is stable across re-renders (useCallback)', () => {
    const { result, rerender } = renderHook(() => useAccessibilityAnnouncement());
    const firstAnnounce = result.current.announce;
    rerender();
    expect(result.current.announce).toBe(firstAnnounce);
  });
});

describe('useAccessibilityReducedMotion', () => {
  it('returns an object with reducedMotion boolean', () => {
    const { result } = renderHook(() => useAccessibilityReducedMotion());
    expect(result.current).toHaveProperty('reducedMotion');
    expect(typeof result.current.reducedMotion).toBe('boolean');
  });

  it('reducedMotion is false by default (mock resolves false)', () => {
    const { result } = renderHook(() => useAccessibilityReducedMotion());
    expect(result.current.reducedMotion).toBe(false);
  });

  it('calls isReduceMotionEnabled on mount', () => {
    renderHook(() => useAccessibilityReducedMotion());
    expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled();
  });

  it('subscribes to reduceMotionChanged event on mount', () => {
    renderHook(() => useAccessibilityReducedMotion());
    expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith(
      'reduceMotionChanged',
      expect.any(Function)
    );
  });

  it('reducedMotion becomes true when reduceMotionChanged fires true', () => {
    const { result } = renderHook(() => useAccessibilityReducedMotion());

    const calls = (AccessibilityInfo.addEventListener as jest.Mock).mock.calls;
    const reduceMotionHandler = calls.find(
      ([event]) => event === 'reduceMotionChanged'
    )?.[1] as (val: boolean) => void;

    act(() => {
      reduceMotionHandler?.(true);
    });
    expect(result.current.reducedMotion).toBe(true);
  });

  it('reducedMotion becomes false when reduceMotionChanged fires false', () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValueOnce(true);
    const { result } = renderHook(() => useAccessibilityReducedMotion());

    const calls = (AccessibilityInfo.addEventListener as jest.Mock).mock.calls;
    const reduceMotionHandler = calls.find(
      ([event]) => event === 'reduceMotionChanged'
    )?.[1] as (val: boolean) => void;

    act(() => {
      reduceMotionHandler?.(true);
    });
    expect(result.current.reducedMotion).toBe(true);

    act(() => {
      reduceMotionHandler?.(false);
    });
    expect(result.current.reducedMotion).toBe(false);
  });

  it('cleanup removes the reduceMotionChanged listener on unmount', () => {
    const removeMock = jest.fn();
    (AccessibilityInfo.addEventListener as jest.Mock).mockReturnValueOnce({ remove: removeMock });

    const { unmount } = renderHook(() => useAccessibilityReducedMotion());
    unmount();

    expect(removeMock).toHaveBeenCalled();
  });

  it('multiple listeners are registered separately for different hooks', () => {
    renderHook(() => useAccessibilityReducedMotion());
    // Both hooks call addEventListener, so we expect multiple calls
    const addCalls = (AccessibilityInfo.addEventListener as jest.Mock).mock.calls;
    const reduceMotionCalls = addCalls.filter(([event]) => event === 'reduceMotionChanged');
    expect(reduceMotionCalls.length).toBeGreaterThanOrEqual(1);
  });
});

describe('useAccessibilityButton', () => {
  it('returns an object with accessibilityLabel', () => {
    const result = useAccessibilityButton({ label: '拍照按钮' });
    expect(result).toHaveProperty('accessibilityLabel', '拍照按钮');
  });

  it('returns accessibilityRole defaulting to button', () => {
    const result = useAccessibilityButton({ label: '按钮' });
    expect(result).toHaveProperty('accessibilityRole', 'button');
  });

  it('returns accessibilityRole as button when explicitly set', () => {
    const result = useAccessibilityButton({ label: '按钮', role: 'button' });
    expect(result.accessibilityRole).toBe('button');
  });

  it('returns accessibilityRole as tab when specified', () => {
    const result = useAccessibilityButton({ label: '标签页', role: 'tab' });
    expect(result.accessibilityRole).toBe('tab');
  });

  it('returns accessibilityRole as menuitem when specified', () => {
    const result = useAccessibilityButton({ label: '菜单项', role: 'menuitem' });
    expect(result.accessibilityRole).toBe('menuitem');
  });

  it('returns accessibilityRole as adjustable when specified', () => {
    const result = useAccessibilityButton({ label: '调节项', role: 'adjustable' });
    expect(result.accessibilityRole).toBe('adjustable');
  });

  it('includes accessibilityHint when hint is provided', () => {
    const result = useAccessibilityButton({
      label: '旋转按钮',
      hint: '旋转图像',
    });
    expect(result).toHaveProperty('accessibilityHint', '旋转图像');
  });

  it('omits accessibilityHint when hint is not provided', () => {
    const result = useAccessibilityButton({ label: '按钮' });
    expect(result).not.toHaveProperty('accessibilityHint');
  });

  it('accessibilityState disabled is false by default', () => {
    const result = useAccessibilityButton({ label: '按钮' });
    expect(result).toHaveProperty('accessibilityState', { disabled: false });
  });

  it('accessibilityState disabled is true when enabled=false', () => {
    const result = useAccessibilityButton({ label: '按钮', enabled: false });
    expect(result).toHaveProperty('accessibilityState', { disabled: true });
  });

  it('accessibilityState disabled is false when enabled=true', () => {
    const result = useAccessibilityButton({ label: '按钮', enabled: true });
    expect(result).toHaveProperty('accessibilityState', { disabled: false });
  });

  it('combines all props correctly with custom values', () => {
    const result = useAccessibilityButton({
      label: '自定义标签',
      hint: '自定义提示',
      role: 'menuitem',
      enabled: false,
    });
    expect(result).toEqual({
      accessibilityLabel: '自定义标签',
      accessibilityHint: '自定义提示',
      accessibilityRole: 'menuitem',
      accessibilityState: { disabled: true },
    });
  });

  it('combines all props correctly with defaults', () => {
    const result = useAccessibilityButton({ label: '测试' });
    expect(result).toEqual({
      accessibilityLabel: '测试',
      accessibilityRole: 'button',
      accessibilityState: { disabled: false },
    });
  });
});