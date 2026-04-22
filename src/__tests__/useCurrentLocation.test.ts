import * as Location from 'expo-location';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useCurrentLocation } from '../hooks/useCurrentLocation';

// Mock expo-location
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

describe('useCurrentLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when permission denied', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' } as any);

    const { result } = renderHook(() => useCurrentLocation());

    await act(async () => {
      await result.current.request();
    });

    expect(result.current.error).toBe('location_permission_denied');
    expect(mockLocation.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('returns coords and location name on success', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 39.9, longitude: 116.4 },
    } as any);
    mockLocation.reverseGeocodeAsync.mockResolvedValue([
      {
        city: '北京市',
        district: '朝阳区',
        region: '北京市',
        subregion: '朝阳区',
        name: '望京SOHO',
        streetNumber: '1',
        street: '阜通东大街',
        country: '中国',
        postalCode: '100102',
        isoCountryCode: 'CN',
        timezone: null,
        formattedAddress: null,
      },
    ]);

    const { result } = renderHook(() => useCurrentLocation());

    await act(async () => {
      await result.current.request();
    });

    expect(result.current.coords).toEqual({ latitude: 39.9, longitude: 116.4 });
    expect(result.current.locationName).toContain('朝阳');
    expect(result.current.locationName).toContain('望京SOHO');
  });

  it('returns location name null when reverse geocode returns empty array', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 0, longitude: 0 },
    } as any);
    mockLocation.reverseGeocodeAsync.mockResolvedValue([]);

    const { result } = renderHook(() => useCurrentLocation());

    await act(async () => {
      await result.current.request();
    });

    expect(result.current.locationName).toBeNull();
  });

  it('caches result and does not re-query within cache window', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 40.0, longitude: 116.0 },
    } as any);
    mockLocation.reverseGeocodeAsync.mockResolvedValue([
      {
        city: '北京市',
        district: null,
        region: '北京市',
        subregion: null,
        name: null,
        streetNumber: null,
        street: null,
        country: null,
        postalCode: null,
        isoCountryCode: null,
        timezone: null,
        formattedAddress: null,
      },
    ]);

    const { result } = renderHook(() => useCurrentLocation());

    // First call
    await act(async () => {
      await result.current.request();
    });

    // Second call immediately — should use cache (30s window)
    await act(async () => {
      await result.current.request();
    });

    // getCurrentPositionAsync should only be called once due to cache
    expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
    expect(mockLocation.reverseGeocodeAsync).toHaveBeenCalledTimes(1);
  });


});
