/**
 * Tests for useHaptics hook
 */

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

import { renderHook, act } from '@testing-library/react-native';
import { useHaptics } from '../hooks/useHaptics';
import * as Haptics from 'expo-haptics';

describe('useHaptics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('exports all haptic functions', () => {
    const { result } = renderHook(() => useHaptics());
    expect(typeof result.current.triggerLevelHaptic).toBe('function');
    expect(typeof result.current.lightImpact).toBe('function');
    expect(typeof result.current.mediumImpact).toBe('function');
    expect(typeof result.current.heavyImpact).toBe('function');
    expect(typeof result.current.successNotification).toBe('function');
    expect(typeof result.current.warningNotification).toBe('function');
    expect(typeof result.current.errorNotification).toBe('function');
  });

  describe('triggerLevelHaptic', () => {
    it('triggers success notification on first call', () => {
      const { result } = renderHook(() => useHaptics());
      act(() => {
        result.current.triggerLevelHaptic();
      });
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    });

    it('respects cooldown — second call within 1500ms does not trigger', () => {
      const { result } = renderHook(() => useHaptics());
      act(() => {
        result.current.triggerLevelHaptic();
        result.current.triggerLevelHaptic();
        result.current.triggerLevelHaptic();
      });
      // Only the first call should have triggered
      expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
    });

    it('fires again after cooldown elapses', () => {
      const { result } = renderHook(() => useHaptics());
      act(() => {
        result.current.triggerLevelHaptic();
      });
      act(() => {
        jest.advanceTimersByTime(1500);
      });
      act(() => {
        result.current.triggerLevelHaptic();
      });
      expect(Haptics.notificationAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('lightImpact', () => {
    it('triggers light impact haptic', () => {
      const { result } = renderHook(() => useHaptics());
      act(() => {
        result.current.lightImpact();
      });
      expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    });
  });

  describe('mediumImpact', () => {
    it('triggers medium impact haptic', () => {
      const { result } = renderHook(() => useHaptics());
      act(() => {
        result.current.mediumImpact();
      });
      expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
    });
  });

  describe('heavyImpact', () => {
    it('triggers heavy impact haptic', () => {
      const { result } = renderHook(() => useHaptics());
      act(() => {
        result.current.heavyImpact();
      });
      expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy');
    });
  });

  describe('successNotification', () => {
    it('triggers success notification haptic', () => {
      const { result } = renderHook(() => useHaptics());
      act(() => {
        result.current.successNotification();
      });
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    });
  });

  describe('warningNotification', () => {
    it('triggers warning notification haptic', () => {
      const { result } = renderHook(() => useHaptics());
      act(() => {
        result.current.warningNotification();
      });
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning');
    });
  });

  describe('errorNotification', () => {
    it('triggers error notification haptic', () => {
      const { result } = renderHook(() => useHaptics());
      act(() => {
        result.current.errorNotification();
      });
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('error');
    });
  });
});
