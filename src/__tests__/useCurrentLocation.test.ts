/**
 * Tests for useCurrentLocation hook
 * Mocks: expo-location (requestForegroundPermissionsAsync, getCurrentPositionAsync, reverseGeocodeAsync)
 */
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

describe('useCurrentLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('has null coords, null locationName, false loading, and null error', () => {
      const { result } = renderHook(() => useCurrentLocation());
      expect(result.current.coords).toBeNull();
      expect(result.current.locationName).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('request() — permission', () => {
    it('requests location permission when not granted', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
      mockLocation.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 39.9, longitude: 116.4 },
      } as any);
      mockLocation.reverseGeocodeAsync.mockResolvedValue([]);

      const { result } = renderHook(() => useCurrentLocation());
      await act(async () => { await result.current.request(); });

      expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });

    it('returns null when permission denied', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' } as any);

      const { result } = renderHook(() => useCurrentLocation());
      await act(async () => {
        const ret = await result.current.request();
        expect(ret).toBeNull();
      });

      expect(result.current.error).toBe('location_permission_denied');
      expect(mockLocation.getCurrentPositionAsync).not.toHaveBeenCalled();
    });
  });

  describe('request() — success path', () => {
    it('returns { coords, locationName } via the request() return value', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
      mockLocation.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 39.9, longitude: 116.4 },
      } as any);
      mockLocation.reverseGeocodeAsync.mockResolvedValue([
        {
          region: '北京市', subregion: '朝阳区', city: '北京市', district: '朝阳区',
          name: '望京SOHO', streetNumber: '1', street: '阜通东大街',
          country: '中国', postalCode: '100102', isoCountryCode: 'CN',
          timezone: null, formattedAddress: null,
        },
      ]);

      const { result } = renderHook(() => useCurrentLocation());
      let ret: any;
      await act(async () => { ret = await result.current.request(); });

      expect(ret).toEqual({
        coords: { latitude: 39.9, longitude: 116.4 },
        locationName: expect.stringContaining('北京'),
      });
      expect(ret.locationName).toContain('朝阳');
    });

    it('reverse geocodes coords to a city + district name', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
      mockLocation.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 31.2, longitude: 121.5 },
      } as any);
      mockLocation.reverseGeocodeAsync.mockResolvedValue([
        {
          region: '上海市', subregion: '浦东新区', city: '上海市', district: '陆家嘴',
          name: '东方明珠', streetNumber: null, street: null,
          country: null, postalCode: null, isoCountryCode: null,
          timezone: null, formattedAddress: null,
        },
      ]);

      const { result } = renderHook(() => useCurrentLocation());
      await act(async () => { await result.current.request(); });

      expect(result.current.locationName).toContain('上海');
      expect(result.current.locationName).toContain('浦东');
    });

    it('returns coords with { latitude, longitude } shape after successful location', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
      mockLocation.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 39.9, longitude: 116.4 },
      } as any);
      mockLocation.reverseGeocodeAsync.mockResolvedValue([]);

      const { result } = renderHook(() => useCurrentLocation());
      await act(async () => { await result.current.request(); });

      expect(result.current.coords).toEqual({ latitude: 39.9, longitude: 116.4 });
      expect(result.current.coords).not.toHaveProperty('accuracy');
    });

    it('loading is false after a successful request', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
      mockLocation.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 39.9, longitude: 116.4 },
      } as any);
      mockLocation.reverseGeocodeAsync.mockResolvedValue([]);

      const { result } = renderHook(() => useCurrentLocation());
      await act(async () => { await result.current.request(); });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('request() — error state', () => {
    it('sets error state when getCurrentPositionAsync throws', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
      mockLocation.getCurrentPositionAsync.mockRejectedValue(new Error('location_unavailable'));

      const { result } = renderHook(() => useCurrentLocation());
      await act(async () => {
        const ret = await result.current.request();
        expect(ret).toBeNull();
      });

      expect(result.current.error).toBe('location_unavailable');
      expect(result.current.loading).toBe(false);
    });

    it('coords are set and locationName is null when reverseGeocodeAsync throws', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
      mockLocation.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 39.9, longitude: 116.4 },
      } as any);
      mockLocation.reverseGeocodeAsync.mockRejectedValue(new Error('geocode_failed'));

      const { result } = renderHook(() => useCurrentLocation());
      await act(async () => { await result.current.request(); });

      expect(result.current.coords).toEqual({ latitude: 39.9, longitude: 116.4 });
      expect(result.current.locationName).toBeNull();
      expect(result.current.error).toBeNull(); // geocoding errors don't set error state
    });

    it('returns { coords, locationName } when geocoding fails', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
      mockLocation.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 39.9, longitude: 116.4 },
      } as any);
      mockLocation.reverseGeocodeAsync.mockRejectedValue(new Error('network_error'));

      const { result } = renderHook(() => useCurrentLocation());
      let ret: any;
      await act(async () => { ret = await result.current.request(); });

      expect(ret).toEqual({
        coords: { latitude: 39.9, longitude: 116.4 },
        locationName: null,
      });
    });
  });

  describe('request() — geocoding with empty result', () => {
    it('returns coords but null locationName when reverse geocode returns empty array', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
      mockLocation.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 0, longitude: 0 },
      } as any);
      mockLocation.reverseGeocodeAsync.mockResolvedValue([]);

      const { result } = renderHook(() => useCurrentLocation());
      await act(async () => { await result.current.request(); });

      expect(result.current.locationName).toBeNull();
      expect(result.current.coords).toEqual({ latitude: 0, longitude: 0 });
    });
  });

  describe('caching', () => {
    it('returns cached result when called within CACHE_TTL_MS (30s)', async () => {
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

      // First call
      await act(async () => { await result.current.request(); });

      // Second call immediately — should use cache (within 30s TTL)
      await act(async () => { await result.current.request(); });

      // getCurrentPositionAsync should only be called once due to cache
      expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
      expect(mockLocation.reverseGeocodeAsync).toHaveBeenCalledTimes(1);
    });
  });
});