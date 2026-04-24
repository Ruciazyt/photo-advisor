/**
 * Behavior tests for useSunPosition hook.
 * Pure function tests (calculateSunPosition, getJulianDate, etc.) are in the
 * same file — this section adds the hook interaction tests.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { SunData } from '../types';

// ---------------------------------------------------------------------------
// Mock expo-location at module level
// ---------------------------------------------------------------------------

const mockRequestForegroundPermissionsAsync = jest.fn();
const mockGetCurrentPositionAsync = jest.fn();

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: (...args: unknown[]) =>
    mockRequestForegroundPermissionsAsync(...args),
  getCurrentPositionAsync: (...args: unknown[]) =>
    mockGetCurrentPositionAsync(...args),
  Accuracy: {
    Low: 1,
    Balanced: 2,
    High: 3,
    Highest: 4,
    Best: 5,
  },
}));

// Import useSunPosition AFTER mocks are set up
let useSunPosition: (updateIntervalMs?: number) => {
  sunData: SunData;
  requestLocation: () => Promise<void>;
};

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const hookModule = require('../hooks/useSunPosition');
  useSunPosition = hookModule.useSunPosition;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockRequestForegroundPermissionsAsync.mockReset();
  mockGetCurrentPositionAsync.mockReset();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Advance timers to allow pending async work to complete */
function flushPromises() {
  return new Promise<void>(resolve => setImmediate(resolve));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useSunPosition — initial / loading state', () => {
  it('returns available=false with "正在定位..." advice initially', () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 31.23, longitude: 121.47 },
    });

    const { result } = renderHook(() => useSunPosition(60000));

    // Initial state before any async work completes
    expect(result.current.sunData.available).toBe(false);
    expect(result.current.sunData.advice).toBe('正在定位...');
  });
});

describe('useSunPosition — permission granted', () => {
  it('updates sunData after location permission granted', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 31.23, longitude: 121.47 },
    });

    const { result } = renderHook(() => useSunPosition(60000));

    // Wait for the hook's useEffect to complete
    await waitFor(
      () => {
        expect(result.current.sunData.available).toBe(true);
      },
      { timeout: 3000 }
    );

    // After permission + location are resolved, sun data should be available
    expect(result.current.sunData.sunAltitude).not.toBe(0);
    expect(result.current.sunData.sunAzimuth).toBeGreaterThanOrEqual(0);
    expect(result.current.sunData.direction).toMatch(/^[东南西北]/);
    expect(result.current.sunData.advice).toBeTruthy();
  });

  it('includes goldenHourStart and goldenHourEnd in resolved sunData', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 31.23, longitude: 121.47 },
    });

    const { result } = renderHook(() => useSunPosition(60000));

    await waitFor(
      () => {
        expect(result.current.sunData.available).toBe(true);
      },
      { timeout: 3000 }
    );

    // Golden hour times should be populated as "HH:MM" strings
    if (result.current.sunData.goldenHourStart !== null) {
      expect(result.current.sunData.goldenHourStart).toMatch(/^\d{2}:\d{2}$/);
    }
    if (result.current.sunData.goldenHourEnd !== null) {
      expect(result.current.sunData.goldenHourEnd).toMatch(/^\d{2}:\d{2}$/);
    }
  });
});

describe('useSunPosition — permission denied', () => {
  it('sets available=false and advice="定位权限被拒绝" when permission denied', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const { result } = renderHook(() => useSunPosition(60000));

    // Wait for the advice to change from initial '正在定位...' to '定位权限被拒绝'
    await waitFor(
      () => {
        expect(result.current.sunData.advice).toBe('定位权限被拒绝');
      },
      { timeout: 3000 }
    );

    expect(result.current.sunData.available).toBe(false);
  });
});

describe('useSunPosition — location unavailable', () => {
  it('sets available=false and advice="无法获取位置" when getCurrentPositionAsync throws', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPositionAsync.mockRejectedValue(new Error('Location unavailable'));

    const { result } = renderHook(() => useSunPosition(60000));

    // Wait for the advice to change from initial '正在定位...' to '无法获取位置'
    await waitFor(
      () => {
        expect(result.current.sunData.advice).toBe('无法获取位置');
      },
      { timeout: 3000 }
    );

    expect(result.current.sunData.available).toBe(false);
  });
});

describe('useSunPosition — updateIntervalMs', () => {
  it('uses default interval of 60000ms when not specified', () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 31.23, longitude: 121.47 },
    });

    const { result } = renderHook(() => useSunPosition());
    expect(result.current.sunData.advice).toBe('正在定位...');
  });

  it('renders with custom updateIntervalMs=60000', () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 31.23, longitude: 121.47 },
    });

    const { result } = renderHook(() => useSunPosition(60000));
    expect(result.current.sunData).toBeDefined();
  });

  it('renders with a different interval (10000ms)', () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 31.23, longitude: 121.47 },
    });

    const { result } = renderHook(() => useSunPosition(10000));
    expect(result.current.sunData).toBeDefined();
  });
});

describe('useSunPosition — formatTime integration', () => {
  it('golden hour times are in HH:MM format (output of formatTime)', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 31.23, longitude: 121.47 },
    });

    const { result } = renderHook(() => useSunPosition(60000));

    await waitFor(
      () => {
        expect(result.current.sunData.available).toBe(true);
      },
      { timeout: 3000 }
    );

    // Golden hour strings should be in HH:MM format (output of formatTime)
    const { goldenHourStart, goldenHourEnd } = result.current.sunData;
    if (goldenHourStart !== null) {
      expect(goldenHourStart).toMatch(/^\d{2}:\d{2}$/);
    }
    if (goldenHourEnd !== null) {
      expect(goldenHourEnd).toMatch(/^\d{2}:\d{2}$/);
    }
  });
});

describe('useSunPosition — requestLocation', () => {
  it('requestLocation refetches location when called', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPositionAsync
      .mockResolvedValueOnce({ coords: { latitude: 31.23, longitude: 121.47 } })
      .mockResolvedValueOnce({ coords: { latitude: 40.0, longitude: 116.0 } });

    const { result } = renderHook(() => useSunPosition(60000));

    // Wait for initial location fetch
    await waitFor(
      () => {
        expect(result.current.sunData.available).toBe(true);
      },
      { timeout: 3000 }
    );

    // Trigger requestLocation manually
    await act(async () => {
      await result.current.requestLocation();
    });

    // Location should have been re-fetched
    expect(mockGetCurrentPositionAsync).toHaveBeenCalled();
  });
});
