import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useCallback } from 'react';

export interface SunData {
  available: boolean;
  goldenHourStart: string | null; // HH:MM
  goldenHourEnd: string | null;
  blueHourStart: string | null;
  blueHourEnd: string | null;
  sunAltitude: number; // degrees above horizon
  sunAzimuth: number;  // degrees from north (0-360)
  direction: string;    // human-readable direction
  advice: string;       // shooting advice
  error?: string;
}

interface LocationCoords {
  latitude: number;
  longitude: number;
}

// Sun position using standard astronomical algorithms (no external library)
function calculateSunPosition(lat: number, lng: number, date: Date) {
  // Convert to Julian date
  const julianDate = getJulianDate(date);

  // Julian centuries since J2000.0
  const n = julianDate - 2451545.0;
  const jstar = n - lng / 360.0;
  const m = (357.5291 + 0.98560028 * jstar) % 360;
  const mRad = (m * Math.PI) / 180;

  // Equation of center
  const c = 1.9148 * Math.sin(mRad) + 0.0200 * Math.sin(2 * mRad) + 0.0003 * Math.sin(3 * mRad);
  const lambdaSun = (m + c + 180 + 102.9372) % 360;
  const lambdaRad = (lambdaSun * Math.PI) / 180;

  // Solar transit
  const jTransit = 2451545.0 + jstar + 0.0053 * Math.sin(mRad) - 0.0069 * Math.sin(2 * lambdaRad);

  // Declination of the sun
  const sinDec = Math.sin(lambdaRad) * Math.sin((23.4397 * Math.PI) / 180);
  const dec = Math.asin(sinDec);

  // Hour angle
  const latRad = (lat * Math.PI) / 180;
  const cosOmega = (Math.sin((-0.833 - 0.0347 * Math.sign(lat) * Math.sqrt(lat * lat)) * Math.PI / 180) - Math.sin(latRad) * sinDec) /
    (Math.cos(latRad) * Math.cos(dec));

  // Clamp cosOmega to [-1, 1]
  const clampedCosOmega = Math.max(-1, Math.min(1, cosOmega));

  // Hour angle in degrees
  const omega = Math.acos(clampedCosOmega) * (180 / Math.PI);

  // Sunrise/sunset JD
  const jSunrise = jTransit - omega / 360;
  const jSunset = jTransit + omega / 360;

  // Convert JD to local time
  const sunrise = jdToDateTime(jSunrise, date);
  const sunset = jdToDateTime(jSunset, date);

  // Golden hour: sun altitude between 0° and 6° (roughly ±1 hour from sunrise/sunset)
  // Blue hour: sun altitude between -6° and -4°
  const goldenHourMorningStart = sunrise;
  const goldenHourMorningEnd = addMinutes(sunrise, 60);
  const goldenHourEveningStart = addMinutes(sunset, -60);
  const goldenHourEveningEnd = sunset;

  // For current sun altitude & azimuth at a given time
  const now = date;
  const t = (jdToUnix(julianDate) - jdToUnix(2451545.0)) / 86400.0; // days since J2000
  const lmst = getLMST(julianDate, lng);
  const ha = (lmst * 15 - lambdaSun + 360) % 360;
  const haRad = (ha * Math.PI) / 180;

  const sinAlt = Math.sin(latRad) * sinDec + Math.cos(latRad) * Math.cos(dec) * Math.cos(haRad);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * (180 / Math.PI);

  const cosAz = (sinDec - Math.sin(latRad) * sinAlt) / (Math.cos(latRad) * Math.cos((altitude * Math.PI) / 180));
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) * (180 / Math.PI);
  if (Math.sin(haRad) > 0) azimuth = 360 - azimuth;

  return {
    altitude,
    azimuth,
    sunrise,
    sunset,
    goldenHourMorningStart,
    goldenHourMorningEnd,
    goldenHourEveningStart,
    goldenHourEveningEnd,
  };
}

function getJulianDate(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate() + date.getUTCHours() / 24 + date.getUTCMinutes() / 1440;
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

function jdToUnix(jd: number): number {
  return (jd - 2440587.5) * 86400;
}

function jdToDateTime(jd: number, refDate: Date): Date {
  const ms = (jd - 2451545.0) * 86400000;
  const d = new Date(refDate.getTime() + ms);
  // Clamp to today
  const today = new Date(refDate);
  today.setHours(0, 0, 0, 0);
  if (d < today) d.setTime(today.getTime());
  return d;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

function getLMST(jd: number, lng: number): number {
  const t = (jd - 2451545.0) / 36525.0;
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * t * t - t * t * t / 38710000;
  gmst = gmst % 360;
  if (gmst < 0) gmst += 360;
  let lmst = (gmst + lng) % 360;
  if (lmst < 0) lmst += 360;
  return lmst / 15; // in hours
}

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function getAzimuthDirection(azimuth: number): string {
  const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  const idx = Math.round(azimuth / 45) % 8;
  return dirs[idx];
}

function getSunAdvice(altitude: number, azimuth: number): string {
  if (altitude < -6) return '太阳低于地平线，夜间拍摄';
  if (altitude < -4) return '蓝调时刻，光线柔和';
  if (altitude < 0) return '黄金时刻，暖色光线';
  if (altitude < 6) return '黄金时刻，逆光/侧光佳';
  if (altitude < 20) return '太阳较低，侧光柔和';
  if (altitude < 50) return '阳光充足，注意光影';
  return '顶光较强，建议补光';
}

function getDirectionAdvice(altitude: number, azimuth: number): string {
  if (altitude < 0) return '拍剪影或长曝光';
  if (altitude < 10) {
    if (azimuth > 315 || azimuth < 45) return '可拍逆光剪影';
    if (azimuth > 45 && azimuth < 135) return '侧光人像';
    if (azimuth > 225 && azimuth < 315) return '侧光人像';
    return '顺光拍摄';
  }
  if (altitude < 30) return '侧光人像/风光';
  return '顶光场景，注意补光';
}

export function useSunPosition(updateIntervalMs = 60000) {
  const [sunData, setSunData] = useState<SunData>({
    available: false,
    goldenHourStart: null,
    goldenHourEnd: null,
    blueHourStart: null,
    blueHourEnd: null,
    sunAltitude: 0,
    sunAzimuth: 0,
    direction: '北',
    advice: '正在定位...',
  });
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const locationRef = useRef<LocationCoords | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateSunData = useCallback(async (coords: LocationCoords) => {
    const now = new Date();
    try {
      const pos = calculateSunPosition(coords.latitude, coords.longitude, now);

      const altitude = pos.altitude;
      const azimuth = pos.azimuth;

      // Determine current phase
      const nowMs = now.getTime();
      const isGoldenHour =
        (nowMs >= pos.goldenHourMorningStart.getTime() && nowMs <= pos.goldenHourMorningEnd.getTime()) ||
        (nowMs >= pos.goldenHourEveningStart.getTime() && nowMs <= pos.goldenHourEveningEnd.getTime());

      let goldenHourStart: string | null = null;
      let goldenHourEnd: string | null = null;
      let blueHourStart: string | null = null;
      let blueHourEnd: string | null = null;

      // Find next golden hour
      if (nowMs < pos.goldenHourMorningStart.getTime()) {
        goldenHourStart = formatTime(pos.goldenHourMorningStart);
        goldenHourEnd = formatTime(pos.goldenHourMorningEnd);
      } else if (nowMs < pos.goldenHourEveningStart.getTime()) {
        goldenHourStart = formatTime(pos.goldenHourEveningStart);
        goldenHourEnd = formatTime(pos.goldenHourEveningEnd);
      } else {
        // Next golden hour is tomorrow morning
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowPos = calculateSunPosition(coords.latitude, coords.longitude, tomorrow);
        goldenHourStart = formatTime(tomorrowPos.goldenHourMorningStart);
        goldenHourEnd = formatTime(tomorrowPos.goldenHourMorningEnd);
      }

      const advice = getSunAdvice(altitude, azimuth);
      const direction = getAzimuthDirection(azimuth);
      const dirAdvice = getDirectionAdvice(altitude, azimuth);

      setSunData({
        available: true,
        goldenHourStart,
        goldenHourEnd,
        blueHourStart,
        blueHourEnd,
        sunAltitude: altitude,
        sunAzimuth: azimuth,
        direction,
        advice: isGoldenHour ? `🌅 黄金时刻！${dirAdvice}` : `${advice} | 朝${direction}`,
      });
    } catch {
      setSunData(prev => ({ ...prev, advice: '太阳计算不可用', available: false }));
    }
  }, []);

  const requestLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setSunData(prev => ({ ...prev, available: false, advice: '定位权限被拒绝', error: 'permission_denied' }));
        setLocationPermissionGranted(false);
        return;
      }
      setLocationPermissionGranted(true);

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      locationRef.current = coords;
      await updateSunData(coords);
    } catch (e) {
      setSunData(prev => ({ ...prev, available: false, advice: '无法获取位置', error: 'location_error' }));
    }
  }, [updateSunData]);

  useEffect(() => {
    requestLocation();

    intervalRef.current = setInterval(async () => {
      if (locationRef.current) {
        // Refresh location occasionally, but reuse last known for updates
        try {
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
          locationRef.current = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
        } catch {
          // keep using last known
        }
        if (locationRef.current) {
          await updateSunData(locationRef.current);
        }
      }
    }, updateIntervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [requestLocation, updateSunData, updateIntervalMs]);

  return { sunData, requestLocation };
}
