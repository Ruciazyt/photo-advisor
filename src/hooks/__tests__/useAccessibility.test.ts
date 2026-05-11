import { renderHook, act } from '@testing-library/react-native';
import { announce, useAccessibilityAnnouncement, useAccessibilityReducedMotion, useAccessibilityButton } from '../useAccessibility';

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

beforeEach(() => {
  jest.clearAllMocks();
  (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(false);
  (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);
});

describe('announce', () => {
  it('calls AccessibilityInfo.announceForAccessibility with the message', () => {
    announce('Hello world');
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Hello world');
  });

  it('calls AccessibilityInfo.announceForAccessibility with custom politeness (assertive)', () => {
    announce('Urgent message', 'assertive');
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Urgent message');
  });

  it('calls AccessibilityInfo.announceForAccessibility with custom politeness (polite)', () => {
    announce('Polite message', 'polite');
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Polite message');
  });
});

describe('useAccessibilityAnnouncement', () => {
  it('returns announce function and isScreenReaderEnabled', () => {
    const { result } = renderHook(() => useAccessibilityAnnouncement());
    expect(result.current).toHaveProperty('announce');
    expect(result.current).toHaveProperty('isScreenReaderEnabled');
    expect(typeof result.current.announce).toBe('function');
    expect(typeof result.current.isScreenReaderEnabled).toBe('boolean');
  });

  it('announce calls AccessibilityInfo.announceForAccessibility', async () => {
    const { result } = renderHook(() => useAccessibilityAnnouncement());
    await act(async () => {
      result.current.announce('Test announcement');
    });
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Test announcement');
  });

  it('subscribes to screenReaderChanged listener', () => {
    renderHook(() => useAccessibilityAnnouncement());
    expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith('screenReaderChanged', expect.any(Function));
  });

  it('cleans up subscription on unmount', () => {
    const removeMock = jest.fn();
    (AccessibilityInfo.addEventListener as jest.Mock).mockReturnValue({ remove: removeMock });
    const { unmount } = renderHook(() => useAccessibilityAnnouncement());
    unmount();
    expect(removeMock).toHaveBeenCalledTimes(1);
  });
});

describe('useAccessibilityReducedMotion', () => {
  it('returns reducedMotion false initially', () => {
    const { result } = renderHook(() => useAccessibilityReducedMotion());
    expect(result.current.reducedMotion).toBe(false);
  });

  it('subscribes to reduceMotionChanged listener', () => {
    renderHook(() => useAccessibilityReducedMotion());
    expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith('reduceMotionChanged', expect.any(Function));
  });
});

describe('useAccessibilityButton', () => {
  it('returns correct accessibilityLabel, accessibilityRole, accessibilityState (disabled when enabled=false)', () => {
    const { result } = renderHook(() =>
      useAccessibilityButton({ label: 'Submit', enabled: false })
    );
    expect(result.current).toEqual({
      accessibilityLabel: 'Submit',
      accessibilityRole: 'button',
      accessibilityState: { disabled: true },
    });
  });

  it('adds accessibilityHint when hint is provided', () => {
    const { result } = renderHook(() =>
      useAccessibilityButton({ label: 'Submit', hint: 'Press to submit the form' })
    );
    expect(result.current).toEqual({
      accessibilityLabel: 'Submit',
      accessibilityRole: 'button',
      accessibilityState: { disabled: false },
      accessibilityHint: 'Press to submit the form',
    });
  });

  it('different roles produce different accessibilityRole values', () => {
    const { result: buttonResult } = renderHook(() =>
      useAccessibilityButton({ label: 'test', role: 'button' })
    );
    expect(buttonResult.current.accessibilityRole).toBe('button');

    const { result: menuResult } = renderHook(() =>
      useAccessibilityButton({ label: 'test', role: 'menuitem' })
    );
    expect(menuResult.current.accessibilityRole).toBe('menuitem');

    const { result: tabResult } = renderHook(() =>
      useAccessibilityButton({ label: 'test', role: 'tab' })
    );
    expect(tabResult.current.accessibilityRole).toBe('tab');

    const { result: adjustableResult } = renderHook(() =>
      useAccessibilityButton({ label: 'test', role: 'adjustable' })
    );
    expect(adjustableResult.current.accessibilityRole).toBe('adjustable');
  });
});