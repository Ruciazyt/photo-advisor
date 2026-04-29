/**
 * useHaptics unit tests
 */

import { renderHook, act } from '@testing-library/react-native';
import { useHaptics } from '../hooks/useHaptics';
import * as Haptics from 'expo-haptics';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'Light',
    Medium: 'Medium',
    Heavy: 'Heavy',
  },
  NotificationFeedbackType: {
    Success: 'Success',
    Warning: 'Warning',
    Error: 'Error',
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useHaptics', () => {
  it('returns all haptic methods', () => {
    const { result } = renderHook(() => useHaptics());
    expect(typeof result.current.triggerLevelHaptic).toBe('function');
    expect(typeof result.current.lightImpact).toBe('function');
    expect(typeof result.current.mediumImpact).toBe('function');
    expect(typeof result.current.heavyImpact).toBe('function');
    expect(typeof result.current.successNotification).toBe('function');
    expect(typeof result.current.warningNotification).toBe('function');
    expect(typeof result.current.errorNotification).toBe('function');
  });

  describe('lightImpact', () => {
    it('calls impactAsync with Light style', () => {
      const { result } = renderHook(() => useHaptics());
      act(() => {
        result.current.lightImpact();
      });
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('can be called multiple times', () => {
      const { result } = renderHook(() => useHaptics());
      act(() => {
        result.current.lightImpact();
        result.current.lightImpact();
      });
      expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('mediumImpact', () => {
    it('calls impactAsync with Medium style', () => {
      const { result } = renderHook(() => useHaptics());
      act(() => {
        result.current.mediumImpact();
      });
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });
  });

  describe('heavyImpact', () => {
    it('calls impactAsync with Heavy style', () => {
      const { result } = renderHook(() => useHaptics());
      act(() => {
        result.current.heavyImpact();
      });
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
    });
  });

  describe('successNotification', () => {
    it('calls notificationAsync with Success type', () => {
      const { result } = renderHook(() => useHaptics());
      act(() => {
        result.current.successNotification();
      });
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    });
  });

  describe('warningNotification', () => {
    it('calls notificationAsync with Warning type', () => {
      const { result } = renderHook(() => useHaptics());
      act(() => {
        result.current.warningNotification();
      });
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Warning);
    });
  });

  describe('errorNotification', () => {
    it('calls notificationAsync with Error type', () => {
      const { result } = renderHook(() => useHaptics());
      act(() => {
        result.current.errorNotification();
      });
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
    });
  });

  describe('triggerLevelHaptic', () => {
    it('calls notificationAsync with Success type', () => {
      const { result } = renderHook(() => useHaptics());
      act(() => {
        result.current.triggerLevelHaptic();
      });
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    });

    it('respects cooldown — second call within 1500ms is ignored', () => {
      const { result } = renderHook(() => useHaptics());
      act(() => {
        result.current.triggerLevelHaptic();
        result.current.triggerLevelHaptic();
      });
      // Only the first call should trigger
      expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
    });

    it('allows a second trigger after cooldown passes', () => {
      const { result } = renderHook(() => useHaptics());
      act(() => {
        result.current.triggerLevelHaptic();
      });
      expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);

      // Fast-forward time by 1500ms
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 1500);

      act(() => {
        result.current.triggerLevelHaptic();
      });
      expect(Haptics.notificationAsync).toHaveBeenCalledTimes(2);

      jest.restoreAllMocks();
    });
  });
});
