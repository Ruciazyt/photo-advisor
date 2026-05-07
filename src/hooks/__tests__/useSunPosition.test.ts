/**
 * Unit tests for useSunPosition utility functions.
 * All tested functions are pure (no hooks, no side effects, no Expo dependencies).
 */
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

describe('getJulianDate', () => {
  it('returns a positive number for modern dates', () => {
    const now = new Date();
    const jd = getJulianDate(now);
    expect(jd).toBeGreaterThan(2450000);
  });

  it('is monotonically increasing with date', () => {
    const d1 = new Date('2024-01-01T00:00:00Z');
    const d2 = new Date('2024-07-01T00:00:00Z');
    const d3 = new Date('2025-01-01T00:00:00Z');
    expect(getJulianDate(d1)).toBeLessThan(getJulianDate(d2));
    expect(getJulianDate(d2)).toBeLessThan(getJulianDate(d3));
  });

  it('returns a number type', () => {
    const jd = getJulianDate(new Date());
    expect(typeof jd).toBe('number');
  });

  it('handles UTC noon', () => {
    const noon = new Date('2024-06-15T12:00:00Z');
    const jd = getJulianDate(noon);
    expect(typeof jd).toBe('number');
    expect(jd).toBeGreaterThan(0);
  });

  it('handles UTC midnight', () => {
    const midnight = new Date('2024-06-15T00:00:00Z');
    const jd = getJulianDate(midnight);
    expect(typeof jd).toBe('number');
    expect(jd).toBeGreaterThan(0);
  });

  it('JD for same calendar date differs by 0.5 for noon vs midnight', () => {
    const d1 = new Date('2024-06-15T00:00:00Z');
    const d2 = new Date('2024-06-15T12:00:00Z');
    const jd1 = getJulianDate(d1);
    const jd2 = getJulianDate(d2);
    expect(Math.abs((jd2 - jd1) - 0.5)).toBeLessThan(0.001);
  });
});

describe('jdToUnix', () => {
  it('converts JD 2440587.5 (Unix epoch) to ~0', () => {
    const unix = jdToUnix(2440587.5);
    expect(Math.abs(unix)).toBeLessThan(1);
  });

  it('produces increasing values for increasing JD', () => {
    const u1 = jdToUnix(2451545.0);
    const u2 = jdToUnix(2451546.0);
    expect(u2).toBeGreaterThan(u1);
    // 1 JD = 86400 seconds
    expect(u2 - u1).toBeCloseTo(86400, 0);
  });

  it('handles fractional JD correctly', () => {
    const u1 = jdToUnix(2440587.5);
    const u2 = jdToUnix(2440587.75); // 0.25 days later = 21600 seconds
    expect(u2 - u1).toBeCloseTo(21600, 0);
  });

  it('returns a number', () => {
    const unix = jdToUnix(2451545.0);
    expect(typeof unix).toBe('number');
  });

  it('JD 2451545.0 corresponds to UTC year 2000', () => {
    const unix = jdToUnix(2451545.0);
    const d = new Date(unix * 1000);
    expect(d.getUTCFullYear()).toBe(2000);
  });
});

describe('jdToDateTime', () => {
  it('returns a valid Date object', () => {
    const result = jdToDateTime(2451545.0);
    expect(result).toBeInstanceOf(Date);
    expect(isNaN(result.getTime())).toBe(false);
  });

  it('restored date is in UTC year 2024 for a 2024 input', () => {
    const original = new Date('2024-07-15T10:30:00Z');
    const jd = getJulianDate(original);
    const restored = jdToDateTime(jd);
    expect(restored.getUTCFullYear()).toBe(2024);
  });

  it('restored date month is in valid range 0-11', () => {
    const original = new Date('2024-07-15T10:30:00Z');
    const jd = getJulianDate(original);
    const restored = jdToDateTime(jd);
    expect(restored.getUTCMonth()).toBeGreaterThanOrEqual(0);
    expect(restored.getUTCMonth()).toBeLessThan(12);
  });

  it('two different dates produce different JD values', () => {
    const d1 = new Date('2024-01-01T00:00:00Z');
    const d2 = new Date('2024-06-15T12:00:00Z');
    expect(getJulianDate(d1)).not.toBe(getJulianDate(d2));
  });

  it('two restored dates from same JD are equal', () => {
    const jd = getJulianDate(new Date('2024-07-15T10:30:00Z'));
    const r1 = jdToDateTime(jd);
    const r2 = jdToDateTime(jd);
    expect(r1.getTime()).toBe(r2.getTime());
  });

  it('restored UTC hours are in 0-23 range', () => {
    const original = new Date('2024-07-15T10:30:00Z');
    const jd = getJulianDate(original);
    const restored = jdToDateTime(jd);
    expect(restored.getUTCHours()).toBeGreaterThanOrEqual(0);
    expect(restored.getUTCHours()).toBeLessThan(24);
  });
});

describe('addMinutes', () => {
  it('adds positive minutes', () => {
    const base = new Date('2024-06-15T10:00:00Z');
    const result = addMinutes(base, 30);
    expect(result.toISOString()).toBe('2024-06-15T10:30:00.000Z');
  });

  it('subtracts minutes with negative input', () => {
    const base = new Date('2024-06-15T10:00:00Z');
    const result = addMinutes(base, -45);
    expect(result.toISOString()).toBe('2024-06-15T09:15:00.000Z');
  });

  it('crosses midnight correctly', () => {
    const base = new Date('2024-06-15T23:30:00Z');
    const result = addMinutes(base, 60);
    expect(result.toISOString()).toBe('2024-06-16T00:30:00.000Z');
  });

  it('returns a Date instance', () => {
    const result = addMinutes(new Date(), 10);
    expect(result).toBeInstanceOf(Date);
  });

  it('adding 0 returns the same time', () => {
    const base = new Date('2024-06-15T10:00:00Z');
    const result = addMinutes(base, 0);
    expect(result.getTime()).toBe(base.getTime());
  });

  it('handles large positive values (1440 = 1 day)', () => {
    const base = new Date('2024-06-15T10:00:00Z');
    const result = addMinutes(base, 1440);
    expect(result.toISOString()).toBe('2024-06-16T10:00:00.000Z');
  });
});

describe('getLMST', () => {
  it('returns a value in the range [0, 24) for lng=0 at J2000', () => {
    const lmst = getLMST(2451545.0, 0);
    const normalized = ((lmst % 24) + 24) % 24;
    expect(normalized).toBeGreaterThanOrEqual(0);
    expect(normalized).toBeLessThan(24);
  });

  it('returns a value in the range [0, 24) for various longitudes', () => {
    const jd = 2451545.0;
    for (const lng of [-90, -45, 0, 45, 90, 135, 180]) {
      const lmst = getLMST(jd, lng);
      const normalized = ((lmst % 24) + 24) % 24;
      expect(normalized).toBeGreaterThanOrEqual(0);
      expect(normalized).toBeLessThan(24);
    }
  });

  it('LMST increases by 6 hours for 90 degrees of longitude (mod 24)', () => {
    const jd = 2451545.0;
    const lmst0 = getLMST(jd, 0);
    const lmst90 = getLMST(jd, 90);
    const diff = ((lmst90 - lmst0 + 24) % 24);
    expect(Math.abs(diff - 6)).toBeLessThan(0.1);
  });

  it('handles negative longitude', () => {
    const jd = 2451545.0;
    const lmst = getLMST(jd, -75);
    const normalized = ((lmst % 24) + 24) % 24;
    expect(normalized).toBeGreaterThanOrEqual(0);
    expect(normalized).toBeLessThan(24);
  });

  it('LMST changes by ~4 minutes for 1-day JD advance at fixed longitude', () => {
    const lng = 120;
    const lmst1 = getLMST(2451545.0, lng);
    const lmst2 = getLMST(2451546.0, lng);
    const diff = Math.abs(lmst2 - lmst1);
    // 1 sidereal day = 23h56m = ~0.066 sidereal hours per solar day
    expect(diff).toBeLessThan(1);
    expect(diff).toBeGreaterThan(0.01);
  });
});

describe('formatTime', () => {
  it('returns a string of length 5', () => {
    const d = new Date();
    const result = formatTime(d);
    expect(typeof result).toBe('string');
    expect(result).toHaveLength(5);
  });

  it('contains a colon separator', () => {
    expect(formatTime(new Date())).toContain(':');
  });

  it('HH and MM parts are each 2 digits', () => {
    const result = formatTime(new Date());
    const [h, m] = result.split(':');
    expect(h).toHaveLength(2);
    expect(m).toHaveLength(2);
  });

  it('different times produce different format outputs', () => {
    const morning = new Date('2024-06-15T06:00:00Z');
    const evening = new Date('2024-06-15T18:00:00Z');
    expect(formatTime(morning)).not.toBe(formatTime(evening));
  });

  it('consistent input produces consistent output', () => {
    const d = new Date('2024-06-15T12:00:00Z');
    const r1 = formatTime(d);
    const r2 = formatTime(d);
    expect(r1).toBe(r2);
  });
});

describe('getAzimuthDirection', () => {
  it('returns "北" for 0 degrees', () => {
    expect(getAzimuthDirection(0)).toBe('北');
  });

  it('returns "东" for 90 degrees', () => {
    expect(getAzimuthDirection(90)).toBe('东');
  });

  it('returns "南" for 180 degrees', () => {
    expect(getAzimuthDirection(180)).toBe('南');
  });

  it('returns "西" for 270 degrees', () => {
    expect(getAzimuthDirection(270)).toBe('西');
  });

  it('returns "东北" for 45 degrees', () => {
    expect(getAzimuthDirection(45)).toBe('东北');
  });

  it('returns "东南" for 135 degrees', () => {
    expect(getAzimuthDirection(135)).toBe('东南');
  });

  it('returns "西南" for 225 degrees', () => {
    expect(getAzimuthDirection(225)).toBe('西南');
  });

  it('returns "西北" for 315 degrees', () => {
    expect(getAzimuthDirection(315)).toBe('西北');
  });

  it('360 degrees wraps to north', () => {
    expect(getAzimuthDirection(360)).toBe('北');
  });

  it('405 degrees (360+45) returns northeast', () => {
    expect(getAzimuthDirection(405)).toBe('东北');
  });

  it('all returned values are in the 8-direction set', () => {
    const validDirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
    const angles = [0, 45, 90, 135, 180, 225, 270, 315, 360, 405];
    angles.forEach((a) => {
      expect(validDirs).toContain(getAzimuthDirection(a));
    });
  });
});

describe('getSunAdvice', () => {
  it('returns night advice for altitude < -6', () => {
    expect(getSunAdvice(-10, 180)).toBe('太阳低于地平线，夜间拍摄');
  });

  it('returns blue hour advice for altitude between -6 and -4', () => {
    expect(getSunAdvice(-5, 180)).toBe('蓝调时刻，光线柔和');
  });

  it('returns golden hour warm light advice for altitude between -4 and 0', () => {
    expect(getSunAdvice(-2, 180)).toBe('黄金时刻，暖色光线');
  });

  it('returns golden hour backlight advice for altitude between 0 and 6', () => {
    expect(getSunAdvice(3, 180)).toBe('黄金时刻，逆光/侧光佳');
  });

  it('returns soft side-light advice for altitude 6-20', () => {
    expect(getSunAdvice(15, 180)).toBe('太阳较低，侧光柔和');
  });

  it('returns high-sun advice for altitude 20-50', () => {
    expect(getSunAdvice(35, 180)).toBe('阳光充足，注意光影');
  });

  it('returns top-light advice for altitude >= 50', () => {
    expect(getSunAdvice(70, 180)).toBe('顶光较强，建议补光');
  });

  it('altitude below -18 always returns night advice', () => {
    expect(getSunAdvice(-20, 0)).toBe('太阳低于地平线，夜间拍摄');
    expect(getSunAdvice(-50, 180)).toBe('太阳低于地平线，夜间拍摄');
  });

  it('boundary values: -6, -4, 0, 6, 20, 50', () => {
    expect(getSunAdvice(-6, 180)).toBe('蓝调时刻，光线柔和');
    expect(getSunAdvice(-4, 180)).toBe('黄金时刻，暖色光线');
    expect(getSunAdvice(0, 180)).toBe('黄金时刻，逆光/侧光佳');
    expect(getSunAdvice(6, 180)).toBe('太阳较低，侧光柔和');
    expect(getSunAdvice(20, 180)).toBe('阳光充足，注意光影');
    expect(getSunAdvice(50, 180)).toBe('顶光较强，建议补光');
  });
});

describe('getDirectionAdvice', () => {
  it('returns silhouette advice for negative altitude', () => {
    expect(getDirectionAdvice(-5, 180)).toBe('拍剪影或长曝光');
  });

  it('returns backlight silhouette advice for north at low altitude', () => {
    expect(getDirectionAdvice(5, 0)).toBe('可拍逆光剪影');
    expect(getDirectionAdvice(5, 350)).toBe('可拍逆光剪影');
  });

  it('returns side light portrait advice for east at low altitude', () => {
    expect(getDirectionAdvice(5, 90)).toBe('侧光人像');
  });

  it('returns side light portrait advice for west at low altitude', () => {
    expect(getDirectionAdvice(5, 270)).toBe('侧光人像');
  });

  it('returns front/sunlight advice for south at low altitude', () => {
    expect(getDirectionAdvice(5, 180)).toBe('顺光拍摄');
  });

  it('returns side light advice for medium altitude 10-30', () => {
    expect(getDirectionAdvice(20, 90)).toBe('侧光人像/风光');
  });

  it('returns harsh light advice for high altitude', () => {
    expect(getDirectionAdvice(60, 180)).toBe('顶光场景，注意补光');
  });

  it('negative altitude: same advice regardless of azimuth', () => {
    expect(getDirectionAdvice(-10, 0)).toBe(getDirectionAdvice(-10, 180));
    expect(getDirectionAdvice(-10, 90)).toBe(getDirectionAdvice(-10, 270));
  });
});

describe('calculateSunPosition', () => {
  it('returns an object with all expected keys', () => {
    const result = calculateSunPosition(39.9, 116.4, new Date('2024-06-15T12:00:00Z'));
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

  it('altitude is in range [-90, 90]', () => {
    const result = calculateSunPosition(39.9, 116.4, new Date('2024-06-15T12:00:00Z'));
    expect(result.altitude).toBeGreaterThanOrEqual(-90);
    expect(result.altitude).toBeLessThanOrEqual(90);
  });

  it('azimuth is in range [0, 360)', () => {
    const result = calculateSunPosition(39.9, 116.4, new Date('2024-06-15T12:00:00Z'));
    expect(result.azimuth).toBeGreaterThanOrEqual(0);
    expect(result.azimuth).toBeLessThan(360);
  });

  it('golden hour times are valid Date objects', () => {
    const result = calculateSunPosition(39.9, 116.4, new Date('2024-06-15T12:00:00Z'));
    expect(result.goldenHourMorningStart).toBeInstanceOf(Date);
    expect(result.goldenHourMorningEnd).toBeInstanceOf(Date);
    expect(result.goldenHourEveningStart).toBeInstanceOf(Date);
    expect(result.goldenHourEveningEnd).toBeInstanceOf(Date);
  });

  it('blue hour times are valid Date objects', () => {
    const result = calculateSunPosition(39.9, 116.4, new Date('2024-06-15T12:00:00Z'));
    expect(result.blueHourMorningStart).toBeInstanceOf(Date);
    expect(result.blueHourMorningEnd).toBeInstanceOf(Date);
    expect(result.blueHourEveningStart).toBeInstanceOf(Date);
    expect(result.blueHourEveningEnd).toBeInstanceOf(Date);
  });

  it('morning golden hour end is after its start', () => {
    const result = calculateSunPosition(39.9, 116.4, new Date('2024-06-15T12:00:00Z'));
    expect(result.goldenHourMorningEnd.getTime()).toBeGreaterThan(result.goldenHourMorningStart.getTime());
  });

  it('morning blue hour end is after its start', () => {
    const result = calculateSunPosition(39.9, 116.4, new Date('2024-06-15T12:00:00Z'));
    expect(result.blueHourMorningEnd.getTime()).toBeGreaterThan(result.blueHourMorningStart.getTime());
  });

  it('works for southern hemisphere location', () => {
    const result = calculateSunPosition(-33.9, 151.2, new Date('2024-06-15T12:00:00Z'));
    expect(result.altitude).toBeLessThanOrEqual(90);
    expect(result.azimuth).toBeLessThan(360);
  });

  it('altitude is negative at midnight in winter', () => {
    const result = calculateSunPosition(39.9, 116.4, new Date('2024-01-15T00:00:00Z'));
    expect(result.altitude).toBeLessThan(0);
  });

  it('altitude is positive at noon in summer', () => {
    const result = calculateSunPosition(39.9, 116.4, new Date('2024-06-15T12:00:00Z'));
    expect(result.altitude).toBeGreaterThan(0);
  });

  it('altitude is in valid range for equatorial location', () => {
    const result = calculateSunPosition(0, 0, new Date('2024-06-15T12:00:00Z'));
    expect(result.altitude).toBeGreaterThanOrEqual(-90);
    expect(result.altitude).toBeLessThanOrEqual(90);
    expect(result.azimuth).toBeGreaterThanOrEqual(0);
    expect(result.azimuth).toBeLessThan(360);
  });

  it('altitude is in valid range for arctic location in summer', () => {
    const result = calculateSunPosition(70, 0, new Date('2024-06-15T12:00:00Z'));
    expect(result.altitude).toBeDefined();
    expect(result.altitude).toBeLessThanOrEqual(90);
  });

  it('different times of day produce different azimuths', () => {
    const loc = { lat: 39.9, lng: 116.4 };
    const morning = calculateSunPosition(loc.lat, loc.lng, new Date('2024-06-15T06:00:00Z'));
    const noon = calculateSunPosition(loc.lat, loc.lng, new Date('2024-06-15T12:00:00Z'));
    const evening = calculateSunPosition(loc.lat, loc.lng, new Date('2024-06-15T18:00:00Z'));
    expect(morning.azimuth).toBeLessThan(180);
    expect(evening.azimuth).toBeGreaterThan(180);
    expect(noon.azimuth).toBeLessThan(360);
  });
});