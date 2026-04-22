/**
 * useCurrentLocation — captures GPS coordinates and reverse-geocodes them to a
 * human-readable place name (e.g. "北京市朝阳区").
 *
 * Exposes a request() function that callers can invoke whenever they need the
 * current location.  Results are cached on the hook instance so that repeated
 * calls within a short window don't re-query the device.
 */

import { useState, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import type { LocationCoords } from '../types';

export interface CurrentLocationResult {
  coords: LocationCoords;
  locationName: string | null;
}

export interface UseCurrentLocationReturn {
  coords: LocationCoords | null;
  locationName: string | null;
  loading: boolean;
  error: string | null;
  request: () => Promise<CurrentLocationResult | null>;
}

const CACHE_TTL_MS = 30_000; // 30 seconds

export function useCurrentLocation(): UseCurrentLocationReturn {
  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache to avoid querying on every capture
  const cachedAtRef = useRef<number | null>(null);
  const cachedResultRef = useRef<CurrentLocationResult | null>(null);

  const reverseGeocode = useCallback(async (lat: number, lon: number): Promise<string | null> => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      if (!results || results.length === 0) return null;
      const r = results[0];
      // Prefer city + district / POI name
      const parts = [
        r.region,
        r.subregion,
        r.city,
        r.district,
        r.name,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join('') : null;
    } catch {
      return null;
    }
  }, []);

  const request = useCallback(async (): Promise<CurrentLocationResult | null> => {
    // Return cached if still fresh
    if (
      cachedResultRef.current &&
      cachedAtRef.current &&
      Date.now() - cachedAtRef.current < CACHE_TTL_MS
    ) {
      setCoords(cachedResultRef.current.coords);
      setLocationName(cachedResultRef.current.locationName);
      return cachedResultRef.current;
    }

    setLoading(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('location_permission_denied');
        setLoading(false);
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newCoords: LocationCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      const name = await reverseGeocode(newCoords.latitude, newCoords.longitude);

      const result: CurrentLocationResult = { coords: newCoords, locationName: name };

      cachedResultRef.current = result;
      cachedAtRef.current = Date.now();

      setCoords(newCoords);
      setLocationName(name);
      setLoading(false);
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'location_error';
      setError(msg);
      setLoading(false);
      return null;
    }
  }, [reverseGeocode]);

  return { coords, locationName, loading, error, request };
}
