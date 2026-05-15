/**
 * Unit tests for src/hooks/useCamera.ts
 *
 * Mocks: useCameraPermissions (expo-camera),
 *        supportsRawCapture (services/camera2),
 *        saveAppSettings (services/settings)
 */

jest.mock('expo-camera', () => ({
  CameraType: { back: 'back', front: 'front' },
  useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
}));

jest.mock('../../services/camera2', () => ({
  supportsRawCapture: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('../../services/settings', () => ({
  saveAppSettings: jest.fn(() => Promise.resolve()),
}));

import { act, renderHook } from '@testing-library/react-native';
import { useCamera } from '../useCamera';
import { useCameraPermissions } from 'expo-camera';
import { supportsRawCapture } from '../../services/camera2';
import { saveAppSettings } from '../../services/settings';

const mockUseCameraPermissions = useCameraPermissions as jest.Mock;
const mockSupportsRawCapture = supportsRawCapture as jest.Mock;
const mockSaveAppSettings = saveAppSettings as jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockSupportsRawCapture.mockResolvedValue(true);
  mockSaveAppSettings.mockResolvedValue();
  mockUseCameraPermissions.mockReturnValue([{ granted: true }, jest.fn()]);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('initial state', () => {
  it('defaults facing to back camera', () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current.facing).toBe('back');
  });

  it('defaults cameraReady to false', () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current.cameraReady).toBe(false);
  });

  it('defaults rawMode based on initialRawMode option', () => {
    const { result: r1 } = renderHook(() => useCamera({ initialRawMode: false }));
    expect(r1.current.rawMode).toBe(false);
    const { result: r2 } = renderHook(() => useCamera({ initialRawMode: true }));
    expect(r2.current.rawMode).toBe(true);
  });

  it('defaults selectedMode to photo', () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current.selectedMode).toBe('photo');
  });

  it('defaults timerDuration to 3', () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current.timerDuration).toBe(3);
  });

  it('defaults mode to picture', () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current.mode).toBe('picture');
  });

  it('defaults isRecording to false', () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current.isRecording).toBe(false);
  });

  it('cameraRef is a React ref object with current property', () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current.cameraRef).toHaveProperty('current');
  });

  it('permissionGranted is true when granted', () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current.permissionGranted).toBe(true);
  });

  it('permissionGranted is false when not granted', () => {
    mockUseCameraPermissions.mockReturnValue([{ granted: false }, jest.fn()]);
    const { result } = renderHook(() => useCamera());
    expect(result.current.permissionGranted).toBe(false);
  });

  it('initialMode option sets selectedMode', () => {
    const { result } = renderHook(() => useCamera({ initialMode: 'video' }));
    expect(result.current.selectedMode).toBe('video');
  });
});

describe('switchCamera', () => {
  it('toggles facing from back to front', () => {
    const { result } = renderHook(() => useCamera());
    act(() => { result.current.switchCamera(); });
    expect(result.current.facing).toBe('front');
  });

  it('toggles facing from front back to back', () => {
    const { result } = renderHook(() => useCamera());
    act(() => { result.current.switchCamera(); });
    act(() => { result.current.switchCamera(); });
    expect(result.current.facing).toBe('back');
  });

  it('calls onFacingChange callback with new facing', () => {
    const onFacingChange = jest.fn();
    const { result } = renderHook(() => useCamera({ onFacingChange }));
    act(() => { result.current.switchCamera(); });
    expect(onFacingChange).toHaveBeenCalledWith('front');
  });
});

describe('setCameraReady', () => {
  it('sets cameraReady to true', () => {
    const { result } = renderHook(() => useCamera());
    act(() => { result.current.setCameraReady(true); });
    expect(result.current.cameraReady).toBe(true);
  });

  it('sets cameraReady to false', () => {
    const { result } = renderHook(() => useCamera());
    act(() => { result.current.setCameraReady(true); });
    act(() => { result.current.setCameraReady(false); });
    expect(result.current.cameraReady).toBe(false);
  });
});

describe('toggleRawMode', () => {
  it('toggles rawMode from false to true', async () => {
    const { result } = renderHook(() => useCamera({ initialRawMode: false }));
    await act(async () => { await result.current.toggleRawMode(); });
    expect(result.current.rawMode).toBe(true);
  });

  it('toggles rawMode from true to false', async () => {
    const { result } = renderHook(() => useCamera({ initialRawMode: true }));
    await act(async () => { await result.current.toggleRawMode(); });
    expect(result.current.rawMode).toBe(false);
  });

  it('calls saveAppSettings with showRawMode', async () => {
    const { result } = renderHook(() => useCamera({ initialRawMode: false }));
    await act(async () => { await result.current.toggleRawMode(); });
    expect(mockSaveAppSettings).toHaveBeenCalledWith({ showRawMode: true });
  });

  it('calls onSettingChange callback', async () => {
    const onSettingChange = jest.fn();
    const { result } = renderHook(() => useCamera({ onSettingChange }));
    await act(async () => { await result.current.toggleRawMode(); });
    expect(onSettingChange).toHaveBeenCalledWith('showRawMode', true);
  });
});

describe('setSelectedMode', () => {
  it('sets selectedMode to video', () => {
    const { result } = renderHook(() => useCamera());
    act(() => { result.current.setSelectedMode('video'); });
    expect(result.current.selectedMode).toBe('video');
  });

  it('updates mode to video when selectedMode changes', () => {
    const { result } = renderHook(() => useCamera());
    act(() => { result.current.setSelectedMode('video'); });
    expect(result.current.mode).toBe('video');
  });

  it('calls onModeChange callback', () => {
    const onModeChange = jest.fn();
    const { result } = renderHook(() => useCamera({ onModeChange }));
    act(() => { result.current.setSelectedMode('video'); });
    expect(onModeChange).toHaveBeenCalledWith('video');
  });
});

describe('cycleTimerDuration', () => {
  it('cycles 3 → 5 → 10 → 3', async () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current.timerDuration).toBe(3);
    await act(async () => { await result.current.cycleTimerDuration(); });
    expect(result.current.timerDuration).toBe(5);
    await act(async () => { await result.current.cycleTimerDuration(); });
    expect(result.current.timerDuration).toBe(10);
    await act(async () => { await result.current.cycleTimerDuration(); });
    expect(result.current.timerDuration).toBe(3);
  });

  it('calls saveAppSettings with new timerDuration', async () => {
    const { result } = renderHook(() => useCamera());
    await act(async () => { await result.current.cycleTimerDuration(); });
    expect(mockSaveAppSettings).toHaveBeenCalledWith({ timerDuration: 5 });
  });
});

describe('setTimerDuration', () => {
  it('sets timerDuration to provided value', () => {
    const { result } = renderHook(() => useCamera());
    act(() => { result.current.setTimerDuration(10); });
    expect(result.current.timerDuration).toBe(10);
  });

  it('sets timerDuration to 5', () => {
    const { result } = renderHook(() => useCamera());
    act(() => { result.current.setTimerDuration(5); });
    expect(result.current.timerDuration).toBe(5);
  });
});

describe('startRecording / stopRecording', () => {
  it('startRecording sets isRecording then resets (no cameraRef)', async () => {
    const { result } = renderHook(() => useCamera());
    await act(async () => { await result.current.startRecording(); });
    expect(result.current.isRecording).toBe(false);
  });

  it('stopRecording does nothing when isRecording is false', async () => {
    const { result } = renderHook(() => useCamera());
    await act(async () => { await result.current.stopRecording(); });
    expect(result.current.isRecording).toBe(false);
  });
});

describe('requestPermission', () => {
  it('returns permission request function from useCameraPermissions', () => {
    const mockRequest = jest.fn();
    mockUseCameraPermissions.mockReturnValue([{ granted: false }, mockRequest]);
    const { result } = renderHook(() => useCamera());
    expect(result.current.requestPermission).toBe(mockRequest);
  });
});

describe('returned shape', () => {
  it('returns all documented properties', () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current).toMatchObject({
      facing: expect.any(String),
      cameraReady: expect.any(Boolean),
      rawMode: expect.any(Boolean),
      rawSupported: expect.any(Boolean),
      selectedMode: expect.any(String),
      permission: expect.any(Object),
      permissionGranted: expect.any(Boolean),
      requestPermission: expect.any(Function),
      setCameraReady: expect.any(Function),
      switchCamera: expect.any(Function),
      toggleRawMode: expect.any(Function),
      setSelectedMode: expect.any(Function),
      cycleTimerDuration: expect.any(Function),
      timerDuration: expect.any(Number),
      setTimerDuration: expect.any(Function),
      mode: expect.stringMatching(/^(picture|video)$/),
      cameraRef: expect.any(Object),
      isRecording: expect.any(Boolean),
      startRecording: expect.any(Function),
      stopRecording: expect.any(Function),
    });
  });
});