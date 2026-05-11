import { act, renderHook } from '@testing-library/react-native';
import { useCurrentLocation } from '../useCurrentLocation';

const mockRequestForegroundPermissionsAsync = jest.fn();
const mockGetCurrentPositionAsync = jest.fn();
const mockReverseGeocodeAsync = jest.fn();

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: (...args: unknown[]) =>
    mockRequestForegroundPermissionsAsync(...args),
  getCurrentPositionAsync: (...args: unknown[]) =>
    mockGetCurrentPositionAsync(...args),
  reverseGeocodeAsync: (...args: unknown[]) =>
    mockReverseGeocodeAsync(...args),
  Accuracy: {
    Low: 3,
    Balanced: 3,
    High: 4,
    Best: 4,
  },
}));

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-01-01T12:00:00Z'));
  mockRequestForegroundPermissionsAsync.mockClear();
  mockGetCurrentPositionAsync.mockClear();
  mockReverseGeocodeAsync.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useCurrentLocation', () => {
  describe('initial state', () => {
    it('starts with coords=null, loading=false, error=null', () => {
      const { result } = renderHook(() => useCurrentLocation());
      expect(result.current.coords).toBeNull();
      expect(result.current.locationName).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('request() — permission denied', () => {
    it('sets error to location_permission_denied and returns null', async () => {
      mockRequestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });

      const { result } = renderHook(() => useCurrentLocation());

      await act(async () => {
        const ret = await result.current.request();
        expect(ret).toBeNull();
      });

      expect(result.current.error).toBe('location_permission_denied');
      expect(result.current.loading).toBe(false);
      expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
    });
  });

  describe('request() — location retrieval failure', () => {
    it('sets error message and returns null when getCurrentPositionAsync throws', async () => {
      mockRequestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
      mockGetCurrentPositionAsync.mockRejectedValueOnce(new Error('location_unavailable'));

      const { result } = renderHook(() => useCurrentLocation());

      await act(async () => {
        const ret = await result.current.request();
        expect(ret).toBeNull();
      });

      expect(result.current.error).toBe('location_unavailable');
      expect(result.current.loading).toBe(false);
    });
  });

  describe('request() — success path', () => {
    it('returns coords and locationName on success', async () => {
      mockRequestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
      mockGetCurrentPositionAsync.mockResolvedValueOnce({
        coords: { latitude: 39.9042, longitude: 116.4074 },
        timestamp: Date.now(),
      });
      mockReverseGeocodeAsync.mockResolvedValueOnce([
        { region: '北京', city: '北京市', district: '朝阳区', name: '国贸', subregion: '' },
      ]);

      const { result } = renderHook(() => useCurrentLocation());

      let ret: ReturnType<typeof result.current.request> extends Promise<infer T> ? T : never;
      await act(async () => {
        ret = await result.current.request();
      });

      expect(ret).toEqual({
        coords: { latitude: 39.9042, longitude: 116.4074 },
        locationName: '北京北京市朝阳区国贸',
      });
      expect(result.current.coords).toEqual({ latitude: 39.9042, longitude: 116.4074 });
      expect(result.current.locationName).toBe('北京北京市朝阳区国贸');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('request() — reverse geocode failure', () => {
    it('handles reverseGeocodeAsync rejection gracefully, returns coords with locationName=null', async () => {
      mockRequestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
      mockGetCurrentPositionAsync.mockResolvedValueOnce({
        coords: { latitude: 31.2304, longitude: 121.4737 },
        timestamp: Date.now(),
      });
      mockReverseGeocodeAsync.mockRejectedValueOnce(new Error('network_error'));

      const { result } = renderHook(() => useCurrentLocation());

      await act(async () => {
        const ret = await result.current.request();
        expect(ret).toEqual({
          coords: { latitude: 31.2304, longitude: 121.4737 },
          locationName: null,
        });
        expect(result.current.locationName).toBeNull();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('returns locationName=null when reverseGeocodeAsync returns empty array', async () => {
      mockRequestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
      mockGetCurrentPositionAsync.mockResolvedValueOnce({
        coords: { latitude: 0, longitude: 0 },
        timestamp: Date.now(),
      });
      mockReverseGeocodeAsync.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useCurrentLocation());

      await act(async () => {
        const ret = await result.current.request();
        expect(ret).toEqual({ coords: { latitude: 0, longitude: 0 }, locationName: null });
        expect(result.current.locationName).toBeNull();
      });
    });
  });

  describe('cache behavior', () => {
    it('second call within 30s returns cached result without re-querying', async () => {
      mockRequestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
      mockGetCurrentPositionAsync.mockResolvedValueOnce({
        coords: { latitude: 39.9042, longitude: 116.4074 },
        timestamp: Date.now(),
      });
      mockReverseGeocodeAsync.mockResolvedValueOnce([
        { region: '北京', city: '北京市', district: '朝阳区', name: '', subregion: '' },
      ]);

      const { result } = renderHook(() => useCurrentLocation());

      // First call
      await act(async () => {
        await result.current.request();
      });

      expect(mockRequestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(1);
      expect(mockReverseGeocodeAsync).toHaveBeenCalledTimes(1);

      // Advance time by 10s — still within cache window
      act(() => {
        jest.advanceTimersByTime(10_000);
      });

      // Second call — should use cache
      await act(async () => {
        await result.current.request();
      });

      // No additional location queries
      expect(mockRequestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(1);
      expect(mockReverseGeocodeAsync).toHaveBeenCalledTimes(1);

      // State is still set correctly
      expect(result.current.coords).toEqual({ latitude: 39.9042, longitude: 116.4074 });
    });

    it('call after 30s re-queries location and reverse geocode', async () => {
      mockRequestForegroundPermissionsAsync
        .mockResolvedValueOnce({ status: 'granted' })
        .mockResolvedValueOnce({ status: 'granted' });
      mockGetCurrentPositionAsync
        .mockResolvedValueOnce({
          coords: { latitude: 39.9042, longitude: 116.4074 },
          timestamp: Date.now(),
        })
        .mockResolvedValueOnce({
          coords: { latitude: 31.2304, longitude: 121.4737 },
          timestamp: Date.now(),
        });
      mockReverseGeocodeAsync
        .mockResolvedValueOnce([{ region: '北京', city: '北京市', district: '', name: '', subregion: '' }])
        .mockResolvedValueOnce([{ region: '上海', city: '上海市', district: '', name: '', subregion: '' }]);

      const { result } = renderHook(() => useCurrentLocation());

      // First call
      await act(async () => {
        await result.current.request();
      });

      expect(result.current.coords).toEqual({ latitude: 39.9042, longitude: 116.4074 });

      // Advance past cache TTL
      act(() => {
        jest.advanceTimersByTime(30_001);
      });

      // Second call — should re-query
      await act(async () => {
        await result.current.request();
      });

      expect(mockRequestForegroundPermissionsAsync).toHaveBeenCalledTimes(2);
      expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(2);
      expect(mockReverseGeocodeAsync).toHaveBeenCalledTimes(2);
      expect(result.current.coords).toEqual({ latitude: 31.2304, longitude: 121.4737 });
    });
  });
});