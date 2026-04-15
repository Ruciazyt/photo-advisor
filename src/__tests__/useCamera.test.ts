/**
 * Tests for useCamera hook — extracted camera state and permissions.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useCamera } from '../hooks/useCamera';

// --- Mock dependencies ---
jest.mock('expo-camera', () => ({
  useCameraPermissions: jest.fn(),
}));

jest.mock('../hooks/useCameraCapture', () => ({
  supportsRawCapture: jest.fn().mockResolvedValue(true),
}));

jest.mock('../services/settings', () => ({
  saveAppSettings: jest.fn().mockResolvedValue(undefined),
}));

import { useCameraPermissions } from 'expo-camera';

describe('useCamera', () => {
  const mockRequestPermission = jest.fn().mockResolvedValue({ granted: true } as any);

  beforeEach(() => {
    jest.clearAllMocks();
    (useCameraPermissions as jest.Mock).mockReturnValue([
      { granted: false, status: 'undetermined' },
      mockRequestPermission,
    ]);
  });

  describe('initial state', () => {
    it('defaults facing to back', () => {
      const { result } = renderHook(() => useCamera());
      expect(result.current.facing).toBe('back');
    });

    it('defaults cameraReady to false', () => {
      const { result } = renderHook(() => useCamera());
      expect(result.current.cameraReady).toBe(false);
    });

    it('defaults rawMode to false', () => {
      const { result } = renderHook(() => useCamera());
      expect(result.current.rawMode).toBe(false);
    });

    it('defaults selectedMode to photo', () => {
      const { result } = renderHook(() => useCamera());
      expect(result.current.selectedMode).toBe('photo');
    });

    it('defaults timerDuration to 3', () => {
      const { result } = renderHook(() => useCamera());
      expect(result.current.timerDuration).toBe(3);
    });

    it('uses initialMode option when provided', () => {
      const { result } = renderHook(() => useCamera({ initialMode: 'video' }));
      expect(result.current.selectedMode).toBe('video');
    });
  });

  describe('permission', () => {
    it('exposes permission status from useCameraPermissions', () => {
      const { result } = renderHook(() => useCamera());
      expect(result.current.permission).toBeDefined();
      expect(result.current.permissionGranted).toBe(false);
    });

    it('permissionGranted is true when permission.granted is true', () => {
      (useCameraPermissions as jest.Mock).mockReturnValue([
        { granted: true, status: 'granted' },
        mockRequestPermission,
      ]);
      const { result } = renderHook(() => useCamera());
      expect(result.current.permissionGranted).toBe(true);
    });

    it('requestPermission delegates to useCameraPermissions', async () => {
      const { result } = renderHook(() => useCamera());
      await act(async () => {
        await result.current.requestPermission();
      });
      expect(mockRequestPermission).toHaveBeenCalled();
    });
  });

  describe('switchCamera', () => {
    it('toggles facing from back to front', () => {
      const { result } = renderHook(() => useCamera());
      expect(result.current.facing).toBe('back');
      act(() => { result.current.switchCamera(); });
      expect(result.current.facing).toBe('front');
    });

    it('toggles facing from front to back', () => {
      const { result } = renderHook(() => useCamera());
      act(() => { result.current.switchCamera(); });
      expect(result.current.facing).toBe('front');
      act(() => { result.current.switchCamera(); });
      expect(result.current.facing).toBe('back');
    });

    it('calls onFacingChange callback when provided', () => {
      const onFacingChange = jest.fn();
      const { result } = renderHook(() => useCamera({ onFacingChange }));
      act(() => { result.current.switchCamera(); });
      expect(onFacingChange).toHaveBeenCalledWith('front');
    });
  });

  describe('toggleRawMode', () => {
    it('toggles rawMode from false to true', () => {
      const { result } = renderHook(() => useCamera());
      expect(result.current.rawMode).toBe(false);
      act(() => { result.current.toggleRawMode(); });
      expect(result.current.rawMode).toBe(true);
    });

    it('toggles rawMode from true to false', () => {
      const { result } = renderHook(() => useCamera());
      act(() => { result.current.toggleRawMode(); });
      expect(result.current.rawMode).toBe(true);
      act(() => { result.current.toggleRawMode(); });
      expect(result.current.rawMode).toBe(false);
    });
  });

  describe('setSelectedMode', () => {
    it('sets selectedMode to the given value', () => {
      const { result } = renderHook(() => useCamera());
      act(() => { result.current.setSelectedMode('video'); });
      expect(result.current.selectedMode).toBe('video');
    });

    it('calls onModeChange callback when provided', () => {
      const onModeChange = jest.fn();
      const { result } = renderHook(() => useCamera({ onModeChange }));
      act(() => { result.current.setSelectedMode('portrait'); });
      expect(onModeChange).toHaveBeenCalledWith('portrait');
    });
  });

  describe('setCameraReady', () => {
    it('sets cameraReady to true', () => {
      const { result } = renderHook(() => useCamera());
      expect(result.current.cameraReady).toBe(false);
      act(() => { result.current.setCameraReady(true); });
      expect(result.current.cameraReady).toBe(true);
    });

    it('sets cameraReady to false', () => {
      const { result } = renderHook(() => useCamera());
      act(() => { result.current.setCameraReady(true); });
      expect(result.current.cameraReady).toBe(true);
      act(() => { result.current.setCameraReady(false); });
      expect(result.current.cameraReady).toBe(false);
    });
  });

  describe('cycleTimerDuration', () => {
    it('cycles from 3 to 5', async () => {
      const { result } = renderHook(() => useCamera());
      expect(result.current.timerDuration).toBe(3);
      await act(async () => { await result.current.cycleTimerDuration(); });
      expect(result.current.timerDuration).toBe(5);
    });

    it('cycles from 5 to 10', async () => {
      const { result } = renderHook(() => useCamera());
      await act(async () => { await result.current.cycleTimerDuration(); }); // 3 -> 5
      await act(async () => { await result.current.cycleTimerDuration(); }); // 5 -> 10
      expect(result.current.timerDuration).toBe(10);
    });

    it('cycles from 10 back to 3', async () => {
      const { result } = renderHook(() => useCamera());
      // Already at 3, cycle through: 3->5->10->3
      await act(async () => { await result.current.cycleTimerDuration(); });
      await act(async () => { await result.current.cycleTimerDuration(); });
      await act(async () => { await result.current.cycleTimerDuration(); });
      expect(result.current.timerDuration).toBe(3);
    });

    it('calls saveAppSettings when cycling', async () => {
      const { result } = renderHook(() => useCamera());
      const { saveAppSettings } = require('../services/settings');
      await act(async () => { await result.current.cycleTimerDuration(); });
      expect(saveAppSettings).toHaveBeenCalledWith({ timerDuration: 5 });
    });
  });

  describe('setTimerDuration', () => {
    it('sets timerDuration directly', () => {
      const { result } = renderHook(() => useCamera());
      act(() => { result.current.setTimerDuration(10); });
      expect(result.current.timerDuration).toBe(10);
    });
  });

  describe('rawSupported', () => {
    it('rawSupported is set after supportsRawCapture resolves', async () => {
      const { supportsRawCapture } = require('../hooks/useCameraCapture');
      supportsRawCapture.mockResolvedValue(true);
      const { result } = renderHook(() => useCamera());
      await waitFor(() => {
        expect(result.current.rawSupported).toBe(true);
      });
    });
  });
});
