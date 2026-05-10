import { renderHook, act } from '@testing-library/react-native';
import { useDeviceOrientation } from '../useDeviceOrientation';

// Mock expo-sensors at module level (already mocked in __mocks__/expo-sensors.js)
const mockIsAvailableAsync = require('expo-sensors').Accelerometer.isAvailableAsync;
const mockSetUpdateInterval = require('expo-sensors').Accelerometer.setUpdateInterval;
const mockAddListener = require('expo-sensors').Accelerometer.addListener;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockIsAvailableAsync.mockResolvedValue(true);
  mockAddListener.mockReturnValue({ remove: jest.fn() });
});
afterEach(() => {
  jest.useRealTimers();
});

describe('useDeviceOrientation', () => {
  it('returns orientation object and available flag', () => {
    const { result } = renderHook(() => useDeviceOrientation());
    expect(result.current).toHaveProperty('orientation');
    expect(result.current).toHaveProperty('available');
    expect(typeof result.current.orientation.pitch).toBe('number');
    expect(typeof result.current.orientation.roll).toBe('number');
  });

  it('initializes with pitch=0 and roll=0', () => {
    const { result } = renderHook(() => useDeviceOrientation());
    expect(result.current.orientation.pitch).toBe(0);
    expect(result.current.orientation.roll).toBe(0);
  });

  it('reports unavailable when Accelerometer.isAvailableAsync returns false', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);
    const { result } = renderHook(() => useDeviceOrientation());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.available).toBe(false);
  });

  it('reports available when Accelerometer.isAvailableAsync returns true', async () => {
    mockIsAvailableAsync.mockResolvedValue(true);
    const { result } = renderHook(() => useDeviceOrientation());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.available).toBe(true);
  });

  it('sets update interval when accelerometer is available', async () => {
    renderHook(() => useDeviceOrientation());
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockSetUpdateInterval).toHaveBeenCalledWith(100);
  });

  it('sets custom update interval', async () => {
    renderHook(() => useDeviceOrientation(250));
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockSetUpdateInterval).toHaveBeenCalledWith(250);
  });

  it('updates orientation when accelerometer listener fires', async () => {
    let listenerCallback: (m: { x: number; y: number; z: number }) => void;
    mockAddListener.mockImplementation((cb: (m: { x: number; y: number; z: number }) => void) => {
      listenerCallback = cb;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useDeviceOrientation());
    await act(async () => {
      await Promise.resolve();
    });

    const initialRoll = result.current.orientation.roll;

    act(() => {
      listenerCallback!({ x: 0, y: 8, z: 4 });
    });

    expect(result.current.orientation.roll).not.toBe(initialRoll);
  });

  it('does not crash when event fires after unmount (mountedRef guard)', async () => {
    let listenerCallback: (m: { x: number; y: number; z: number }) => void;
    mockAddListener.mockImplementation((cb: (m: { x: number; y: number; z: number }) => void) => {
      listenerCallback = cb;
      return { remove: jest.fn() };
    });

    const { unmount } = renderHook(() => useDeviceOrientation());
    await act(async () => {
      await Promise.resolve();
    });

    unmount();

    // Should not crash
    act(() => {
      listenerCallback!({ x: 0, y: 5, z: 8 });
    });
    expect(true).toBe(true);
  });

  it('subscribes to Accelerometer when available', async () => {
    renderHook(() => useDeviceOrientation());
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockAddListener).toHaveBeenCalledTimes(1);
  });

  it('removes subscription on unmount', async () => {
    const removeMock = jest.fn();
    mockAddListener.mockReturnValue({ remove: removeMock });

    const { unmount } = renderHook(() => useDeviceOrientation());
    await act(async () => {
      await Promise.resolve();
    });

    unmount();
    expect(removeMock).toHaveBeenCalledTimes(1);
  });

  it('does not subscribe when accelerometer unavailable', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);
    renderHook(() => useDeviceOrientation());
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockAddListener).not.toHaveBeenCalled();
  });
});