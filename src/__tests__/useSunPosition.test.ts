/**
 * Tests for useSunPosition hook.
 * Uses jest.doMock (non-hoisted) + jest.requireActual for clean module control.
 */

import { renderHook, act } from '@testing-library/react-native';

// --- Mock setup via doMock (non-hoisted, runs at call site) ---
const mockRequestFn = jest.fn();
const mockGetPositionFn = jest.fn();

jest.doMock('expo-location', () => ({
  requestForegroundPermissionsAsync: mockRequestFn,
  getCurrentPositionAsync: mockGetPositionFn,
  Accuracy: { Low: 3, Balanced: 3, High: 4, Best: 4 },
}));

// Import after mock is set
const { useSunPosition } = require('../hooks/useSunPosition');

function makePositionResult(coords: { latitude: number; longitude: number }) {
  return {
    coords: {
      latitude: coords.latitude,
      longitude: coords.longitude,
      altitude: null,
      accuracy: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequestFn.mockReset();
  mockGetPositionFn.mockReset();
});

describe('useSunPosition', () => {
  it('initial state is pending while async permission request is in flight', () => {
    // Never resolves — simulates permission dialog not yet responded to
    mockRequestFn.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useSunPosition(60000));

    expect(result.current.sunData.available).toBe(false);
    expect(result.current.sunData.advice).toBe('正在定位...');
  });

  it('populates sun data when location permission is granted', async () => {
    mockRequestFn.mockResolvedValue({ status: 'granted' });
    mockGetPositionFn.mockResolvedValue(makePositionResult({ latitude: 39.9042, longitude: 116.4074 }));

    const { result, unmount } = renderHook(() => useSunPosition(60000));

    await act(async () => {
      await Promise.resolve(); // allow useEffect to fire
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.sunData.available).toBe(true);
    expect(result.current.sunData.sunAltitude).toBeGreaterThanOrEqual(-90);
    expect(result.current.sunData.sunAltitude).toBeLessThanOrEqual(90);
    expect(result.current.sunData.sunAzimuth).toBeGreaterThanOrEqual(0);
    expect(result.current.sunData.sunAzimuth).toBeLessThanOrEqual(360);

    unmount();
  });

  it('sets location_error when getCurrentPositionAsync rejects', async () => {
    mockRequestFn.mockResolvedValue({ status: 'granted' });
    mockGetPositionFn.mockRejectedValue(new Error('unavailable'));

    const { result, unmount } = renderHook(() => useSunPosition(60000));

    await act(async () => {
      await Promise.resolve();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.sunData.available).toBe(false);
    expect(result.current.sunData.error).toBe('location_error');

    unmount();
  });

  it('returns valid altitude and azimuth for Beijing coordinates', async () => {
    mockRequestFn.mockResolvedValue({ status: 'granted' });
    mockGetPositionFn.mockResolvedValue(makePositionResult({ latitude: 39.9042, longitude: 116.4074 }));

    const { result, unmount } = renderHook(() => useSunPosition(60000));

    await act(async () => {
      await Promise.resolve();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.sunData.sunAltitude).toBeGreaterThanOrEqual(-90);
    expect(result.current.sunData.sunAltitude).toBeLessThanOrEqual(90);
    expect(result.current.sunData.sunAzimuth).toBeGreaterThanOrEqual(0);
    expect(result.current.sunData.sunAzimuth).toBeLessThanOrEqual(360);

    unmount();
  });

  it('direction maps to a valid Chinese cardinal direction', async () => {
    mockRequestFn.mockResolvedValue({ status: 'granted' });
    mockGetPositionFn.mockResolvedValue(makePositionResult({ latitude: 39.9042, longitude: 116.4074 }));

    const { result, unmount } = renderHook(() => useSunPosition(60000));

    await act(async () => {
      await Promise.resolve();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(['北', '东北', '东', '东南', '南', '西南', '西', '西北']).toContain(
      result.current.sunData.direction
    );

    unmount();
  });

  it('requestLocation() manually refreshes location data', async () => {
    mockRequestFn.mockResolvedValue({ status: 'granted' });
    mockGetPositionFn.mockResolvedValue(makePositionResult({ latitude: 39.9042, longitude: 116.4074 }));

    const { result, unmount } = renderHook(() => useSunPosition(99999999));

    await act(async () => {
      await Promise.resolve();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.sunData.available).toBe(true);

    // Override for manual refresh with Tokyo coords
    mockGetPositionFn.mockResolvedValueOnce(
      makePositionResult({ latitude: 35.6762, longitude: 139.6503 })
    );

    await act(async () => {
      await result.current.requestLocation();
    });

    expect(result.current.sunData.available).toBe(true);

    unmount();
  });
});
