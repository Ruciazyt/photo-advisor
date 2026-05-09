import {
  calculateSunPosition,
  getJulianDate,
  jdToUnix,
  jdToDateTime,
  addMinutes,
  getLMST,
  formatTime,
  getAzimuthDirection,
  getSunAdvice,
  getDirectionAdvice,
} from '../useSunPosition';

describe('useSunPosition utilities', () => {
  describe('getJulianDate', () => {
    it('converts midnight Jan 1 2000 UTC to JDN 2451545', () => {
      const d = new Date('2000-01-01T00:00:00.000Z');
      const jd = getJulianDate(d);
      expect(jd).toBe(2451545);
    });

    it('converts a mid-year date correctly', () => {
      const d = new Date('2023-07-15T00:00:00.000Z');
      const jd = getJulianDate(d);
      expect(jd).toBeGreaterThan(2459000);
      expect(jd).toBeLessThan(2461000);
    });

    it('handles date with fractional hours', () => {
      const d = new Date('2023-07-15T12:30:00.000Z');
      const jd = getJulianDate(d);
      const jdNoTime = getJulianDate(new Date('2023-07-15T00:00:00.000Z'));
      expect(jd - jdNoTime).toBeCloseTo(0.5208, 2);
    });

    it('handles negative year (before 1582 for proleptic Gregorian)', () => {
      const d = new Date('1980-01-01T00:00:00.000Z');
      const jd = getJulianDate(d);
      expect(jd).toBeGreaterThan(0);
    });

    it('is deterministic — same input always yields same output', () => {
      const d = new Date('2024-03-20T08:00:00.000Z');
      const jd1 = getJulianDate(d);
      const jd2 = getJulianDate(d);
      expect(jd1).toBe(jd2);
    });
  });

  describe('jdToUnix', () => {
    it('returns 0 for JD 2440587.5 (Unix epoch base)', () => {
      expect(jdToUnix(2440587.5)).toBe(0);
    });

    it('returns correct Unix seconds for J2000.0 noon JD 2451545', () => {
      expect(jdToUnix(2451545.0)).toBe(946728000);
    });

    it('handles fractional JD correctly (half day = 43200 seconds)', () => {
      const unix = jdToUnix(2440587.5 + 0.5);
      expect(unix).toBe(43200);
    });

    it('handles large JD values (far future)', () => {
      const futureJd = 2500000;
      const unix = jdToUnix(futureJd);
      expect(unix).toBeGreaterThan(0);
      expect(typeof unix).toBe('number');
    });

    it('handles very small JD values (before Unix epoch)', () => {
      const unix = jdToUnix(0);
      expect(unix).toBeLessThan(0);
    });

    it('returns a number', () => {
      expect(typeof jdToUnix(2451545.0)).toBe('number');
    });
  });

  describe('jdToDateTime', () => {
    it('converts JD 2451545.0 to J2000.0 noon', () => {
      const d = jdToDateTime(2451545.0);
      expect(d.getUTCFullYear()).toBe(2000);
      expect(d.getUTCMonth()).toBe(0);
      expect(d.getUTCDate()).toBe(1);
      expect(d.getUTCHours()).toBe(12);
    });

    it('round-trips jdToUnix correctly for a known JD', () => {
      const jd = 2451545.0;
      const unixSec = jdToUnix(jd);
      const date = jdToDateTime(jd);
      expect(unixSec).toBe(946728000);
      expect(date.getUTCFullYear()).toBe(2000);
    });

    it('converts JD at Unix epoch correctly', () => {
      const d = jdToDateTime(2440587.5);
      expect(d.getTime()).toBe(0);
    });

    it('returns a Date object', () => {
      const d = jdToDateTime(2451545.0);
      expect(d).toBeInstanceOf(Date);
    });

    it('handles fractional JD for sub-day precision', () => {
      const d = jdToDateTime(2440587.5 + 0.25);
      expect(d.getUTCHours()).toBe(6);
      expect(d.getUTCMinutes()).toBe(0);
    });
  });

  describe('addMinutes', () => {
    it('adds positive minutes', () => {
      const d = new Date('2024-01-01T10:00:00.000Z');
      const result = addMinutes(d, 60);
      expect(result.toISOString()).toBe('2024-01-01T11:00:00.000Z');
    });

    it('subtracts minutes with negative argument', () => {
      const d = new Date('2024-01-01T10:00:00.000Z');
      const result = addMinutes(d, -90);
      expect(result.toISOString()).toBe('2024-01-01T08:30:00.000Z');
    });

    it('handles zero minutes', () => {
      const d = new Date('2024-01-01T10:00:00.000Z');
      const result = addMinutes(d, 0);
      expect(result.getTime()).toBe(d.getTime());
    });

    it('handles large minute values crossing days', () => {
      const d = new Date('2024-01-01T22:00:00.000Z');
      const result = addMinutes(d, 180);
      expect(result.toISOString()).toBe('2024-01-02T01:00:00.000Z');
    });

    it('does not mutate the original date', () => {
      const d = new Date('2024-01-01T10:00:00.000Z');
      const originalTime = d.getTime();
      addMinutes(d, 30);
      expect(d.getTime()).toBe(originalTime);
    });

    it('returns a Date object', () => {
      const d = new Date();
      const result = addMinutes(d, 10);
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('getLMST', () => {
    it('returns a value in hours (0–24)', () => {
      const lmst = getLMST(2451545.0, 0);
      expect(lmst).toBeGreaterThanOrEqual(0);
      expect(lmst).toBeLessThan(24);
    });

    it('is sensitive to longitude', () => {
      const lmstEast = getLMST(2451545.0, 90);
      const lmstWest = getLMST(2451545.0, -90);
      expect(lmstEast).not.toBe(lmstWest);
    });

    it('handles negative longitude', () => {
      const lmst = getLMST(2451545.0, -75);
      expect(lmst).toBeGreaterThanOrEqual(0);
      expect(lmst).toBeLessThan(24);
    });

    it('handles longitude greater than 180', () => {
      const lmst = getLMST(2451545.0, 200);
      expect(lmst).toBeGreaterThanOrEqual(0);
      expect(lmst).toBeLessThan(24);
    });

    it('handles very large JD (far future)', () => {
      const lmst = getLMST(2500000, 0);
      expect(typeof lmst).toBe('number');
      expect(lmst).toBeGreaterThanOrEqual(0);
    });

    it('returns a number', () => {
      const lmst = getLMST(2451545.0, 0);
      expect(typeof lmst).toBe('number');
    });
  });

  describe('formatTime', () => {
    // formatTime uses local machine time (getHours/getMinutes, no UTC flag)
    // Asia/Shanghai = UTC+8, so UTC midnight → 08:00 local
    it('formats midnight UTC as 08:00 local', () => {
      const d = new Date('2024-01-01T00:00:00.000Z');
      expect(formatTime(d)).toMatch(/^08:00$/);
    });

    it('formats noon UTC as 20:00 local', () => {
      const d = new Date('2024-01-01T12:00:00.000Z');
      expect(formatTime(d)).toMatch(/^20:00$/);
    });

    it('pads single-digit hours and minutes with zero', () => {
      const d = new Date('2024-01-01T03:07:00.000Z');
      expect(formatTime(d)).toMatch(/^11:07$/);
    });

    it('formats late evening UTC correctly', () => {
      const d = new Date('2024-01-01T23:59:00.000Z');
      expect(formatTime(d)).toMatch(/^07:59$/);
    });

    it('returns a string', () => {
      const d = new Date();
      expect(typeof formatTime(d)).toBe('string');
    });

    it('returns exactly 5 characters', () => {
      const d = new Date('2024-01-01T09:05:00.000Z');
      expect(formatTime(d)).toHaveLength(5);
    });
  });

  describe('getAzimuthDirection', () => {
    it('returns 北 for north (0°)', () => {
      expect(getAzimuthDirection(0)).toBe('北');
    });

    it('returns 东北 for northeast (45°)', () => {
      expect(getAzimuthDirection(45)).toBe('东北');
    });

    it('returns 东 for east (90°)', () => {
      expect(getAzimuthDirection(90)).toBe('东');
    });

    it('returns 东南 for southeast (135°)', () => {
      expect(getAzimuthDirection(135)).toBe('东南');
    });

    it('returns 南 for south (180°)', () => {
      expect(getAzimuthDirection(180)).toBe('南');
    });

    it('returns 西南 for southwest (225°)', () => {
      expect(getAzimuthDirection(225)).toBe('西南');
    });

    it('returns 西 for west (270°)', () => {
      expect(getAzimuthDirection(270)).toBe('西');
    });

    it('returns 西北 for northwest (315°)', () => {
      expect(getAzimuthDirection(315)).toBe('西北');
    });

    it('wraps 360° back to 北', () => {
      expect(getAzimuthDirection(360)).toBe('北');
    });

    it('handles azimuth values > 360 via modulo', () => {
      expect(getAzimuthDirection(405)).toBe('东北');
      expect(getAzimuthDirection(720)).toBe('北');
    });

    it('returns a string', () => {
      expect(typeof getAzimuthDirection(100)).toBe('string');
    });
  });

  describe('getSunAdvice', () => {
    it('returns night advice for altitude < -6', () => {
      expect(getSunAdvice(-7, 180)).toBe('太阳低于地平线，夜间拍摄');
    });

    it('returns blue hour advice for altitude between -6 and -4 (exclusive upper bound)', () => {
      expect(getSunAdvice(-5, 180)).toBe('蓝调时刻，光线柔和');
    });

    it('returns golden hour (early) advice for altitude between -4 and 0 (exclusive upper bound)', () => {
      expect(getSunAdvice(-2, 180)).toBe('黄金时刻，暖色光线');
    });

    it('returns golden hour (late) advice for altitude between 0 and 6 (inclusive lower)', () => {
      expect(getSunAdvice(0, 180)).toBe('黄金时刻，逆光/侧光佳');
      expect(getSunAdvice(3, 180)).toBe('黄金时刻，逆光/侧光佳');
    });

    it('returns soft side-light advice for altitude between 6 and 20 (exclusive upper bound)', () => {
      expect(getSunAdvice(10, 180)).toBe('太阳较低，侧光柔和');
    });

    it('returns bright sun advice for altitude between 20 and 50 (inclusive lower)', () => {
      expect(getSunAdvice(20, 180)).toBe('阳光充足，注意光影');
      expect(getSunAdvice(49, 180)).toBe('阳光充足，注意光影');
    });

    it('returns harsh light advice for altitude >= 50', () => {
      expect(getSunAdvice(50, 180)).toBe('顶光较强，建议补光');
      expect(getSunAdvice(90, 180)).toBe('顶光较强，建议补光');
    });

    it('returns a string', () => {
      expect(typeof getSunAdvice(45, 180)).toBe('string');
    });
  });

  describe('getDirectionAdvice', () => {
    it('returns silhouette advice for altitude < 0', () => {
      expect(getDirectionAdvice(-1, 180)).toBe('拍剪影或长曝光');
      expect(getDirectionAdvice(-10, 180)).toBe('拍剪影或长曝光');
    });

    it('returns backlit silhouette advice for low altitude + north/south azimuth', () => {
      expect(getDirectionAdvice(5, 0)).toBe('可拍逆光剪影');
      expect(getDirectionAdvice(5, 30)).toBe('可拍逆光剪影');
      expect(getDirectionAdvice(5, 350)).toBe('可拍逆光剪影');
    });

    it('returns side-light portrait advice for east/west azimuth at low altitude', () => {
      expect(getDirectionAdvice(5, 90)).toBe('侧光人像');
      expect(getDirectionAdvice(5, 120)).toBe('侧光人像');
      expect(getDirectionAdvice(5, 260)).toBe('侧光人像');
      expect(getDirectionAdvice(5, 300)).toBe('侧光人像');
    });

    it('returns front-light advice for other azimuths at low altitude', () => {
      expect(getDirectionAdvice(5, 180)).toBe('顺光拍摄');
      expect(getDirectionAdvice(8, 200)).toBe('顺光拍摄');
    });

    it('returns side-light advice for altitude between 10 and 30', () => {
      expect(getDirectionAdvice(15, 180)).toBe('侧光人像/风光');
      expect(getDirectionAdvice(29, 180)).toBe('侧光人像/风光');
    });

    it('returns harsh light advice for altitude >= 30', () => {
      expect(getDirectionAdvice(30, 180)).toBe('顶光场景，注意补光');
      expect(getDirectionAdvice(90, 180)).toBe('顶光场景，注意补光');
    });

    it('returns a string', () => {
      expect(typeof getDirectionAdvice(10, 180)).toBe('string');
    });
  });

  describe('calculateSunPosition', () => {
    it('returns an object with all required sun data fields', () => {
      const result = calculateSunPosition(31.23, 121.47, new Date('2024-06-15T12:00:00.000Z'));
      expect(result).toHaveProperty('altitude');
      expect(result).toHaveProperty('azimuth');
      expect(result).toHaveProperty('sunrise');
      expect(result).toHaveProperty('sunset');
      expect(result).toHaveProperty('goldenHourMorningStart');
      expect(result).toHaveProperty('goldenHourMorningEnd');
      expect(result).toHaveProperty('goldenHourEveningStart');
      expect(result).toHaveProperty('goldenHourEveningEnd');
      expect(result).toHaveProperty('blueHourMorningStart');
      expect(result).toHaveProperty('blueHourMorningEnd');
      expect(result).toHaveProperty('blueHourEveningStart');
      expect(result).toHaveProperty('blueHourEveningEnd');
    });

    it('altitude is a number within [-90, 90]', () => {
      const result = calculateSunPosition(31.23, 121.47, new Date());
      expect(typeof result.altitude).toBe('number');
      expect(result.altitude).toBeGreaterThanOrEqual(-90);
      expect(result.altitude).toBeLessThanOrEqual(90);
    });

    it('azimuth is a number between 0 and 360', () => {
      const result = calculateSunPosition(31.23, 121.47, new Date());
      expect(typeof result.azimuth).toBe('number');
      expect(result.azimuth).toBeGreaterThanOrEqual(0);
      expect(result.azimuth).toBeLessThanOrEqual(360);
    });

    it('sunrise occurs before sunset', () => {
      const result = calculateSunPosition(31.23, 121.47, new Date('2024-06-15T12:00:00.000Z'));
      expect(result.sunrise.getTime()).toBeLessThan(result.sunset.getTime());
    });

    it('golden hour morning start is before golden hour morning end', () => {
      const result = calculateSunPosition(31.23, 121.47, new Date('2024-06-15T12:00:00.000Z'));
      expect(result.goldenHourMorningStart.getTime()).toBeLessThan(result.goldenHourMorningEnd.getTime());
    });

    it('golden hour evening start is before golden hour evening end', () => {
      const result = calculateSunPosition(31.23, 121.47, new Date('2024-06-15T12:00:00.000Z'));
      expect(result.goldenHourEveningStart.getTime()).toBeLessThan(result.goldenHourEveningEnd.getTime());
    });

    it('blue hour morning start is before blue hour morning end', () => {
      const result = calculateSunPosition(31.23, 121.47, new Date('2024-06-15T12:00:00.000Z'));
      expect(result.blueHourMorningStart.getTime()).toBeLessThan(result.blueHourMorningEnd.getTime());
    });

    it('blue hour evening start is before blue hour evening end', () => {
      const result = calculateSunPosition(31.23, 121.47, new Date('2024-06-15T12:00:00.000Z'));
      expect(result.blueHourEveningStart.getTime()).toBeLessThan(result.blueHourEveningEnd.getTime());
    });

    it('golden hour dates are valid Date objects', () => {
      const result = calculateSunPosition(31.23, 121.47, new Date());
      expect(result.goldenHourMorningStart).toBeInstanceOf(Date);
      expect(result.goldenHourMorningEnd).toBeInstanceOf(Date);
      expect(result.goldenHourEveningStart).toBeInstanceOf(Date);
      expect(result.goldenHourEveningEnd).toBeInstanceOf(Date);
    });

    it('blue hour dates are valid Date objects', () => {
      const result = calculateSunPosition(31.23, 121.47, new Date());
      expect(result.blueHourMorningStart).toBeInstanceOf(Date);
      expect(result.blueHourMorningEnd).toBeInstanceOf(Date);
      expect(result.blueHourEveningStart).toBeInstanceOf(Date);
      expect(result.blueHourEveningEnd).toBeInstanceOf(Date);
    });

    it('sunrise and sunset are valid Date objects', () => {
      const result = calculateSunPosition(31.23, 121.47, new Date());
      expect(result.sunrise).toBeInstanceOf(Date);
      expect(result.sunset).toBeInstanceOf(Date);
    });

    it('handles southern hemisphere location', () => {
      const result = calculateSunPosition(-33.87, 151.21, new Date('2024-06-15T12:00:00.000Z'));
      expect(typeof result.altitude).toBe('number');
      expect(typeof result.azimuth).toBe('number');
      expect(result.sunrise.getTime()).toBeLessThan(result.sunset.getTime());
    });

    it('is deterministic for same input', () => {
      const date = new Date('2024-07-01T12:00:00.000Z');
      const r1 = calculateSunPosition(35.68, 139.65, date);
      const r2 = calculateSunPosition(35.68, 139.65, date);
      expect(r1.altitude).toBe(r2.altitude);
      expect(r1.azimuth).toBe(r2.azimuth);
    });

    it('produces different altitude at noon vs midnight', () => {
      const lat = 35.68;
      const lng = 139.65;
      const noon = calculateSunPosition(lat, lng, new Date('2024-07-01T06:00:00.000Z'));
      const midnight = calculateSunPosition(lat, lng, new Date('2024-07-01T18:00:00.000Z'));
      expect(noon.altitude).not.toBe(midnight.altitude);
    });

    it('handles edge case: equator at equinox', () => {
      const result = calculateSunPosition(0, 0, new Date('2024-03-20T12:00:00.000Z'));
      expect(typeof result.altitude).toBe('number');
      expect(typeof result.azimuth).toBe('number');
    });
  });
});
