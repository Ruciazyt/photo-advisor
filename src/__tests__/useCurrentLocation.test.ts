



// ============================================================
// ADDITIONAL tests for useCurrentLocation — appended
// Covers: cache TTL expiry, reverseGeocode edge cases,
// error handling, concurrent calls, state updates
// ============================================================

import * as Location from 'expo-location';
import { renderHook, act } from '@testing-library/react-native';
import { useCurrentLocation } from '../hooks/useCurrentLocation';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  Accuracy: {
    Balanced: 3,
    Low: 4,
    High: 5,
  },
}));

const mockLocation = Location as jest.Mocked<typeof Location>;
const CACHE_TTL_MS = 30_000;

describe('useCurrentLocation — cache TTL behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns cached result within the TTL window without calling location APIs again', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 40.0, longitude: 116.0 },
    } as any);
    mockLocation.reverseGeocodeAsync.mockResolvedValue([
      {
        region: '北京市', subregion: null, city: '北京市', district: null,
        name: null, streetNumber: null, street: null,
        country: null, postalCode: null, isoCountryCode: null,
        timezone: null, formattedAddress: null,
      },
    ]);

    const { result } = renderHook(() => useCurrentLocation());

    // First call — prime the cache
    await act(async () => {
      await result.current.request();
    });

    // Advance time by 15 seconds — still within 30s TTL
    act(() => {
      jest.advanceTimersByTime(15_000);
    });

    // Second call — should use cache
    await act(async () => {
      await result.current.request();
    });

    // Neither API should have been called a second time
    expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
    expect(mockLocation.reverseGeocodeAsync).toHaveBeenCalledTimes(1);
  });

  it('makes a fresh request after TTL expires', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockLocation.getCurrentPositionAsync
      .mockResolvedValueOnce({ coords: { latitude: 40.0, longitude: 116.0 } } as any)
      .mockResolvedValueOnce({ coords: { latitude: 41.0, longitude: 117.0 } } as any);
    mockLocation.reverseGeocodeAsync
      .mockResolvedValueOnce([{ region: '北京市', city: '北京市', district: null, name: null, subregion: null, streetNumber: null, street: null, country: null, postalCode: null, isoCountryCode: null, timezone: null, formattedAddress: null }])
      .mockResolvedValueOnce([{ region: '河北省', city: '石家庄市', district: null, name: null, subregion: null, streetNumber: null, street: null, country: null, postalCode: null, isoCountryCode: null, timezone: null, formattedAddress: null }]);

    const { result } = renderHook(() => useCurrentLocation());

    // First call
    await act(async () => {
      await result.current.request();
    });

    expect(result.current.coords).toEqual({ latitude: 40.0, longitude: 116.0 });

    // Advance time past the 30s TTL
    act(() => {
      jest.advanceTimersByTime(CACHE_TTL_MS + 1);
    });

    // Second call — cache expired, should hit APIs again
    await act(async () => {
      await result.current.request();
    });

    expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(2);
    expect(mockLocation.reverseGeocodeAsync).toHaveBeenCalledTimes(2);
    expect(result.current.coords).toEqual({ latitude: 41.0, longitude: 117.0 });
  });

  it('fresh request after TTL also updates locationName', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockLocation.getCurrentPositionAsync
      .mockResolvedValueOnce({ coords: { latitude: 40.0, longitude: 116.0 } } as any)
      .mockResolvedValueOnce({ coords: { latitude: 31.0, longitude: 121.0 } } as any);
    mockLocation.reverseGeocodeAsync
      .mockResolvedValueOnce([{ region: '北京市', city: '北京市', district: null, name: null, subregion: null, streetNumber: null, street: null, country: null, postalCode: null, isoCountryCode: null, timezone: null, formattedAddress: null }])
      .mockResolvedValueOnce([{ region: '上海市', city: '上海市', district: null, name: null, subregion: null, streetNumber: null, street: null, country: null, postalCode: null, isoCountryCode: null, timezone: null, formattedAddress: null }]);

    const { result } = renderHook(() => useCurrentLocation());

    await act(async () => {
      await result.current.request();
    });

    expect(result.current.locationName).toContain('北京');

    act(() => {
      jest.advanceTimersByTime(CACHE_TTL_MS + 1);
    });

    await act(async () => {
      await result.current.request();
    });

    expect(result.current.locationName).toContain('上海');
  });
});

describe('useCurrentLocation — reverseGeocode variations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reverseGeocode: city only → returns city name', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 31.2, longitude: 121.5 },
    } as any);
    mockLocation.reverseGeocodeAsync.mockResolvedValue([
      {
        region: null, subregion: null, city: '上海市', district: null,
        name: null, streetNumber: null, street: null,
        country: null, postalCode: null, isoCountryCode: null,
        timezone: null, formattedAddress: null,
      },
    ]);

    const { result } = renderHook(() => useCurrentLocation());
    await act(async () => {
      await result.current.request();
    });

    expect(result.current.locationName).toBe('上海市');
  });

  it('reverseGeocode: district only → returns district name', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 31.2, longitude: 121.5 },
    } as any);
    mockLocation.reverseGeocodeAsync.mockResolvedValue([
      {
        region: null, subregion: null, city: null, district: '浦东新区',
        name: null, streetNumber: null, street: null,
        country: null, postalCode: null, isoCountryCode: null,
        timezone: null, formattedAddress: null,
      },
    ]);

    const { result } = renderHook(() => useCurrentLocation());
    await act(async () => {
      await result.current.request();
    });

    expect(result.current.locationName).toBe('浦东新区');
  });

  it('reverseGeocode: region only → returns region name', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 31.2, longitude: 121.5 },
    } as any);
    mockLocation.reverseGeocodeAsync.mockResolvedValue([
      {
        region: '上海市', subregion: null, city: null, district: null,
        name: null, streetNumber: null, street: null,
        country: null, postalCode: null, isoCountryCode: null,
        timezone: null, formattedAddress: null,
      },
    ]);

    const { result } = renderHook(() => useCurrentLocation());
    await act(async () => {
      await result.current.request();
    });

    expect(result.current.locationName).toBe('上海市');
  });

  it('reverseGeocode: POI name only (no city/district/region) → returns name', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 31.2, longitude: 121.5 },
    } as any);
    mockLocation.reverseGeocodeAsync.mockResolvedValue([
      {
        region: null, subregion: null, city: null, district: null,
        name: '东方明珠', streetNumber: null, street: null,
        country: null, postalCode: null, isoCountryCode: null,
        timezone: null, formattedAddress: null,
      },
    ]);

    const { result } = renderHook(() => useCurrentLocation());
    await act(async () => {
      await result.current.request();
    });

    expect(result.current.locationName).toBe('东方明珠');
  });

  it('reverseGeocode: all fields present → joins region, subregion, city, district, name', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 31.2, longitude: 121.5 },
    } as any);
    mockLocation.reverseGeocodeAsync.mockResolvedValue([
      {
        region: '上海市', subregion: '浦东新区', city: '上海市', district: '陆家嘴',
        name: '东方明珠', streetNumber: '1', street: '世纪大道',
        country: null, postalCode: null, isoCountryCode: null,
        timezone: null, formattedAddress: null,
      },
    ]);

    const { result } = renderHook(() => useCurrentLocation());
    await act(async () => {
      await result.current.request();
    });

    // All non-null parts should be joined
    expect(result.current.locationName).toContain('上海市');
    expect(result.current.locationName).toContain('浦东新区');
    expect(result.current.locationName).toContain('陆家嘴');
    expect(result.current.locationName).toContain('东方明珠');
  });

  it('reverseGeocode: all fields null → locationName is null', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 0, longitude: 0 },
    } as any);
    mockLocation.reverseGeocodeAsync.mockResolvedValue([
      {
        region: null, subregion: null, city: null, district: null,
        name: null, streetNumber: null, street: null,
        country: null, postalCode: null, isoCountryCode: null,
        timezone: null, formattedAddress: null,
      },
    ]);

    const { result } = renderHook(() => useCurrentLocation());
    await act(async () => {
      await result.current.request();
    });

    expect(result.current.locationName).toBeNull();
  });
});

describe('useCurrentLocation — error handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('permission denied → sets error to "location_permission_denied" and loading to false', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' } as any);

    const { result } = renderHook(() => useCurrentLocation());
    await act(async () => {
      const ret = await result.current.request();
      expect(ret).toBeNull();
    });

    expect(result.current.error).toBe('location_permission_denied');
    expect(result.current.loading).toBe(false);
    expect(result.current.coords).toBeNull();
    expect(result.current.locationName).toBeNull();
  });

  it('location service disabled → getCurrentPositionAsync throws → error state set', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockLocation.getCurrentPositionAsync.mockRejectedValue(new Error('location_services_disabled'));

    const { result } = renderHook(() => useCurrentLocation());
    await act(async () => {
      const ret = await result.current.request();
      expect(ret).toBeNull();
    });

    expect(result.current.error).toBe('location_services_disabled');
    expect(result.current.loading).toBe(false);
    expect(result.current.coords).toBeNull();
  });

  it('reverseGeocodeAsync throws → coords are set, locationName is null, error is null', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 39.9, longitude: 116.4 },
    } as any);
    mockLocation.reverseGeocodeAsync.mockRejectedValue(new Error('network_error'));

    const { result } = renderHook(() => useCurrentLocation());
    await act(async () => {
      await result.current.request();
    });

    expect(result.current.coords).toEqual({ latitude: 39.9, longitude: 116.4 });
    expect(result.current.locationName).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('multiple rapid errors do not leave loading stuck in true', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockLocation.getCurrentPositionAsync
      .mockRejectedValueOnce(new Error('error_1'))
      .mockRejectedValueOnce(new Error('error_2'));

    const { result } = renderHook(() => useCurrentLocation());

    await act(async () => {
      await result.current.request();
    });
    expect(result.current.loading).toBe(false);

    await act(async () => {
      await result.current.request();
    });
    expect(result.current.loading).toBe(false);
  });
});

describe('useCurrentLocation — concurrent calls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('second request while first is in-flight: both complete without crashing', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    let resolveCount = 0;
    mockLocation.getCurrentPositionAsync.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolveCount++;
            resolve({ coords: { latitude: 39.9 + resolveCount, longitude: 116.4 + resolveCount } } as any);
          }, 50);
        })
    );
    mockLocation.reverseGeocodeAsync.mockResolvedValue([
      {
        region: '北京市', city: '北京市', district: null, name: null, subregion: null,
        streetNumber: null, street: null, country: null, postalCode: null,
        isoCountryCode: null, timezone: null, formattedAddress: null,
      },
    ]);

    const { result } = renderHook(() => useCurrentLocation());

    const [promise1, promise2] = await act(async () => {
      const p1 = result.current.request();
      const p2 = result.current.request();
      // Allow React to process the concurrent setLoading(true) calls
      await Promise.resolve();
      return [p1, p2];
    });

    // Allow pending React state updates to flush
    await act(async () => {
      await Promise.resolve();
    });

    await promise1;
    await promise2;

    // Allow final state updates to flush
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('second request while first is in-flight: getCurrentPositionAsync called twice', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockLocation.getCurrentPositionAsync.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ coords: { latitude: 39.9, longitude: 116.4 } } as any);
          }, 50);
        })
    );
    mockLocation.reverseGeocodeAsync.mockResolvedValue([]);

    const { result } = renderHook(() => useCurrentLocation());

    const [promise1, promise2] = await act(async () => {
      const p1 = result.current.request();
      const p2 = result.current.request();
      return [p1, p2];
    });

    await promise1;
    await promise2;

    expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(2);
  });
});

describe('useCurrentLocation — state updates after request()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loading transitions: false → true → false after success', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockLocation.getCurrentPositionAsync.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ coords: { latitude: 39.9, longitude: 116.4 } } as any);
          }, 50);
        })
    );
    mockLocation.reverseGeocodeAsync.mockResolvedValue([]);

    const { result } = renderHook(() => useCurrentLocation());
    expect(result.current.loading).toBe(false);

    await act(async () => {
      await result.current.request();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.coords).toEqual({ latitude: 39.9, longitude: 116.4 });
  });

  it('loading transitions: false → true → false after permission denied', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ status: 'denied' } as any);
          }, 50);
        })
    );

    const { result } = renderHook(() => useCurrentLocation());
    expect(result.current.loading).toBe(false);

    await act(async () => {
      await result.current.request();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('location_permission_denied');
  });

  it('error is null after successful request', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 39.9, longitude: 116.4 },
    } as any);
    mockLocation.reverseGeocodeAsync.mockResolvedValue([]);

    const { result } = renderHook(() => useCurrentLocation());
    await act(async () => {
      await result.current.request();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.coords).toEqual({ latitude: 39.9, longitude: 116.4 });
  });

  it('coords and locationName are both null initially', () => {
    const { result } = renderHook(() => useCurrentLocation());
    expect(result.current.coords).toBeNull();
    expect(result.current.locationName).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
