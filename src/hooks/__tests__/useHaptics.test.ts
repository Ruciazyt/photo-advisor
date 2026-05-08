import { renderHook } from '@testing-library/react-native';
import { useHaptics } from '../useHaptics';
import * as Haptics from 'expo-haptics';

// The __mocks__/expo-haptics.js global mock handles the interception.
// We reference Haptics here to access the mock functions for assertions.

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  // Reset mock functions from __mocks__/expo-haptics.js
  (Haptics.impactAsync as jest.Mock).mockClear();
  (Haptics.notificationAsync as jest.Mock).mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useHaptics', () => {
  describe('triggerLevelHaptic', () => {
    it('calls notificationAsync with Success', () => {
      const { result } = renderHook(() => useHaptics());
      result.current.triggerLevelHaptic();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    });

    it('fires on first call (no cooldown initially)', () => {
      const { result } = renderHook(() => useHaptics());
      result.current.triggerLevelHaptic();
      expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
    });

    it('respects 1500ms cooldown - blocks second call within window', () => {
      const { result } = renderHook(() => useHaptics());

      result.current.triggerLevelHaptic();
      expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(500);
      result.current.triggerLevelHaptic();
      expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1); // blocked by cooldown

      jest.advanceTimersByTime(999); // total 1499ms - still blocked
      result.current.triggerLevelHaptic();
      expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(1); // now >= 1500ms elapsed
      result.current.triggerLevelHaptic();
      expect(Haptics.notificationAsync).toHaveBeenCalledTimes(2);
    });

    it('fires again after cooldown fully expires', () => {
      const { result } = renderHook(() => useHaptics());

      result.current.triggerLevelHaptic();
      expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(1500);
      result.current.triggerLevelHaptic();
      expect(Haptics.notificationAsync).toHaveBeenCalledTimes(2);
    });

    it('tracks cooldown independently for each fire cycle', () => {
      const { result } = renderHook(() => useHaptics());

      result.current.triggerLevelHaptic();
      expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(1600); // cooldown over
      result.current.triggerLevelHaptic();
      expect(Haptics.notificationAsync).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(100); // only 100ms into new cycle — cooldown blocks
      result.current.triggerLevelHaptic();
      expect(Haptics.notificationAsync).toHaveBeenCalledTimes(2); // blocked
    });
  });

  describe('lightImpact', () => {
    it('calls impactAsync with Light', () => {
      const { result } = renderHook(() => useHaptics());
      result.current.lightImpact();
      expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    });
  });

  describe('mediumImpact', () => {
    it('calls impactAsync with Medium', () => {
      const { result } = renderHook(() => useHaptics());
      result.current.mediumImpact();
      expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
    });
  });

  describe('heavyImpact', () => {
    it('calls impactAsync with Heavy', () => {
      const { result } = renderHook(() => useHaptics());
      result.current.heavyImpact();
      expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy');
    });
  });

  describe('successNotification', () => {
    it('calls notificationAsync with Success', () => {
      const { result } = renderHook(() => useHaptics());
      result.current.successNotification();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    });
  });

  describe('warningNotification', () => {
    it('calls notificationAsync with Warning', () => {
      const { result } = renderHook(() => useHaptics());
      result.current.warningNotification();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning');
    });
  });

  describe('errorNotification', () => {
    it('calls notificationAsync with Error', () => {
      const { result } = renderHook(() => useHaptics());
      result.current.errorNotification();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('error');
    });
  });

  it('returns all 7 haptic functions', () => {
    const { result } = renderHook(() => useHaptics());
    expect(result.current).toHaveProperty('triggerLevelHaptic');
    expect(result.current).toHaveProperty('lightImpact');
    expect(result.current).toHaveProperty('mediumImpact');
    expect(result.current).toHaveProperty('heavyImpact');
    expect(result.current).toHaveProperty('successNotification');
    expect(result.current).toHaveProperty('warningNotification');
    expect(result.current).toHaveProperty('errorNotification');
  });

  it('methods are stable across re-renders', () => {
    const { result, rerender } = renderHook(() => useHaptics());
    const firstLightImpact = result.current.lightImpact;
    rerender({});
    expect(result.current.lightImpact).toBe(firstLightImpact);
  });
});