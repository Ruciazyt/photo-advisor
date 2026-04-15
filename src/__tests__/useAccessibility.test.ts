import { renderHook } from '@testing-library/react-native';
import { useAccessibilityButton, announce, useAccessibilityReducedMotion } from '../hooks/useAccessibility';

// Mock AccessibilityInfo
jest.mock('react-native', () => ({
  AccessibilityInfo: {
    announceForAccessibility: jest.fn(),
    isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

import { AccessibilityInfo } from 'react-native';

describe('useAccessibilityButton', () => {
  it('returns accessibilityLabel', () => {
    const result = useAccessibilityButton({ label: '测试按钮' });
    expect(result.accessibilityLabel).toBe('测试按钮');
  });

  it('returns accessibilityHint when provided', () => {
    const result = useAccessibilityButton({
      label: '测试按钮',
      hint: '点击后执行操作',
    });
    expect(result.accessibilityHint).toBe('点击后执行操作');
  });

  it('does not include accessibilityHint when not provided', () => {
    const result = useAccessibilityButton({ label: '测试按钮' });
    expect(result.accessibilityHint).toBeUndefined();
  });

  it('returns accessibilityRole when provided', () => {
    const result = useAccessibilityButton({
      label: '测试按钮',
      role: 'tab',
    });
    expect(result.accessibilityRole).toBe('tab');
  });

  it('defaults accessibilityRole to button when not provided', () => {
    const result = useAccessibilityButton({ label: '测试按钮' });
    expect(result.accessibilityRole).toBe('button');
  });

  it('marks as disabled via accessibilityState when enabled=false', () => {
    const result = useAccessibilityButton({
      label: '测试按钮',
      enabled: false,
    });
    expect(result.accessibilityState).toEqual({ disabled: true });
  });

  it('marks as not disabled via accessibilityState when enabled=true', () => {
    const result = useAccessibilityButton({
      label: '测试按钮',
      enabled: true,
    });
    expect(result.accessibilityState).toEqual({ disabled: false });
  });

  it('marks as not disabled by default', () => {
    const result = useAccessibilityButton({ label: '测试按钮' });
    expect(result.accessibilityState).toEqual({ disabled: false });
  });

  it('combines all props correctly', () => {
    const result = useAccessibilityButton({
      label: '自定义标签',
      hint: '这是一个提示',
      role: 'menuitem',
      enabled: false,
    });
    expect(result).toEqual({
      accessibilityLabel: '自定义标签',
      accessibilityHint: '这是一个提示',
      accessibilityRole: 'menuitem',
      accessibilityState: { disabled: true },
    });
  });
});

describe('announce', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls AccessibilityInfo.announceForAccessibility with the given message', () => {
    announce('构图评分 85分，等级A');
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('构图评分 85分，等级A');
  });

  it('announce works with assertive politeness', () => {
    announce('3秒', 'assertive');
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('3秒');
  });

  it('announce works with polite politeness', () => {
    announce('建议连拍', 'polite');
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('建议连拍');
  });
});

describe('useAccessibilityReducedMotion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);
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
