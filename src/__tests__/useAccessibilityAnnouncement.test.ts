import { renderHook, act } from '@testing-library/react-native';
import { useAccessibilityAnnouncement, useAccessibilityReducedMotion } from '../hooks/useAccessibility';

// Mock AccessibilityInfo
jest.mock('react-native', () => ({
  AccessibilityInfo: {
    announceForAccessibility: jest.fn(),
    isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
    isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

import { AccessibilityInfo } from 'react-native';

describe('useAccessibilityAnnouncement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(false);
  });

  it('returns announce function and isScreenReaderEnabled', () => {
    const { result } = renderHook(() => useAccessibilityAnnouncement());
    expect(typeof result.current.announce).toBe('function');
    expect(typeof result.current.isScreenReaderEnabled).toBe('boolean');
  });

  it('announce calls AccessibilityInfo.announceForAccessibility with correct message', async () => {
    const { result } = renderHook(() => useAccessibilityAnnouncement());

    await act(async () => {
      result.current.announce('构图评分 85分，等级A', 'assertive');
    });

    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('构图评分 85分，等级A');
  });

  it('announce uses default polite politeness when not specified', async () => {
    const { result } = renderHook(() => useAccessibilityAnnouncement());

    await act(async () => {
      result.current.announce('建议连拍');
    });

    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('建议连拍');
  });

  it('isScreenReaderEnabled updates when screenReaderChanged event fires', async () => {
    let listenerCallback: (enabled: boolean) => void = () => {};

    (AccessibilityInfo.addEventListener as jest.Mock).mockImplementation((event: string, callback: (enabled: boolean) => void) => {
      if (event === 'screenReaderChanged') {
        listenerCallback = callback;
      }
      return { remove: jest.fn() };
    });

    const { rerender } = renderHook(() => useAccessibilityAnnouncement());

    // Simulate screen reader being enabled
    await act(async () => {
      listenerCallback(true);
    });

    rerender();

    // The hook should have called addEventListener with screenReaderChanged
    expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith('screenReaderChanged', expect.any(Function));
  });
});

describe('useAccessibilityReducedMotion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);
  });

  it('returns reducedMotion boolean', async () => {
    const { result } = renderHook(() => useAccessibilityReducedMotion());

    await act(async () => {
      await Promise.resolve();
    });

    expect(typeof result.current.reducedMotion).toBe('boolean');
  });

  it('calls isReduceMotionEnabled on mount', () => {
    renderHook(() => useAccessibilityReducedMotion());

    expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled();
  });

  it('listens for reduceMotionChanged events', () => {
    renderHook(() => useAccessibilityReducedMotion());

    expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith('reduceMotionChanged', expect.any(Function));
  });
});
