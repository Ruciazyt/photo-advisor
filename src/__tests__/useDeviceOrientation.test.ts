// This triggers the manual mock from __mocks__/expo-sensors.js
jest.mock('expo-sensors');

import { renderHook, act } from '@testing-library/react-native';
import { useDeviceOrientation } from '../hooks/useDeviceOrientation';
// Access the mocked functions via require
const { Accelerometer } = require('expo-sensors');

describe('useDeviceOrientation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Accelerometer.addListener.mockReturnValue({ remove: jest.fn() });
  });

  it('should set available to false when accelerometer is not available', async () => {
    Accelerometer.isAvailableAsync.mockResolvedValue(false);

    const { result } = renderHook(() => useDeviceOrientation());

    await act(async () => {
      await result.current; // wait for hook to settle
    });

    expect(result.current.available).toBe(false);
    expect(Accelerometer.addListener).not.toHaveBeenCalled();
  });

  it('should set available to true and add subscription when accelerometer is available', async () => {
    Accelerometer.isAvailableAsync.mockResolvedValue(true);
    Accelerometer.addListener.mockReturnValue({ remove: jest.fn() });

    const { result } = renderHook(() => useDeviceOrientation());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.available).toBe(true);
    expect(Accelerometer.setUpdateInterval).toHaveBeenCalledWith(100);
    expect(Accelerometer.addListener).toHaveBeenCalled();
  });

  it('should compute orientation correctly (pitch and roll) for level device', async () => {
    Accelerometer.isAvailableAsync.mockResolvedValue(true);
    let listenerCb: (m: { x: number; y: number; z: number }) => void;
    Accelerometer.addListener.mockImplementation((cb: (m: { x: number; y: number; z: number }) => void) => {
      listenerCb = cb;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useDeviceOrientation());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Simulate a measurement: level on flat surface (z=9.81, x=0, y=0)
    await act(async () => {
      listenerCb!({ x: 0, y: 0, z: 9.81 });
    });

    // pitch = atan2(-x, sqrt(y^2+z^2)) ≈ 0, roll = atan2(y, z) ≈ 0
    expect(result.current.orientation.pitch).toBeCloseTo(0);
    expect(result.current.orientation.roll).toBeCloseTo(0);
  });

  it('should compute non-zero pitch for forward tilt', async () => {
    Accelerometer.isAvailableAsync.mockResolvedValue(true);
    let listenerCb: (m: { x: number; y: number; z: number }) => void;
    Accelerometer.addListener.mockImplementation((cb: (m: { x: number; y: number; z: number }) => void) => {
      listenerCb = cb;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useDeviceOrientation());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Phone tilted forward: x positive, z reduced
    await act(async () => {
      listenerCb!({ x: 4.905, y: 0, z: 8.492 });
    });

    // pitch = atan2(-4.905, sqrt(0+72.11)) ≈ -30
    expect(result.current.orientation.pitch).toBeCloseTo(-30, 0);
  });

  it('should remove subscription on unmount', async () => {
    Accelerometer.isAvailableAsync.mockResolvedValue(true);
    const removeMock = jest.fn();
    Accelerometer.addListener.mockReturnValue({ remove: removeMock });

    const { unmount } = renderHook(() => useDeviceOrientation());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    unmount();

    expect(removeMock).toHaveBeenCalled();
  });

  it('should call setUpdateInterval with custom interval', async () => {
    Accelerometer.isAvailableAsync.mockResolvedValue(true);
    Accelerometer.addListener.mockReturnValue({ remove: jest.fn() });

    renderHook(() => useDeviceOrientation(250));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(Accelerometer.setUpdateInterval).toHaveBeenCalledWith(250);
  });
});
